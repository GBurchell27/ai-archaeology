"""Pleiades names date an existing pin only when they are the same place."""

import gzip
import json
from pathlib import Path

from ai_archaeology.sites.pleiades import (
    GazetteerPlace,
    _accepted_spans,
    apply_places,
    iter_places,
    place_from_dump,
    published_periods,
)
from ai_archaeology.sites.wikidata import assign_periods


def _pin(name: str, lon: float, lat: float, qid: str = "Q1") -> dict:
    return {
        "type": "Feature",
        "id": qid,
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "name": name,
            "qid": qid,
            "source": "Wikidata",
            "sourceUrl": f"https://www.wikidata.org/wiki/{qid}",
            "wikipedia": None,
            "types": [],
            "periodLabels": [],
            "periods": [],
            "startYear": None,
            "endYear": None,
            "heritage": [],
            "confidence": "low",
            "licence": "CC0",
        },
    }


def _place(pid: str, title: str, lon: float, lat: float, spans, names=None) -> GazetteerPlace:
    return GazetteerPlace(pid, title, lon, lat, ("settlement",), tuple(names or (title,)), tuple(spans))


def test_same_name_within_3_km_fills_the_timeline_and_the_period_chip():
    features = [_pin("Ephesos", 27.34, 37.94)]
    place = _place("599612", "Ephesos", 27.341, 37.941, [(-1000, 400, "roman")])
    counts = apply_places([place], features, [])
    props = features[0]["properties"]
    assert counts["matched"] == 1 and counts["added"] == 0
    assert props["startYear"] == -30 and props["endYear"] == 300
    assert "classical" in props["periods"]
    assert props["pleiadesUrl"] == "https://pleiades.stoa.org/places/599612"
    assert props["confidence"] == "medium"


def test_same_name_beyond_3_km_is_not_added_and_not_dated():
    features = [_pin("Ephesos", 27.34, 37.94)]
    # About 4 km north. Inside the 8 km "not sure" band.
    place = _place("599612", "Ephesos", 27.34, 37.976, [(-1000, 400, "roman")])
    counts = apply_places([place], features, [])
    assert counts["matched"] == 0 and counts["added"] == 0 and counts["skippedNear"] == 1
    assert features[0]["properties"]["periods"] == []


def test_different_name_within_150_m_is_not_a_second_pin():
    features = [_pin("Ephesos", 27.34, 37.94)]
    place = _place("1", "Cave of the Seven Sleepers", 27.341, 37.941, [(400, 800, "late-antique")])
    counts = apply_places([place], features, [])
    assert counts["added"] == 0 and counts["matched"] == 0
    assert features[0]["properties"]["startYear"] is None
    assert len(features) == 1


def test_a_different_published_place_is_added():
    features = [_pin("Ephesos", 27.34, 37.94)]
    place = _place("2", "Claros", 27.43, 37.99, [(-700, -300, "archaic")])
    counts = apply_places([place], features, [])
    assert counts["added"] == 1
    added = next(feature for feature in features if feature["id"] == "2")
    assert added["properties"]["source"] == "Pleiades"
    assert added["properties"]["licence"] == "CC BY 3.0 US"
    assert "bronze" in added["properties"]["periods"] or "classical" in added["properties"]["periods"]


def test_two_same_name_pins_are_left_undated():
    features = [_pin("Miletos", 27.28, 37.53, "Q2"), _pin("Miletos", 27.29, 37.53, "Q3")]
    place = _place("3", "Miletos", 27.285, 37.53, [(-800, 300, "classical")])
    counts = apply_places([place], features, [])
    assert counts["ambiguous"] == 1 and counts["added"] == 0
    assert all(feature["properties"]["periods"] == [] for feature in features)


