"""Run the blind mound recall check. Candidate coordinates go to outputs/eval/."""

from __future__ import annotations

import json
import time
from collections import defaultdict
from pathlib import Path

import numpy as np

from ai_archaeology.eval.catalog import REGIONS, load_catalog, sites_in
from ai_archaeology.eval.cv import TellChoice, candidates_tell, leave_one_out, select_tell
from ai_archaeology.eval.dem import RegionGrid, read_region
from ai_archaeology.eval.metrics import (
    density_per_100km2,
    expected_random_recall,
    monte_carlo_recall,
    nearest_hits,
    recall_at,
    recall_count,
    wilson_interval,
)
from ai_archaeology.eval.tell import context_rasters, peak_table
from ai_archaeology.eval.report import public_metrics, write_candidates

RADII = (600.0, 1000.0)
METRICS = Path("Anatolia/eval/metrics.json")
BASELINE = Path("Anatolia/eval/baseline.json")
TABLE = Path("Anatolia/eval/sites.md")


def main() -> None:
    started = time.perf_counter()
    catalog = load_catalog()
    prepared = {region: _prepare(region, sites_in(catalog, region)) for region in REGIONS}
    region_ids = list(REGIONS)

    def tune(train_ids):
        choice = select_tell(prepared, train_ids)
        print(
            f"  tune recall@250 {choice.train_recall_250:.2f} density {choice.train_density:.2f} "
            f"{choice.weights.label()}",
            flush=True,
        )
        return choice

    def apply(held, choice: TellChoice):
        print(f"score {held}", flush=True)
        region = prepared[held]
        candidates = candidates_tell(prepared, held, choice)
        return held, choice, candidates, region

    fold_rows = leave_one_out(region_ids, tune, apply)
    payload, private = _summarize(fold_rows, time.perf_counter() - started)
    METRICS.parent.mkdir(parents=True, exist_ok=True)
    METRICS.write_text(json.dumps(public_metrics(payload), indent=2) + "\n")
    TABLE.write_text(_table(payload["sites"]))
    write_candidates(Path("outputs/eval/candidates.json"), private)
    from ai_archaeology.eval.figures import write_tell_figures
    recovered = {row["id"]: row["recovered_250"] for row in payload["sites"]}
    write_tell_figures(catalog, prepared, recovered, Path("Anatolia/eval/figures"))
    print(json.dumps({key: payload[key] for key in ("recall_250", "recall_500", "recall_1000", "random_recall_250", "density_per_100km2", "n_candidates", "runtime_seconds")}, indent=2))


def _prepare(region: str, sites):
    print(f"read {region} ({len(sites)} sites)", flush=True)
    cache = Path("outputs/eval/cache") / f"{region}.npz"
    if cache.exists():
        stored = np.load(cache)
        from ai_archaeology.eval.dem import RegionGrid
        grid = RegionGrid(
            region,
            stored["dem"],
            float(stored["pixel_m"]),
            float(stored["west"]),
            float(stored["south"]),
            float(stored["east"]),
            float(stored["north"]),
        )
        print(f"  cached {grid.dem.shape}", flush=True)
    else:
        grid = read_region(region, sites)
        cache.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            cache, dem=grid.dem, pixel_m=grid.pixel_m,
            west=grid.west, south=grid.south, east=grid.east, north=grid.north,
        )
    shared = context_rasters(grid.dem, grid.pixel_m)
    tables = {}
    for radius in RADII:
        print(f"  peaks r={radius:.0f}", flush=True)
        tables[radius], _surface = peak_table(
            grid.dem, grid.pixel_m, radius,
            grid.west, grid.south, grid.east, grid.north,
            context=shared,
        )
        print(f"    {len(tables[radius])} peaks", flush=True)
    return type("Region", (), {"grid": grid, "tables": tables, "sites": sites, "dem": grid.dem})()


