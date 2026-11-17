"""World Wikidata ingester: parsing, classification and dating on synthetic rows. No network."""

import json

import pytest

from ai_archaeology.world import wikidata_world as wd
from ai_archaeology.world.records import WorldSite
from ai_archaeology.world.sparql_client import QueryTimeout, SparqlClient, _parse

ENTITY = "http://www.wikidata.org/entity/"
CLASSES = wd.ClassSets(megalithic=frozenset({"Q1935728"}), sitelinked=frozenset({"Q839954"}))
CLASS_LABELS = {"Q1935728": "stone circle", "Q839954": "archaeological site", "Q9259": "UNESCO World Heritage Site", "Q1": "Q1"}


def node(value, **extra):
    return {"value": value, **extra}


def item_row(qid, **fields):
    return {"item": node(ENTITY + qid), **fields}


def stone_circle_rows():
    return [
        item_row("Q5", type=node(ENTITY + "Q1935728")),
        item_row("Q5", type=node(ENTITY + "Q839954")),
        item_row("Q5", type=node(ENTITY + "Q1")),
        item_row("Q5", label=node("Cercle de pierres", **{"xml:lang": "fr"})),
        item_row("Q5", label=node("Ring of Stones", **{"xml:lang": "en"})),
        item_row("Q5", heritage=node(ENTITY + "Q9259")),
        item_row("Q5", whs=node("373")),
        item_row("Q5", pleiades=node("12345")),
        item_row("Q5", image=node("http://commons.wikimedia.org/wiki/Special:FilePath/Ring.jpg")),
        item_row("Q5", inception=node("-2999-01-01T00:00:00Z"), inceptionPrecision=node("9")),
        item_row("Q5", period=node(ENTITY + "Q7"), periodStart=node("-4000-01-01T00:00:00Z"), periodStartPrecision=node("6"),
                 periodEnd=node("-1500-01-01T00:00:00Z"), periodEndPrecision=node("7")),
        item_row("Q5", article=node("https://de.wikipedia.org/wiki/Steinkreis")),
        item_row("Q5", article=node("https://en.wikipedia.org/wiki/Ring_of_Stones")),
    ]


def test_first_earth_coordinate_wins_and_other_globes_are_skipped():
    rows = [
        item_row("Q5", coord=node("Point(-1.8262 51.1789)"), links=node("143")),
        item_row("Q5", coord=node("Point(10 10)"), links=node("143")),
        item_row("Q6", coord=node("<http://www.wikidata.org/entity/Q405> Point(23.4 0.7)"), links=node("9")),
        item_row("Q8", coord=node("<http://www.wikidata.org/entity/Q405> Point(1 1)"), links=node("2")),
        item_row("Q8", coord=node("Point(2 3)"), links=node("2")),
    ]
    assert wd.first_locations(rows) == {"Q5": (-1.8262, 51.1789, 143), "Q8": (2.0, 3.0, 2)}


def test_rows_build_a_contract_record():
    details = wd.group_details(stone_circle_rows())["Q5"]
    site = wd.build_site("Q5", (-1.8262, 51.1789, 143), details, CLASS_LABELS)
    assert isinstance(site, WorldSite)
    assert (site.name, site.siteType, site.types) == ("Ring of Stones", "megalith", ["archaeological site", "stone circle"])
    assert (site.startYear, site.endYear, site.datingSource) == (-3000, -1500, "wikidata")
    assert site.ids == {"wikidata": "Q5", "pleiades": "12345", "osm": None, "whs": "373", "xronos": None}
    assert site.wikipedia == "https://en.wikipedia.org/wiki/Ring_of_Stones"
    assert site.image == "https://commons.wikimedia.org/wiki/Special:FilePath/Ring.jpg"
    assert (site.heritage, site.importance, site.source, site.licence) == (["UNESCO World Heritage Site"], 143, "wikidata", "CC0")
    json.dumps(site.__dict__)


@pytest.mark.parametrize("labels, expected", [
    (["archaeological site", "tumulus", "megalithic tomb"], "megalith"),
    (["settlement site", "stone circle"], "megalith"),
    (["cave with prehistoric art", "archaeological site"], "rock-art"),
    (["tell", "Neolithic settlement"], "tell"),
    (["bowl barrow"], "tumulus"),
    (["rock-cut tomb"], "necropolis"),
    (["necropolis", "ancient city"], "necropolis"),
    (["hillfort"], "enclosure"),
    (["ancient city", "Roman temple"], "city"),
    (["Roman villa"], "settlement"),
    (["Egyptian pyramids"], "monumental"),
    (["hill figure"], "geoglyph"),
    (["Roman temple"], "ritual"),
    (["archaeological site"], "other"),
    ([], "other"),
])
def test_site_type_rules_are_ordered(labels, expected):
    assert wd.classify_site_type(labels) == expected


def test_dating_prefers_inception_then_period_then_none():
    stated = wd.ItemDetails(inceptions={-2500, -2600}, dissolutions={-2700, 400}, period_starts={-9000})
    assert wd.resolve_dating(stated, "other") == (-2600, 400, "wikidata")
    by_period = wd.ItemDetails(period_starts={-3300, -1200}, period_ends={-1200, -500})
    assert wd.resolve_dating(by_period, "tell") == (-3300, -500, "wikidata")
    assert wd.resolve_dating(wd.ItemDetails(), "tell") == (None, None, "none")