def test_modern_slug_is_not_occupation_even_inside_its_own_years():
    features = [_pin("Hattusa", 34.62, 40.02)]
    # 1918–2000 is the published modern-middle-east span. Removing the slug
    # check would keep those years and date the pin.
    place = _place("4", "Hattusa", 34.62, 40.02, [(1918, 2000, "modern-middle-east")], names=("Hattusa",))
    counts = apply_places([place], features, [])
    assert counts["matched"] == 1
    assert features[0]["properties"]["startYear"] is None
    assert features[0]["properties"]["periods"] == []


def test_curated_match_keeps_the_gazetteer_years():
    curated = {
        "type": "Feature",
        "id": "hattusa",
        "geometry": {"type": "Point", "coordinates": [34.62, 40.02]},
        "properties": {
            "name": "Hattusa",
            "names": ["Hattusa", "Boğazköy"],
            "startYear": -1700,
            "endYear": -1180,
            "layer": "bronze",
        },
    }
    place = _place("5", "Hattusa", 34.621, 40.021, [(-1650, -1200, "old-hittite-anatolia")])
    counts = apply_places([place], [], [curated])
    assert counts["matched"] == 1 and counts["added"] == 0
    assert curated["properties"]["startYear"] == -1650
    assert curated["properties"]["endYear"] == -1450
    assert "bronze" in curated["properties"]["periods"]
    assert curated["properties"]["pleiadesUrl"] == "https://pleiades.stoa.org/places/5"


def test_same_name_within_8_km_is_not_added_twice():
    # About 5 km apart: inside the 8 km same-name skip, outside 3 km.
    first = _place("10", "Klaros", 27.43, 37.99, [(-750, -550, "archaic")])
    second = _place("11", "Klaros", 27.43, 38.035, [(-750, -550, "archaic")])
    counts = apply_places([first, second], [], [])
    assert counts["added"] == 1


def test_untitled_without_a_period_is_dropped():
    blank = _place("12", "Untitled", 30.1, 38.2, [])
    dated = _place("13", "Untitled", 32.1, 38.2, [(None, None, "archaic")])
    counts = apply_places([blank, dated], [], [])
    assert counts["droppedUntitled"] == 1
    assert counts["added"] == 1
    assert counts["datesChanged"] == 0


def test_published_period_table_matches_the_vocabulary():
    vocabulary = published_periods()
    assert vocabulary["1200-bc-middle-east"] == (-1200, -1199)
    assert vocabulary["middle-bronze-early-iron-age-iran"] == (-2000, -650)
    assert vocabulary["early-1st-millennium-mesopotamia"] == (-1000, -720)
    assert vocabulary["2nd-millenium-bce"] == (-2000, -1000)
    assert vocabulary["mediaeval-byzantine"] == (640, 1453)
    assert vocabulary["ottoman-empire-2"] == (1300, 1923)
    assert vocabulary["neolithic-eastern-med"] == (-10000, -3300)
    assert vocabulary["late-bronze-age-anatolia"] == (-1600, -1200)
    assert vocabulary["fifteenth-ce"] == (1400, 1499)
    assert vocabulary["archaic"] == (-750, -550)
    assert vocabulary["early-iron-age-anatolia"] == (-1200, -700)


def test_unknown_period_slug_is_dropped():
    place = _place("21", "Nowhere", 30.0, 38.0, [(-500, -400, "not-a-real-period")])
    spans, filled = _accepted_spans(place, published_periods())
    assert spans == [] and filled == 0


def test_pinned_dump_slugs_are_all_in_the_period_table():
    import hashlib
    dump = Path("/tmp/pleiades-places-latest.json.gz")
    meta = json.loads((Path(__file__).resolve().parents[1] / "Anatolia/atlas/public/wikidata/snapshot.json").read_text())
    if not dump.exists():
        import pytest
        pytest.skip("pinned Pleiades dump is not on this machine")
    digest = hashlib.sha256(dump.read_bytes()).hexdigest()
    assert digest == meta["pleiades"]["dumpSha256"]
    vocabulary = published_periods()
    unknown = set()
    for raw in iter_places(dump):
        place = place_from_dump(raw)
        if place is None:
            continue
        spans, _filled = _accepted_spans(place, vocabulary)
        for _start, _end, period in spans:
            if period and period.removeprefix("copy_of_") not in vocabulary:
                unknown.add(period)
    assert unknown == set()


