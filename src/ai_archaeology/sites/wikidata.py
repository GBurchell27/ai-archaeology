"""Wikidata archaeological sites in Turkey.

The query is CC0 data from Wikidata. Curated atlas pins keep priority.
A Wikidata item is dropped only when its name matches a curated pin within
3 km, or when it sits within 150 m of a curated pin regardless of name.
A different monument nearby stays. Detector candidates are never an input.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

SNAPSHOT_DATE = "2026-11-11"
NEAR_M = 150.0
NAME_MATCH_M = 3000.0
QUERY = """
SELECT ?item ?itemLabel ?coord ?inception ?dissolved ?enwiki WHERE {
  ?item wdt:P31/wdt:P279* wd:Q839954 .
  ?item wdt:P17 wd:Q43 .
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr". }
}
""".strip()

# Atlas period chips. A label maps only when it is specific enough.
LABEL_PERIODS = {
    "neolithic": "neolithic",
    "pre-pottery neolithic": "neolithic",
    "halaf culture": "neolithic",
    "chalcolithic": "bronze",
    "bronze age": "bronze",
    "early bronze age": "bronze",
    "iron age": "bronze",
    "early iron age": "bronze",
    "old hittite kingdom": "bronze",
    "hatti": "bronze",
    "old-assyrian period": "bronze",
    "ancient greece": "classical",
    "classical antiquity": "classical",
    "hellenistic period": "classical",
    "roman empire": "classical",
    "roman republic": "classical",
    "roman imperial period": "classical",
    "byzantine empire": "classical",
    "middle ages": "crusader",
    "early middle ages": "crusader",
}
PERIOD_SPANS = {
    "neolithic": (-9600, -6000),
    "bronze": (-3200, -330),
    "classical": (-330, 1095),
    "crusader": (1096, 1522),
}


@dataclass(frozen=True)
class CuratedPin:
    id: str
    name: str
    longitude: float
    latitude: float


def build_snapshot(raw_dir: Path, curated_path: Path) -> dict:
    core = _bindings(raw_dir / "core.json")
    types = _group(raw_dir / "types.json", "typeLabel")
    periods = _group(raw_dir / "periods.json", "periodLabel")
    heritage = _group(raw_dir / "heritage.json", "heritageLabel")
    curated = load_curated(curated_path)
    features = []
    dropped = []
    seen: set[str] = set()
    for row in core:
        qid = row["item"]["value"].rsplit("/", 1)[-1]
        if qid in seen:
            _merge_years(features, qid, row)
            continue
        parsed = _point(row["coord"]["value"])
        if parsed is None:
            continue
        seen.add(qid)
        longitude, latitude = parsed
        start, end = _years(row.get("inception"), row.get("dissolved"))
        period_labels = sorted(periods.get(qid, []))
        assigned = assign_periods(period_labels, start, end)
        feature = {
            "type": "Feature",
            "id": qid,
            "geometry": {"type": "Point", "coordinates": [round(longitude, 5), round(latitude, 5)]},
            "properties": {
                "name": row["itemLabel"]["value"],
                "qid": qid,
                "source": "Wikidata",
                "sourceUrl": f"https://www.wikidata.org/wiki/{qid}",
                "wikipedia": _value(row.get("enwiki")),
                "types": sorted(types.get(qid, [])),
                "periodLabels": period_labels,
                "periods": assigned,
                "startYear": start,
                "endYear": end,
                "heritage": sorted(heritage.get(qid, [])),
                "confidence": _confidence(row, period_labels, start, heritage.get(qid, [])),
                "licence": "CC0",
            },
        }
        match = matching_curated(feature["properties"]["name"], longitude, latitude, curated)
        if match is not None:
            dropped.append({"qid": qid, "name": feature["properties"]["name"], "kept": match.id})
            continue
        features.append(feature)
    features.sort(key=lambda feature: feature["properties"]["name"].lower())
    return {
        "snapshotDate": SNAPSHOT_DATE,
        "licence": "CC0",
        "query": QUERY,
        "sourceUrl": "https://query.wikidata.org/",
        "nearMetres": NEAR_M,
        "nameMatchMetres": NAME_MATCH_M,
        "wikidataRows": len(seen),
        "droppedAsCurated": len(dropped),
        "features": features,
        "dropped": dropped,
    }


def load_curated(path: Path) -> list[CuratedPin]:
    payload = json.loads(path.read_text())
    pins = []
    for feature in payload["features"]:
        longitude, latitude = feature["geometry"]["coordinates"]
        pins.append(CuratedPin(feature["id"], feature["properties"]["name"], float(longitude), float(latitude)))
    return pins


def assign_periods(labels: list[str], start: int | None, end: int | None) -> list[str]:
    found: set[str] = set()
    for label in labels:
        period = LABEL_PERIODS.get(label.lower())
        if period:
            found.add(period)
    if start is not None or end is not None:
        begin = start if start is not None else end
        finish = end if end is not None else start
        assert begin is not None and finish is not None
        if finish < begin:
            begin, finish = finish, begin
        for period, (period_start, period_end) in PERIOD_SPANS.items():
            if finish >= period_start and begin <= period_end:
                found.add(period)
    return [period for period in ("neolithic", "bronze", "classical", "crusader") if period in found]


def matching_curated(name: str, longitude: float, latitude: float, pins: list[CuratedPin]) -> CuratedPin | None:
    """Drop the same place, not a different monument in the same city."""
    folded = _fold(name)
    for pin in pins:
        distance = _haversine_m(longitude, latitude, pin.longitude, pin.latitude)
        if distance <= NEAR_M or (distance <= NAME_MATCH_M and _fold(pin.name) == folded):
            return pin
    return None


def nearest_curated(longitude: float, latitude: float, pins: list[CuratedPin], limit_m: float) -> CuratedPin | None:
    best = None
    best_distance = limit_m
    for pin in pins:
        distance = _haversine_m(longitude, latitude, pin.longitude, pin.latitude)
        if distance < best_distance:
            best = pin
            best_distance = distance
    return best


def write_outputs(snapshot: dict, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    collection = {"type": "FeatureCollection", "features": snapshot["features"]}
    encoded = (json.dumps(collection) + "\n").encode()
    (out_dir / "sites.geojson").write_bytes(encoded)
    meta = {key: snapshot[key] for key in (
        "snapshotDate", "licence", "query", "sourceUrl", "nearMetres", "nameMatchMetres", "wikidataRows", "droppedAsCurated",
    )}
    meta["sitesGeojsonSha256"] = hashlib.sha256(encoded).hexdigest()
    meta["publishedPins"] = len(snapshot["features"])
    meta["undated"] = sum(not feature["properties"]["periods"] for feature in snapshot["features"])
    meta["dropped"] = snapshot["dropped"]
    (out_dir / "snapshot.json").write_text(json.dumps(meta, indent=2) + "\n")


def _bindings(path: Path) -> list[dict]:
    return json.loads(path.read_text())["results"]["bindings"]


def _group(path: Path, field: str) -> dict[str, set[str]]:
    grouped: dict[str, set[str]] = {}
    for row in _bindings(path):
        qid = row["item"]["value"].rsplit("/", 1)[-1]
        grouped.setdefault(qid, set()).add(row[field]["value"])
    return grouped


def _merge_years(features: list[dict], qid: str, row: dict) -> None:
    for feature in features:
        if feature["id"] != qid:
            continue
        start, end = _years(row.get("inception"), row.get("dissolved"))
        props = feature["properties"]
        years = [value for value in (props["startYear"], props["endYear"], start, end) if value is not None]
        if not years:
            return
        props["startYear"] = min(years)
        props["endYear"] = max(years)
        props["periods"] = assign_periods(props["periodLabels"], props["startYear"], props["endYear"])
        return


def _point(value: str) -> tuple[float, float] | None:
    match = re.search(r"Point\(([-\d.]+)\s+([-\d.]+)", value)
    if not match:
        return None
    return float(match.group(1)), float(match.group(2))


def _years(inception, dissolved) -> tuple[int | None, int | None]:
    return _year(inception), _year(dissolved)


def _year(node) -> int | None:
    if not node:
        return None
    matched = re.match(r"([+-]?)(\d+)", node["value"])
    if not matched:
        return None
    year = int(matched.group(2))
    if matched.group(1) == "-":
        year = -year
    return year


def _confidence(row: dict, labels: list[str], start: int | None, heritage: set[str]) -> str:
    dated = bool(labels) or start is not None
    sourced = "enwiki" in row or bool(heritage)
    if dated and sourced:
        return "high"
    if dated or sourced:
        return "medium"
    return "low"


def _value(node) -> str | None:
    if not node:
        return None
    return node["value"]


def _fold(name: str) -> str:
    table = str.maketrans({"ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i"})
    return "".join(ch for ch in name.lower().translate(table) if ch.isalnum())


def _haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    radius = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def snapshot_is_current(meta: dict, today: date | None = None) -> bool:
    return meta.get("snapshotDate") == (today or date.fromisoformat(SNAPSHOT_DATE)).isoformat()
