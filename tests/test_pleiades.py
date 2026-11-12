"""Pleiades names date an existing pin only when they are the same place."""

import gzip
import json
from pathlib import Path

from ai_archaeology.sites.pleiades import GazetteerPlace, apply_places, iter_places
from ai_archaeology.sites.wikidata import CuratedPin


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
    assert props["startYear"] == -1000 and props["endYear"] == 400
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
    place = _place("1", "Cave of the Seven Sleepers", 27.3404, 37.9402, [(400, 800, "late-antique")])
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
    assert added["properties"]["licence"] == "CC BY 3.0"
    assert "bronze" in added["properties"]["periods"] or "classical" in added["properties"]["periods"]


def test_two_same_name_pins_are_left_undated():
    features = [_pin("Miletos", 27.28, 37.53, "Q2"), _pin("Miletos", 27.29, 37.53, "Q3")]
    place = _place("3", "Miletos", 27.285, 37.53, [(-800, 300, "classical")])
    counts = apply_places([place], features, [])
    assert counts["ambiguous"] == 1 and counts["added"] == 0
    assert all(feature["properties"]["periods"] == [] for feature in features)


def test_modern_names_do_not_date_a_place():
    features = [_pin("Hattusa", 34.62, 40.02)]
    place = _place("4", "Hattusa", 34.62, 40.02, [(1700, 2100, "modern")], names=("Hattusa",))
    counts = apply_places([place], features, [])
    assert counts["matched"] == 1
    assert features[0]["properties"]["startYear"] is None


def test_curated_pin_blocks_a_duplicate():
    features = []
    curated = [CuratedPin("hattusa", "Hattusa", 34.62, 40.02)]
    place = _place("5", "Hattusa", 34.621, 40.021, [(-2000, -1000, "2nd-millenium-bce")])
    counts = apply_places([place], features, curated)
    assert counts["matched"] == 1 and counts["added"] == 0
    assert features == []


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