def _summarize(fold_rows, elapsed: float) -> tuple[dict, list[dict]]:
    all_hits = _all_hits(fold_rows)
    site_rows = []
    grouped = defaultdict(list)
    terrain_groups = defaultdict(list)
    folds = []
    areas = []
    n_candidates = 0
    random_parts = []
    private_rows = []
    for held, choice, candidates, region in fold_rows:
        sites = [(site.id, site.longitude, site.latitude) for site in region.sites]
        found = {hit.site_id: hit for hit in nearest_hits(sites, candidates)}
        for site in region.sites:
            hit = found[site.id]
            site_rows.append({
                "id": site.id,
                "name": site.name,
                "period": site.layer,
                "terrain": site.terrain,
                "region": site.region,
                "band": hit.band,
                "recovered_250": hit.band == "250",
                "source": site.source,
            })
            grouped[site.layer].append(hit)
            terrain_groups[site.terrain].append(hit)
        for longitude, latitude in candidates:
            private_rows.append({"region": held, "longitude": longitude, "latitude": latitude})
        n_candidates += len(candidates)
        areas.append(region.grid.area_m2)
        random_parts.append(expected_random_recall(len(candidates), region.grid.area_m2, 250.0) * len(region.sites))
        folds.append({
            "region": held,
            "n_sites": len(region.sites),
            "n_candidates": len(candidates),
            "pixel_m": round(region.grid.pixel_m, 1),
            "score": choice.weights.label(),
            "kind": choice.weights.kind,
            "relief_radius_m": choice.weights.relief_radius_m,
            "min_height_m": choice.weights.min_height_m,
        })
    area_m2 = sum(areas)
    payload = {
        "design": {
            "detector": (
                "tell score on the same 80–600 m blobs: radial symmetry, flat top with steeper flanks, "
                "isolation from regional relief, low surrounding slope, and penalties for rugged ground and elongation. "
                "A hand-weight grid and a small logistic ranker compete inside each training fold. "
                "The strongest scores are kept up to the density cap"
            ),
            "validation": "leave-one-region-out; the score is chosen on the other regions only, with an inner holdout so the outer region is never a label",
            "baseline": "LoG strength ranking from the committed run, same density cap",
            "density_cap_per_100km2": 15,
            "recovery_m": [250, 500, 1000],
        },
        "n_sites": len(site_rows),
        "n_candidates": n_candidates,
        "area_km2": round(area_m2 / 1_000_000, 1),
        "density_per_100km2": round(density_per_100km2(n_candidates, area_m2 / 1_000_000), 2),
        "recall_250": round(recall_at(all_hits, 250), 3),
        "recall_500": round(recall_at(all_hits, 500), 3),
        "recall_1000": round(recall_at(all_hits, 1000), 3),
        "recall_250_count": recall_count(all_hits, 250),
        "recall_500_count": recall_count(all_hits, 500),
        "recall_1000_count": recall_count(all_hits, 1000),
        "recall_250_ci95": [round(v, 3) for v in wilson_interval(recall_count(all_hits, 250), len(all_hits))],
        "recall_500_ci95": [round(v, 3) for v in wilson_interval(recall_count(all_hits, 500), len(all_hits))],
        "recall_1000_ci95": [round(v, 3) for v in wilson_interval(recall_count(all_hits, 1000), len(all_hits))],
        "random_recall_250": round(sum(random_parts) / max(len(site_rows), 1), 3),
        "monte_carlo_recall_250": round(_monte_carlo(fold_rows), 3),
        "by_period": {key: _group_recall(value) for key, value in grouped.items()},
        "by_terrain": {key: _group_recall(value) for key, value in terrain_groups.items()},
        "folds": folds,
        "sites": site_rows,
        "runtime_seconds": round(elapsed, 1),
        "comparison": _comparison(payload_stub(all_hits, site_rows, grouped, terrain_groups, random_parts, n_candidates, area_m2)),
        "note": "A recovered pin is a candidate within the distance band. It is not a discovery. Buried and urban places are not expected to appear as 3–40 m mounds.",
    }
    return payload, private_rows


def _all_hits(fold_rows):
    hits = []
    for _held, _params, candidates, region in fold_rows:
        sites = [(site.id, site.longitude, site.latitude) for site in region.sites]
        hits.extend(nearest_hits(sites, candidates))
    return hits


