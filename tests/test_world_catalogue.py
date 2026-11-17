"""World catalogue merge, dating and web pack. Synthetic records only."""

import json
import math
from dataclasses import replace
from pathlib import Path

import pytest

from ai_archaeology.world.dating import apply_featured, attach_radiocarbon, dating_name_key, drop_implausible_dates
from ai_archaeology.world.merge import merge_published
from ai_archaeology.world.records import SITE_ID, SITE_TYPES, WorldSite
from ai_archaeology.world.web_pack import (
    build_catalogue_files, cell_key_for, detail_bucket, source_record_url, split_core, write_catalogue,
)

METRES_PER_DEGREE = 111_195.0


def _site(site_id: str, name: str, lon: float, lat: float, source: str = "wikidata", **fields) -> WorldSite:
    licence = {"wikidata": "CC0", "pleiades": "CC BY 3.0", "osm": "ODbL 1.0"}[source]
    return WorldSite(
        id=site_id, name=name, lon=lon, lat=lat, source=source, licence=licence,
        attribution=source, sourceUrl=f"https://example.org/{site_id}", **fields,
    )


def _north(lat: float, metres: float) -> float:
    return lat + metres / METRES_PER_DEGREE


def _monument(qid: str, name: str, start: int | None, end: int | None) -> dict:
    return {
        "qid": qid, "name": name, "country": "Nowhere", "category": "megalith", "period": "Neolithic",
        "startYear": start, "endYear": end, "datingConfidence": "high", "status": "accepted",
        "why": "Synthetic.", "source": "https://en.wikipedia.org/wiki/Synthetic",
    }


def test_identifier_merge_keeps_wikidata_and_borrows_pleiades_dating():
    item = _site("Q1", "Alpha", 10.0, 20.0, ids={"wikidata": "Q1", "pleiades": "777"}, importance=12)
    # Far away and differently named: only the identifier links them.
    place = _site("777", "Alpha Vetus", 11.0, 21.0, "pleiades", startYear=-500, endYear=300, datingSource="pleiades")
    outcome = merge_published([item], [place])
    assert [site.id for site in outcome.sites] == ["Q1"]
    assert outcome.linked_by_identifier == 1
    merged = outcome.sites[0]
    assert (merged.name, merged.lon, merged.lat, merged.importance) == ("Alpha", 10.0, 20.0, 12)
    assert (merged.startYear, merged.endYear, merged.datingSource) == (-500, 300, "pleiades")
    assert merged.ids == {"wikidata": "Q1", "pleiades": "777"}
    assert "CC BY 3.0" in merged.licence


def test_identifier_merge_keeps_wikidata_dating_when_it_has_one():
    item = _site("Q1", "Alpha", 10.0, 20.0, ids={"pleiades": "777"}, startYear=-900, datingSource="wikidata")
    place = _site("777", "Alpha", 10.0, 20.0, "pleiades", startYear=-500, endYear=300, datingSource="pleiades")
    merged = merge_published([item], [place]).sites[0]
    assert (merged.startYear, merged.endYear, merged.datingSource, merged.licence) == (-900, None, "wikidata", "CC0")


def test_spatial_merge_needs_the_same_folded_name_within_3_km():
    items = [_site("Q1", "Çatal Höyük", 30.0, 40.0), _site("Q2", "Beta", 50.0, 10.0)]
    places = [
        _site("101", "Catal Hoyuk", 30.0, _north(40.0, 2500), "pleiades"),  # same folded name, 2.5 km
        _site("102", "Unrelated", 50.0, _north(10.0, 10), "pleiades"),  # 10 m away, but nearness alone never merges
        _site("103", "Beta", 50.0, _north(10.0, 3500), "pleiades"),  # same name, too far
    ]
    outcome = merge_published(items, places)
    assert sorted(site.id for site in outcome.sites) == ["102", "103", "Q1", "Q2"]
    assert outcome.linked_spatially == 1
    by_id = {site.id: site for site in outcome.sites}
    assert by_id["Q1"].ids["pleiades"] == "101"
    assert (by_id["Q1"].lon, by_id["Q1"].lat) == (30.0, 40.0)