def test_yearless_periods_use_published_bounds_and_do_not_pass_them():
    vocabulary = published_periods()
    place = _place("20", "Archaic town", 30.2, 38.2, [(None, None, "archaic"), (None, None, "early-iron-age-anatolia")])
    spans, filled = _accepted_spans(place, vocabulary)
    assert filled == 2
    assert (-750, -550, "archaic") in spans
    assert (-1200, -700, "early-iron-age-anatolia") in spans
    for start, end, period in spans:
        published_start, published_end = vocabulary[period]
        assert start >= published_start
        assert end <= published_end
    # A 1200 CE attestation of the 1200 BC period does not survive the published bounds.
    point = _place("22", "Orontes", 36.2, 36.2, [(1200, 1200, "1200-bc-middle-east")])
    point_spans, _filled = _accepted_spans(point, vocabulary)
    assert point_spans == []


def test_miletus_keeps_published_period_bounds():
    raw = {
        "id": "599799",
        "title": "Miletus",
        "review_state": "published",
        "reprPoint": [27.279, 37.53],
        "placeTypes": ["settlement"],
        "names": [
            {"romanized": "Millawa(n)da", "start": -1450, "end": -1200, "attestations": [{"timePeriod": "middle-hittite-anatolia", "confidence": "confident"}]},
            {"romanized": "Miletus", "start": -750, "end": 640, "attestations": [
                {"timePeriod": period, "confidence": "confident"}
                for period in ("archaic", "classical", "hellenistic-republican", "roman", "late-antique")
            ]},
            {"romanized": "Miletos", "start": -720, "end": 1200, "attestations": [
                {"timePeriod": "early-iron-age-anatolia", "confidence": "confident"},
                {"timePeriod": "middle-byzantine", "confidence": "confident"},
            ]},
        ],
        "locations": [],
    }
    place = place_from_dump(raw)
    assert place is not None
    vocabulary = published_periods()
    spans, _filled = _accepted_spans(place, vocabulary)
    iron = next(span for span in spans if span[2] == "early-iron-age-anatolia")
    assert iron[1] == -700 and iron[0] >= -1200
    for start, end, period in spans:
        if period is None:
            continue
        published_start, published_end = vocabulary[period]
        assert start >= published_start and end <= published_end
    chips = assign_periods([], min(span[0] for span in spans), max(span[1] for span in spans))
    assert chips == ["bronze", "classical", "crusader"]


def test_dump_parser_reads_a_graph(tmp_path: Path):
    payload = {
        "@context": {},
        "@graph": [
            {
                "id": "https://pleiades.stoa.org/places/9",
                "title": "Claros",
                "review_state": "published",
                "reprPoint": [27.43, 37.99],
                "placeTypes": ["sanctuary"],
                "names": [{
                    "romanized": "Claros",
                    "attested": "Klaros",
                    "start": -700,
                    "end": -300,
                    "associationCertainty": "certain",
                    "attestations": [{"timePeriod": "archaic", "confidence": "confident"}],
                }],
                "locations": [],
            },
            {
                "id": "10",
                "title": "Athens",
                "reprPoint": [23.7, 37.9],
                "names": [],
                "locations": [],
            },
        ],
    }
    path = tmp_path / "places.json.gz"
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle)
    places = [place for raw in iter_places(path) if (place := __import__("ai_archaeology.sites.pleiades", fromlist=["place_from_dump"]).place_from_dump(raw))]
    assert [place.id for place in places] == ["9"]
    assert "Klaros" in places[0].names
    assert places[0].spans[0][2] == "archaic"
