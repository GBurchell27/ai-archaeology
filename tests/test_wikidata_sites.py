"""Curated pins win deduplication, and periods come only from Wikidata dates or labels."""

import json
from pathlib import Path

from ai_archaeology.sites.wikidata import assign_periods, build_snapshot, nearest_curated, load_curated


def test_years_and_labels_map_onto_atlas_periods():
    assert assign_periods(["Neolithic"], None, None) == ["neolithic"]
    assert assign_periods(["Roman Empire"], -800, 1300) == ["bronze", "classical", "crusader"]
    assert assign_periods([], None, None) == []
    assert "classical" in assign_periods([], -200, 400)


def test_a_nearby_wikidata_item_is_dropped(tmp_path: Path):
    curated = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "id": "catalhoyuk",
            "geometry": {"type": "Point", "coordinates": [32.82806, 37.66667]},
            "properties": {"name": "Çatalhöyük"},
        }],
    }
    curated_path = tmp_path / "sites.geojson"
    curated_path.write_text(json.dumps(curated))
    raw = tmp_path / "raw"
    raw.mkdir()
    (raw / "core.json").write_text(json.dumps({"results": {"bindings": [
        _row("Q1", "Duplicate mound", 32.830, 37.668, "-7000-01-01T00:00:00Z"),
        _row("Q2", "Somewhere else", 35.0, 38.0, None),
    ]}}))
    for name in ("types", "periods", "heritage"):
        (raw / f"{name}.json").write_text(json.dumps({"results": {"bindings": []}}))
    (raw / "periods.json").write_text(json.dumps({"results": {"bindings": [
        {"item": {"value": "http://www.wikidata.org/entity/Q2"}, "periodLabel": {"value": "Neolithic"}},
    ]}}))
    snapshot = build_snapshot(raw, curated_path)
    assert [feature["id"] for feature in snapshot["features"]] == ["Q2"]
    assert snapshot["dropped"][0]["kept"] == "catalhoyuk"
    assert snapshot["features"][0]["properties"]["periods"] == ["neolithic"]
    pins = load_curated(curated_path)
    assert nearest_curated(32.83, 37.668, pins, 1500) is not None
    assert nearest_curated(35.0, 38.0, pins, 1500) is None


def _row(qid: str, name: str, lon: float, lat: float, inception: str | None) -> dict:
    row = {
        "item": {"value": f"http://www.wikidata.org/entity/{qid}"},
        "itemLabel": {"value": name},
        "coord": {"value": f"Point({lon} {lat})"},
    }
    if inception:
        row["inception"] = {"value": inception}
    return row