def test_an_item_absorbs_one_place_and_a_place_takes_its_nearest_namesake():
    items = [_site("Q1", "Tower", 30.0, 40.0), _site("Q2", "Tower", 30.0, _north(40.0, 1000))]
    places = [
        _site("101", "Tower", 30.0, _north(40.0, 900), "pleiades", startYear=-50, datingSource="pleiades"),  # 100 m from Q2
        _site("102", "Tower", 30.0, _north(40.0, 800), "pleiades"),  # also nearest Q2, but farther from it than 101
    ]
    outcome = merge_published(items, places)
    by_id = {site.id: site for site in outcome.sites}
    assert sorted(by_id) == ["102", "Q1", "Q2"]
    assert (by_id["Q2"].ids["pleiades"], by_id["Q2"].startYear) == ("101", -50)
    assert outcome.linked_spatially == 1


def test_spatial_merge_works_across_the_antimeridian():
    outcome = merge_published([_site("Q1", "Edge", 179.9999, 0.0)], [_site("101", "Edge", -179.9999, 0.0, "pleiades")])
    assert [site.id for site in outcome.sites] == ["Q1"]


def test_osm_is_never_merged_and_stays_out_of_every_other_file():
    item = _site("Q1", "Dolmen", 5.0, 50.0, siteType="megalith")
    osm = _site("osm-n1", "Dolmen", 5.0, 50.0, "osm", siteType="megalith")
    with pytest.raises(ValueError):
        merge_published([item], [osm])
    with pytest.raises(ValueError):
        build_catalogue_files([item, osm], [], [], "2026-01-01")
    files = build_catalogue_files([item], [osm], [], "2026-01-01")
    assert files["osm-megaliths.json"]["id"] == ["osm-n1"]
    assert files["core.json"]["id"] == ["Q1"]
    columns = {path: payload for path, payload in files.items() if not path.startswith("detail/") and path != "osm-megaliths.json"}
    assert "osm-n1" not in json.dumps(columns)
    # The detail shard is a per-id lookup and keeps the ODbL credit on the record.
    assert files["detail/n1.json"]["osm-n1"]["licence"] == "ODbL 1.0"
    assert files["index.json"]["count"] == 1
    assert files["index.json"]["osmMegaliths"] == {"count": 1, "file": "osm-megaliths.json"}


def test_radiocarbon_dates_only_undated_sites_and_never_moves_a_pin():
    sites = [
        _site("Q1", "Tell Sabi", 38.0, 36.0),
        _site("Q2", "Tell Dated", 39.0, 36.0, startYear=-3000, endYear=-2000, datingSource="wikidata"),
        _site("Q3", "Tell Far", 40.0, 36.0),
    ]
    spans = [
        {"name": "tell sabi", "lon": 38.0, "lat": _north(36.0, 4000), "startYear": -7000, "endYear": -5500, "source": "xronos"},
        {"name": "Tell Dated", "lon": 39.0, "lat": 36.0, "startYear": -9000, "endYear": -8000, "source": "p3k14c"},
        {"name": "Tell Far", "lon": 40.0, "lat": _north(36.0, 6000), "startYear": -4000, "endYear": -3000, "source": "xronos"},
    ]
    dated = {site.id: site for site in attach_radiocarbon(sites, spans)}
    assert (dated["Q1"].startYear, dated["Q1"].endYear, dated["Q1"].datingSource) == (-7000, -5500, "c14")
    assert "XRONOS" in dated["Q1"].attribution
    assert (dated["Q2"].startYear, dated["Q2"].datingSource) == (-3000, "wikidata")
    assert (dated["Q3"].startYear, dated["Q3"].datingSource) == (None, "none")
    assert [(site.lon, site.lat) for site in dated.values()] == [(site.lon, site.lat) for site in sites]


def test_radiocarbon_skips_pleiades_places_and_pleistocene_spans_on_holocene_types():
    span = {"name": "Larissa", "lon": 22.4, "lat": 39.6, "startYear": -44516, "endYear": -25921, "source": "xronos"}
    young = {"name": "Larissa", "lon": 22.4, "lat": _north(39.6, 2000), "startYear": -6000, "endYear": -5000, "source": "xronos"}
    city = _site("Q1", "Larissa", 22.4, 39.6, siteType="city")
    cave = _site("Q2", "Larissa", 22.4, 39.6, siteType="cave")
    gazetteer = _site("540", "Larissa", 22.4, 39.6, "pleiades", siteType="settlement")
    dated = {site.id: site for site in attach_radiocarbon([city, cave, gazetteer], [span])}
    assert (dated["Q1"].startYear, dated["Q1"].datingSource) == (None, "none")
    assert (dated["Q2"].startYear, dated["Q2"].datingSource) == (-44516, "c14")
    assert dated["540"] == gazetteer
    # The implausible span is passed over, not the site: a farther plausible one still dates it.
    redated = attach_radiocarbon([city, gazetteer], [span, young])
    assert (redated[0].startYear, redated[1]) == (-6000, gazetteer)


