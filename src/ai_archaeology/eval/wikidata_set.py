"""Score the Wikidata snapshot with candidates already chosen for the curated folds.

The candidates are not refit. Wikidata labels are not used to tune anything.
A published place is counted once, in the smallest regional window that contains it.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from ai_archaeology.eval.metrics import nearest_hits, recall_at, recall_count, wilson_interval

CANDIDATES = Path("outputs/eval/candidates.json")
SITES = Path("Anatolia/atlas/public/wikidata/sites.geojson")
CACHE = Path("outputs/eval/cache")
OUT = Path("Anatolia/eval/wikidata-recall.json")
MOUND_TYPES = {"tell", "mound", "tumulus", "höyük", "hoyuk"}


def main() -> None:
    if not CANDIDATES.exists():
        raise SystemExit(f"missing {CANDIDATES}; run the tell eval first")
    payload = score(CANDIDATES, SITES, CACHE)
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({key: payload[key] for key in ("n_inside_windows", "n_outside_windows", "recall_250", "recall_500", "recall_1000")}, indent=2))


def score(candidates_path: Path, sites_path: Path, cache: Path) -> dict:
    candidates = json.loads(candidates_path.read_text())
    by_region: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for row in candidates:
        by_region[row["region"]].append((row["longitude"], row["latitude"]))
    windows = []
    for path in sorted(cache.glob("*.npz")):
        if path.name.endswith("-tell.npz"):
            continue
        stored = np.load(path)
        windows.append({
            "region": path.stem,
            "west": float(stored["west"]),
            "south": float(stored["south"]),
            "east": float(stored["east"]),
            "north": float(stored["north"]),
            "area": abs((float(stored["east"]) - float(stored["west"])) * (float(stored["north"]) - float(stored["south"]))),
        })
    features = json.loads(sites_path.read_text())["features"]
    assigned = []
    outside = 0
    for feature in features:
        longitude, latitude = feature["geometry"]["coordinates"]
        containers = [window for window in windows if _inside(window, longitude, latitude)]
        if not containers:
            outside += 1
            continue
        window = min(containers, key=lambda item: item["area"])
        assigned.append((feature, window["region"], longitude, latitude))
    grouped: dict[str, list] = defaultdict(list)
    rows = []
    period_hits = defaultdict(list)
    mound_hits = []
    other_hits = []
    for feature, region, longitude, latitude in assigned:
        hit = nearest_hits([(feature["id"], longitude, latitude)], by_region.get(region, []))[0]
        props = feature["properties"]
        periods = props["periods"] or ["undated"]
        mound = any(kind.lower() in MOUND_TYPES for kind in props["types"])
        rows.append({
            "qid": props["qid"],
            "name": props["name"],
            "region": region,
            "periods": periods,
            "mound_like": mound,
            "band": hit.band,
            "recovered_250": hit.band == "250",
        })
        grouped[region].append(hit)
        (mound_hits if mound else other_hits).append(hit)
        for period in periods:
            period_hits[period].append(hit)
    all_hits = [hit for hits in grouped.values() for hit in hits]
    return {
        "design": "Wikidata pins scored against the curated leave-one-region-out candidates. Labels were not used for tuning.",
        "snapshot": "Anatolia/atlas/public/wikidata/snapshot.json",
        "n_published_pins": len(features),
        "n_inside_windows": len(assigned),
        "n_outside_windows": outside,
        "recall_250": _rate(all_hits, 250),
        "recall_500": _rate(all_hits, 500),
        "recall_1000": _rate(all_hits, 1000),
        "recall_250_count": recall_count(all_hits, 250),
        "recall_500_count": recall_count(all_hits, 500),
        "recall_1000_count": recall_count(all_hits, 1000),
        "recall_250_ci95": [round(v, 3) for v in wilson_interval(recall_count(all_hits, 250), len(all_hits))],
        "by_period": {key: _group(value) for key, value in period_hits.items()},
        "mound_like": _group(mound_hits),
        "other": _group(other_hits),
        "sites": rows,
        "note": "A hit is a candidate within the distance. It is not a discovery. Places outside the regional DEM windows are not scored.",
    }


def _inside(window: dict, longitude: float, latitude: float) -> bool:
    return window["west"] <= longitude <= window["east"] and window["south"] <= latitude <= window["north"]


def _rate(hits, radius: float) -> float:
    return round(recall_at(hits, radius), 3)


def _group(hits) -> dict:
    count = recall_count(hits, 250)
    low, high = wilson_interval(count, len(hits))
    return {
        "n": len(hits),
        "recall_250": _rate(hits, 250),
        "recall_500": _rate(hits, 500),
        "recall_1000": _rate(hits, 1000),
        "recall_250_count": count,
        "recall_250_ci95": [round(low, 3), round(high, 3)],
    }


if __name__ == "__main__":
    main()