def test_registration_year_is_not_a_megalith_build_date():
    registered = wd.ItemDetails(inceptions={1972})
    assert wd.resolve_dating(registered, "megalith") == (None, None, "none")
    assert wd.resolve_dating(registered, "other") == (1972, None, "wikidata")


def test_statement_date_beats_the_period_items_span():
    row = item_row("Q5", statedStart=node("-0799-01-01T00:00:00Z"), statedStartPrecision=node("9"),
                   periodStart=node("-1200-01-01T00:00:00Z"), periodStartPrecision=node("7"),
                   periodEnd=node("-0500-01-01T00:00:00Z"), periodEndPrecision=node("7"))
    details = wd.group_details([row])["Q5"]
    assert (details.period_starts, details.period_ends) == ({-800}, {-500})


@pytest.mark.parametrize("value,precision,year", [
    ("-0043-03-15T00:00:00Z", "11", -44),  # a day in 44 BCE
    ("-2999-01-01T00:00:00Z", "9", -3000),  # year precision: one too high in the query service
    ("-3000-01-01T00:00:00Z", "6", -3000),  # a millennium keeps the year entered
    ("-0500-01-01T00:00:00Z", "7", -500),
    ("-0200-01-01T00:00:00Z", "8", -200),
    ("0000-01-01T00:00:00Z", "9", -1),  # there is no year 0
    ("1972-01-01T00:00:00Z", "9", 1972),
    ("-2999-01-01T00:00:00Z", None, -3000),
])
def test_bce_years_are_corrected_once_and_only_at_year_precision(value, precision, year):
    assert wd.historical_year(node(value), node(precision) if precision else None) == year
    row = item_row("Q5", inception=node(value), **({"inceptionPrecision": node(precision)} if precision else {}))
    assert wd.group_details([row])["Q5"].inceptions == {year}


def test_details_query_asks_for_the_precision_of_every_date():
    query = wd.details_query(["Q1"])
    for name in ("inception", "dissolved", "statedStart", "statedEnd", "periodStart", "periodEnd"):
        assert f"wikibase:timeValue ?{name} ; wikibase:timePrecision ?{name}Precision" in query


def test_scope_rules():
    megalith = wd.ItemDetails(labels={"sv": "Domarring"}, types={"Q1935728"})
    assert wd.rejection_reason(megalith, ["stone circle"], CLASSES, False) is None
    stub = wd.ItemDetails(labels={"en": "Field 7"}, types={"Q839954"})
    assert wd.rejection_reason(stub, ["archaeological site"], CLASSES, False) == "no-wikipedia-article"
    stub.articles.add("https://sv.wikipedia.org/wiki/F7")
    assert wd.rejection_reason(stub, ["archaeological site"], CLASSES, False) is None
    assert wd.pick_wikipedia(stub.articles) == "https://sv.wikipedia.org/wiki/F7"
    outsider = wd.ItemDetails(labels={"en": "Somewhere"}, types={"Q99"})
    assert wd.rejection_reason(outsider, [], CLASSES, True) is None
    assert wd.rejection_reason(wd.ItemDetails(types={"Q1935728"}), ["stone circle"], CLASSES, False) == "unnamed"


def test_modern_look_alikes_are_dropped_unless_also_a_recorded_site():
    glass = wd.ItemDetails(labels={"en": "Glass Pyramid"}, types={"Q1935728"}, inceptions={1989})
    assert wd.rejection_reason(glass, ["pyramid"], CLASSES, False) == "modern"
    museum = wd.ItemDetails(labels={"en": "Stone Museum"}, types={"Q1935728"})
    assert wd.rejection_reason(museum, ["stone circle", "museum"], CLASSES, False) == "modern"
    museum.types.add("Q839954")
    assert wd.rejection_reason(museum, ["stone circle", "museum"], CLASSES, False) is None


def test_queries_name_every_requested_id():
    assert "wd:Q1 wd:Q2" in wd.details_query(["Q1", "Q2"])
    assert "FILTER(?links > 0)" in wd.items_query(["Q1"], True)
    assert "FILTER" not in wd.items_query(["Q1"], False)
    assert 'cornerWest "Point(-10 35)"' in wd.items_query(["Q1"], False, (-10, 35, 0, 45))


def test_client_reads_the_cache_and_never_the_network(tmp_path):
    client = SparqlClient(tmp_path)
    path = client.cache_path("items/batch", "SELECT 1")
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({"results": {"bindings": [{"item": {"value": "x"}}]}}))
    client._fetch = lambda label, query: pytest.fail("cache miss")
    assert client.bindings("items/batch", "SELECT 1") == [{"item": {"value": "x"}}]


def test_truncated_response_counts_as_a_timeout():
    with pytest.raises(QueryTimeout):
        _parse('{"results": {"bindings": [{"item"')


def test_a_connection_cut_mid_body_is_retried_and_only_a_whole_response_is_cached(tmp_path, monkeypatch):
    import http.client

    monkeypatch.setattr("time.sleep", lambda seconds: None)
    client = SparqlClient(tmp_path)
    replies = iter([http.client.IncompleteRead(b'{"results"'), '{"results": {"bindings": []}}'])

    def post(query):
        reply = next(replies)
        if isinstance(reply, Exception):
            raise reply
        return reply

    client._post = post
    assert client.bindings("items/batch", "SELECT 1") == []
    assert [path.name for path in (tmp_path / "items").iterdir()] == [client.cache_path("items/batch", "SELECT 1").name]