def test_radiocarbon_name_key_drops_site_words_but_never_numbers():
    assert dating_name_key("Cave of El Castillo") == dating_name_key("Castillo") == "castillo"
    assert dating_name_key("Tell Sabi Abyad") == dating_name_key("Sabi Abyad")
    assert dating_name_key("Odensala 460:1") != dating_name_key("Odensala")
    assert dating_name_key("Östra Broby") != dating_name_key("Broby")
    assert dating_name_key("Cave 4") == "cave4"  # nothing distinctive left, so the whole name stands
    assert dating_name_key("TÃ¼rkmen-Karah�yÃ¼k") != ""  # upstream mojibake folds without error
    span = {"name": "Castillo", "lon": 0.0, "lat": 0.0, "startYear": -40000, "endYear": -12000, "source": "p3k14c"}
    dated = attach_radiocarbon([_site("Q1", "Cave of El Castillo", 0.0, 0.0), _site("Q2", "Castillo 12", 0.0, 0.0)], [span])
    assert [site.datingSource for site in dated] == ["c14", "none"]


def test_featured_dates_override_and_a_missing_featured_site_is_added():
    sites = [_site("Q1", "Circle", 1.0, 51.0, startYear=-2000, endYear=-1000, datingSource="wikidata", siteType="ritual")]
    monuments = [_monument("Q1", "Circle", -3000, -1500), _monument("Q2", "Mound", -2600, None), _monument("Q3", "Lost", None, None)]
    featured, unplaced = apply_featured(sites, monuments, {"Q2": [-77.5, -10.9]})
    by_id = {site.id: site for site in featured}
    assert (by_id["Q1"].startYear, by_id["Q1"].endYear, by_id["Q1"].datingSource) == (-3000, -1500, "featured")
    assert by_id["Q1"].siteType == "ritual"  # a real source type is kept
    untyped, _ = apply_featured([_site("Q1", "Circle", 1.0, 51.0)], monuments, {})
    assert untyped[0].siteType == "megalith"  # "other" takes the curated category
    assert (by_id["Q2"].lon, by_id["Q2"].lat, by_id["Q2"].siteType) == (-77.5, -10.9, "megalith")
    assert (by_id["Q2"].startYear, by_id["Q2"].datingSource) == (-2600, "featured")
    assert unplaced == ["Q3"]
    files = build_catalogue_files(featured, [], monuments, "2026-01-01")
    assert files["core.json"]["featured"] == [1, 1]
    assert [row["id"] for row in files["featured.json"]] == ["Q1", "Q2"]
    assert set(files["featured.json"][0]) == {
        "id", "name", "lon", "lat", "country", "category", "period", "startYear", "endYear",
        "datingConfidence", "status", "why", "source",
    }


@pytest.mark.parametrize(("lon", "lat", "cell_key"), [
    (180, 90, "35_17"), (-180, -90, "0_0"), (0, 0, "18_9"), (-0.5, -0.5, "17_8"),
    (-1.826, 51.179, "17_14"), (-77.52, -10.89, "10_7"), (179.99, 89.99, "35_17"), (-10, -10, "17_8"),
])
def test_cell_keys_match_the_typescript_reader(lon: float, lat: float, cell_key: str):
    assert cell_key_for(lon, lat) == cell_key


@pytest.mark.parametrize(("site_id", "bucket"), [
    ("Q214944", "44"), ("Q5", "q5"), ("7", "7"), ("579885", "85"), ("osm-n123", "23"),
])
def test_detail_buckets_match_the_typescript_reader(site_id: str, bucket: str):
    assert detail_bucket(site_id) == bucket


def _many_sites() -> list[WorldSite]:
    sites = []
    for number in range(1, 61):
        lon = -180 + (number * 37) % 361
        lat = -90 + (number * 23) % 181
        site_type = SITE_TYPES[number % len(SITE_TYPES)]
        source = "pleiades" if number % 4 == 0 else "wikidata"
        site_id = str(1000 + number) if source == "pleiades" else f"Q{number}"
        sites.append(_site(site_id, f"Site {number}", lon, lat, source, siteType=site_type, importance=number % 9))
    return sites


