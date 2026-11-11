"""Curated pins win deduplication, and periods come only from Wikidata dates or labels."""

import hashlib
import json
import math
from pathlib import Path

from ai_archaeology.sites.wikidata import _fold, assign_periods, build_snapshot, load_curated, matching_curated


def test_sites_geojson_matches_the_snapshot_sha256():
    root = Path("Anatolia/atlas/public/wikidata")
    meta = json.loads((root / "snapshot.json").read_text())
    digest = hashlib.sha256((root / "sites.geojson").read_bytes()).hexdigest()
    assert digest == meta["sitesGeojsonSha256"]
    assert meta["dropped"]
    assert all(item["qid"].startswith("Q") and item["reason"] for item in meta["dropped"])


def test_dotted_capital_i_matches_a_plain_i():
    assert _fold("İznik") == _fold("Iznik") == "iznik"
    pins = load_curated_memory("Iznik", 29.7, 40.4)
    assert matching_curated("İznik", 29.7, _north(40.4, 2000), pins) is not None
    assert matching_curated("İznik", 29.7, _north(40.4, 2000), pins).reason == "same name within 3 km"


def test_years_and_labels_map_onto_atlas_periods():
    assert assign_periods(["Neolithic"], None, None) == ["neolithic"]
    assert assign_periods(["Roman Empire"], -800, 1300) == ["bronze", "classical", "crusader"]
    assert assign_periods([], None, None) == []
    assert "classical" in assign_periods([], -200, 400)


def test_name_match_within_3_km_drops_and_a_different_monument_stays(tmp_path: Path):
    pin_lon, pin_lat = 32.82806, 37.66667
    curated_path = _curated(tmp_path, pin_lon, pin_lat, "Çatalhöyük", "catalhoyuk")
    raw = tmp_path / "raw"
    raw.mkdir()
    (raw / "core.json").write_text(json.dumps({"results": {"bindings": [
        _row("Qsame", "Catalhoyuk", pin_lon, _north(pin_lat, 2500), None),
        _row("Qnear", "Library of Celsus", pin_lon, _north(pin_lat, 100), None),
        _row("Qkeep", "Basilica Cistern", pin_lon, _north(pin_lat, 400), None),
        _row("Qfar", "Catalhoyuk", pin_lon, _north(pin_lat, 3500), None),
    ]}}))
    for name in ("types", "periods", "heritage"):
        (raw / f"{name}.json").write_text(json.dumps({"results": {"bindings": []}}))
    snapshot = build_snapshot(raw, curated_path)
    assert {item["qid"] for item in snapshot["dropped"]} == {"Qsame", "Qnear"}
    assert {feature["id"] for feature in snapshot["features"]} == {"Qkeep", "Qfar"}
    pins = load_curated(curated_path)
    assert matching_curated("Library of Celsus", pin_lon, _north(pin_lat, 150), pins) is not None
    assert matching_curated("Library of Celsus", pin_lon, _north(pin_lat, 151), pins) is None
    assert matching_curated("Çatalhöyük", pin_lon, _north(pin_lat, 3000), pins) is not None
    assert matching_curated("Çatalhöyük", pin_lon, _north(pin_lat, 3001), pins) is None


def load_curated_memory(name: str, lon: float, lat: float):
    from ai_archaeology.sites.wikidata import CuratedPin
    return [CuratedPin("iznik", name, lon, lat)]


def _north(latitude: float, metres: float) -> float:
    return latitude + math.degrees(metres / 6_371_000.0)


def _curated(tmp_path: Path, lon: float, lat: float, name: str, site_id: str) -> Path:
    path = tmp_path / "sites.geojson"
    path.write_text(json.dumps({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "id": site_id,
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"name": name},
        }],
    }))
    return path


def _row(qid: str, name: str, lon: float, lat: float, inception: str | None) -> dict:
    row = {
        "item": {"value": f"http://www.wikidata.org/entity/{qid}"},
        "itemLabel": {"value": name},
        "coord": {"value": f"Point({lon} {lat})"},
    }
    if inception:
        row["inception"] = {"value": inception}
    return row