def _group_recall(hits) -> dict:
    row = {"n": len(hits)}
    for radius, key in ((250, "recall_250"), (500, "recall_500"), (1000, "recall_1000")):
        count = recall_count(hits, radius)
        low, high = wilson_interval(count, len(hits))
        row[key] = round(count / len(hits), 3) if hits else 0.0
        row[f"{key}_count"] = count
        row[f"{key}_ci95"] = [round(low, 3), round(high, 3)]
    return row


def _monte_carlo(fold_rows) -> float:
    recovered = 0
    total = 0
    for _held, _params, candidates, region in fold_rows:
        grid = region.grid
        value = monte_carlo_recall(
            [(site.longitude, site.latitude) for site in region.sites],
            grid.west, grid.south, grid.east, grid.north,
            len(candidates), 250.0, draws=40,
        )
        recovered += value * len(region.sites)
        total += len(region.sites)
    return recovered / max(total, 1)


def _table(rows: list[dict]) -> str:
    baseline = _baseline_sites()
    lines = [
        "| Place | Period | Terrain | Region | Tell band | Tell at 250 m | LoG at 250 m |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        previous = "yes" if baseline.get(row["id"]) else "no"
        recovered = "yes" if row["recovered_250"] else "no"
        lines.append(
            f"| {row['name']} | {row['period']} | {row['terrain']} | {row['region']} | {row['band']} | {recovered} | {previous} |"
        )
    return "\n".join(lines) + "\n"


def _baseline_sites() -> dict[str, bool]:
    if not BASELINE.exists():
        return {}
    payload = json.loads(BASELINE.read_text())
    return {row["id"]: bool(row.get("recovered_250")) for row in payload.get("sites", [])}


def payload_stub(all_hits, site_rows, grouped, terrain_groups, random_parts, n_candidates, area_m2) -> dict:
    return {
        "n_sites": len(site_rows),
        "n_candidates": n_candidates,
        "density_per_100km2": round(density_per_100km2(n_candidates, area_m2 / 1_000_000), 2),
        "recall_250": round(recall_at(all_hits, 250), 3),
        "recall_500": round(recall_at(all_hits, 500), 3),
        "recall_1000": round(recall_at(all_hits, 1000), 3),
        "random_recall_250": round(sum(random_parts) / max(len(site_rows), 1), 3),
        "by_period": {key: _group_recall(value) for key, value in grouped.items()},
        "by_terrain": {key: _group_recall(value) for key, value in terrain_groups.items()},
    }


def _comparison(current: dict) -> dict:
    if not BASELINE.exists():
        return {"tell": current}
    before = json.loads(BASELINE.read_text())
    return {"log_strength": _baseline_summary(before), "tell_score": current}


def _baseline_summary(before: dict) -> dict:
    summary = {
        "n_sites": before["n_sites"],
        "n_candidates": before["n_candidates"],
        "density_per_100km2": before["density_per_100km2"],
        "recall_250": before["recall_250"],
        "recall_500": before["recall_500"],
        "recall_1000": before["recall_1000"],
        "random_recall_250": before["random_recall_250"],
        "by_period": {},
        "by_terrain": {},
    }
    for group_name in ("by_period", "by_terrain"):
        for key, row in before[group_name].items():
            enriched = dict(row)
            for radius, field in ((250, "recall_250"), (500, "recall_500"), (1000, "recall_1000")):
                count = int(round(row[field] * row["n"]))
                low, high = wilson_interval(count, row["n"])
                enriched[f"{field}_count"] = count
                enriched[f"{field}_ci95"] = [round(low, 3), round(high, 3)]
            summary[group_name][key] = enriched
    for field, count_field in (("recall_250", None),):
        count = int(round(before["recall_250"] * before["n_sites"]))
        low, high = wilson_interval(count, before["n_sites"])
        summary["recall_250_count"] = count
        summary["recall_250_ci95"] = [round(low, 3), round(high, 3)]
        count500 = int(round(before["recall_500"] * before["n_sites"]))
        count1000 = int(round(before["recall_1000"] * before["n_sites"]))
        summary["recall_500_ci95"] = [round(v, 3) for v in wilson_interval(count500, before["n_sites"])]
        summary["recall_1000_ci95"] = [round(v, 3) for v in wilson_interval(count1000, before["n_sites"])]
    return summary


if __name__ == "__main__":
    main()