def test_core_and_cells_partition_the_catalogue_and_the_index_adds_up(tmp_path: Path):
    sites = _many_sites()
    monuments = [_monument("Q1", "Site 1", -3000, None)]
    files = build_catalogue_files(sites, [], monuments, "2026-01-01", core_target=25)
    index = files["index.json"]
    core_ids = files["core.json"]["id"]
    cell_ids = [site_id for path, block in files.items() if path.startswith("cells/") for site_id in block["id"]]
    assert len(core_ids) == index["coreCount"] >= 25
    assert "Q1" in core_ids
    assert set(core_ids).isdisjoint(cell_ids)
    assert sorted(core_ids + cell_ids) == sorted(site.id for site in sites)
    assert index["count"] == len(sites) == index["coreCount"] + sum(index["cells"].values())
    assert sum(source["count"] for source in index["sources"]) == len(sites)
    assert index["cells"] == {path[6:-5]: len(block["id"]) for path, block in files.items() if path.startswith("cells/")}
    for path, block in files.items():
        if not path.startswith("cells/"):
            continue
        assert block["importance"] == sorted(block["importance"], reverse=True)
        assert {cell_key_for(lon, lat) for lon, lat in zip(block["lon"], block["lat"])} == {path[6:-5]}
    assert files["core.json"]["importance"] == sorted(files["core.json"]["importance"], reverse=True)
    detail_ids = [site_id for path, shard in files.items() if path.startswith("detail/") for site_id in shard]
    assert sorted(detail_ids) == sorted(site.id for site in sites)
    assert all(SITE_ID.match(site_id) for site_id in core_ids + cell_ids)
    assert all(path == f"detail/{detail_bucket(site_id)}.json" for path, shard in files.items() if path.startswith("detail/") for site_id in shard)


def test_pack_is_deterministic_compact_and_rounded(tmp_path: Path):
    sites = _many_sites() + [_site("Q900", "Göbekli", 38.0 + 1 / 3, 37.0 + 2 / 3, importance=99)]
    first = write_catalogue(tmp_path / "first", build_catalogue_files(sites, [], [], "2026-01-01"))
    second = write_catalogue(tmp_path / "second", build_catalogue_files(sites[::-1], [], [], "2026-01-01"))
    assert first == second
    for relative in first:
        assert (tmp_path / "first" / relative).read_bytes() == (tmp_path / "second" / relative).read_bytes()
    core_text = (tmp_path / "first" / "core.json").read_text(encoding="utf-8")
    assert "Göbekli" in core_text and ", " not in core_text and ": " not in core_text
    core = json.loads(core_text)
    assert core["id"][0] == "Q900"
    assert (core["lon"][0], core["lat"][0]) == (round(38.0 + 1 / 3, 5), round(37.0 + 2 / 3, 5))
    assert math.isclose(core["lon"][0], 38.33333)


def test_core_top_up_takes_the_most_important_first():
    sites = [_site(f"Q{number}", f"Site {number}", 0.0, 0.0, importance=number) for number in range(1, 11)]
    core, rest = split_core(sites, set(), core_target=3)
    assert [site.id for site in core] == ["Q10", "Q9", "Q8"]
    assert len(rest) == 7


def test_core_boosts_monument_types_and_leaves_stubs_out():
    sites = [
        _site("Q1", "Findspot", 0.0, 0.0, importance=3),
        _site("Q2", "Dolmen", 0.0, 0.0, importance=2, siteType="megalith"),
        _site("Q3", "Village", 0.0, 0.0, importance=2),
        _site("Q4", "Dated village", 0.0, 0.0, importance=2, startYear=-500, datingSource="wikidata"),
        _site("Q5", "Stub dolmen", 0.0, 0.0, siteType="megalith"),
        _site("Q6", "Curated stub", 0.0, 0.0),
    ]
    core, rest = split_core(sites, {"Q6"}, core_target=3)
    assert {site.id for site in core} == {"Q6", "Q2", "Q1"}  # the dolmen (2 x 2) outranks the findspot (3)
    core, rest = split_core(sites, {"Q6"}, core_target=4)
    assert {site.id for site in core} == {"Q6", "Q2", "Q1", "Q4"}  # on a tie the dated site comes first
    assert [site.id for site in rest] == ["Q3", "Q5"]


def test_core_gives_pleiades_only_places_a_quarter_of_the_room():
    items = [_site(f"Q{number}", f"Item {number}", 0.0, 0.0, importance=number) for number in range(1, 21)]
    dated = {"startYear": -500, "endYear": 300, "datingSource": "pleiades"}
    places = [
        _site("101", "Undated", 0.0, 0.0, "pleiades"),
        _site("102", "Rough", 0.0, 0.0, "pleiades", locationPrecision="rough", **dated),
        _site("103", "Farm", 0.0, 0.0, "pleiades", siteType="other", **dated),
        _site("104", "Town", 0.0, 0.0, "pleiades", siteType="settlement", **dated),
        _site("105", "Old town", 0.0, 0.0, "pleiades", siteType="settlement", startYear=-2000, endYear=600, datingSource="pleiades"),
    ]
    core, rest = split_core(items + places, set(), core_target=8)
    assert sorted(site.id for site in core if site.source == "pleiades") == ["104", "105"]
    assert sorted(site.importance for site in core if site.source == "wikidata") == [15, 16, 17, 18, 19, 20]
    core, rest = split_core(items + places, set(), core_target=12)
    assert sorted(site.id for site in core if site.source == "pleiades") == ["103", "104", "105"]
    core, rest = split_core(places, set(), core_target=4)  # no Wikidata to fill its share
    assert sorted(site.id for site in core) == ["102", "103", "104", "105"]


def test_names_file_lists_every_site_outside_core_for_search():
    files = build_catalogue_files(_many_sites(), [], [], "2026-01-01", core_target=25)
    names = files["names.json"]
    assert list(names) == ["id", "name", "lon", "lat", "type", "start", "end"]
    assert files["index.json"]["namesFile"] == "names.json"
    assert set(names["id"]).isdisjoint(files["core.json"]["id"])
    assert len(names["id"]) == files["index.json"]["count"] - files["index.json"]["coreCount"]
    assert all(len(column) == len(names["id"]) for column in names.values())


def test_implausible_dates_are_nulled():
    sites = [
        _site("Q1", "Geological", 0.0, 0.0, startYear=-72_100_000, endYear=-66_000_000, datingSource="wikidata"),
        _site("Q2", "Reversed", 0.0, 0.0, startYear=200, endYear=-100, datingSource="wikidata"),
        _site("Q3", "Oldest tools", 0.0, 0.0, startYear=-3_300_000, datingSource="wikidata"),
        _site("Q4", "Only an end", 0.0, 0.0, endYear=-100, datingSource="wikidata"),
    ]
    cleaned, dropped = drop_implausible_dates(sites)
    assert dropped == 2
    assert [(site.startYear, site.endYear, site.datingSource) for site in cleaned] == [
        (None, None, "none"), (None, None, "none"), (-3_300_000, None, "wikidata"), (None, -100, "wikidata"),
    ]


def test_detail_records_leave_out_null_and_empty_fields():
    bare = _site("Q1", "Bare", 1.0, 2.0, ids={"wikidata": "Q1", "pleiades": None})
    rich = _site("Q2", "Rich", 1.0, 2.0, types=["dolmen"], heritage=["Listed"], wikipedia="https://en.wikipedia.org/wiki/Rich")
    files = build_catalogue_files([bare, rich], [], [], "2026-01-01")
    assert files["detail/q1.json"]["Q1"] == {
        "lon": 1.0, "lat": 2.0, "name": "Bare", "sourceUrl": "https://example.org/Q1", "licence": "CC0",
        "attribution": "wikidata", "datingSource": "none", "ids": {},
    }
    assert {"types", "heritage", "wikipedia"} <= set(files["detail/q2.json"]["Q2"])
    assert "image" not in files["detail/q2.json"]["Q2"]


def test_detail_leaves_out_a_source_url_the_reader_can_derive():
    published = [_site("Q3", "Item", 1.0, 2.0), _site("579885", "Place", 1.0, 2.0, "pleiades")]
    published = [replace(site, sourceUrl=source_record_url(site.id)) for site in published]
    assert published[1].sourceUrl == "https://pleiades.stoa.org/places/579885"
    osm = [replace(_site(site_id, "Dolmen", 1.0, 2.0, "osm"), sourceUrl=url) for site_id, url in (
        ("osm-n123", "https://www.openstreetmap.org/node/123"), ("osm-w45", "https://www.openstreetmap.org/way/45"),
    )]
    files = build_catalogue_files(published, osm, [], "2026-01-01")
    stored = {site_id: record for path, shard in files.items() if path.startswith("detail/") for site_id, record in shard.items()}
    assert set(stored) == {"Q3", "579885", "osm-n123", "osm-w45"}
    assert not any("sourceUrl" in record for record in stored.values())
    odd = build_catalogue_files([_site("Q4", "Odd", 1.0, 2.0)], [], [], "2026-01-01")
    assert odd["detail/q4.json"]["Q4"]["sourceUrl"] == "https://example.org/Q4"  # not derivable, so kept
