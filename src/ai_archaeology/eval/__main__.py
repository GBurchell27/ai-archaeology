"""Run the blind mound recall check. Candidate coordinates go to outputs/eval/."""

from __future__ import annotations

import json
import time
from collections import defaultdict
from pathlib import Path

import numpy as np

from ai_archaeology.eval.catalog import REGIONS, load_catalog, sites_in
from ai_archaeology.eval.cv import candidates_for, leave_one_out, select_params
from ai_archaeology.eval.dem import read_region
from ai_archaeology.eval.detect import prepare_surface
from ai_archaeology.eval.metrics import (
    density_per_100km2,
    expected_random_recall,
    monte_carlo_recall,
    nearest_hits,
    recall_at,
)
from ai_archaeology.eval.report import public_metrics, write_candidates

RADII = (600.0, 1000.0)
METRICS = Path("Anatolia/eval/metrics.json")
TABLE = Path("Anatolia/eval/sites.md")


def main() -> None:
    started = time.perf_counter()
    catalog = load_catalog()
    prepared = {region: _prepare(region, sites_in(catalog, region)) for region in REGIONS}
    region_ids = list(REGIONS)

    def tune(train_ids):
        choice = select_params(prepared, train_ids)
        print(
            f"  tune recall@250 {choice.train_recall_250:.2f} density {choice.train_density:.2f} "
            f"r={choice.params.relief_radius_m:.0f} h>={choice.params.min_height_m:.0f}",
            flush=True,
        )
        return choice.params

    def apply(held, params):
        print(f"score {held}", flush=True)
        region = prepared[held]
        candidates = candidates_for(region, params)
        return held, params, candidates, region

    fold_rows = leave_one_out(region_ids, tune, apply)
    payload, private = _summarize(fold_rows, time.perf_counter() - started)
    METRICS.parent.mkdir(parents=True, exist_ok=True)
    METRICS.write_text(json.dumps(public_metrics(payload), indent=2) + "\n")
    TABLE.write_text(_table(payload["sites"]))
    write_candidates(Path("outputs/eval/candidates.json"), private)
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
    surfaces = {radius: prepare_surface(grid.dem, grid.pixel_m, radius) for radius in RADII}
    return type("Region", (), {"grid": grid, "surfaces": surfaces, "sites": sites})()


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
    for held, params, candidates, region in fold_rows:
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
            "relief_radius_m": params.relief_radius_m,
            "min_height_m": params.min_height_m,
            "response_percentile": params.response_percentile,
        })
    area_m2 = sum(areas)
    payload = {
        "design": {
            "detector": "residual relief and multi-scale LoG, 80–600 m, height 3–40 m, slope and elongation gates; keep the strongest blobs up to the density cap",
            "validation": "leave-one-region-out; thresholds chosen on the other regions only",
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
        "random_recall_250": round(sum(random_parts) / max(len(site_rows), 1), 3),
        "monte_carlo_recall_250": round(_monte_carlo(fold_rows), 3),
        "by_period": {key: _group_recall(value) for key, value in grouped.items()},
        "by_terrain": {key: _group_recall(value) for key, value in terrain_groups.items()},
        "folds": folds,
        "sites": site_rows,
        "runtime_seconds": round(elapsed, 1),
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
    return {
        "n": len(hits),
        "recall_250": round(recall_at(hits, 250), 3),
        "recall_500": round(recall_at(hits, 500), 3),
        "recall_1000": round(recall_at(hits, 1000), 3),
    }


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
    lines = ["| Place | Period | Terrain | Region | Distance band | Recovered at 250 m |", "| --- | --- | --- | --- | --- | --- |"]
    for row in rows:
        recovered = "yes" if row["recovered_250"] else "no"
        lines.append(f"| {row['name']} | {row['period']} | {row['terrain']} | {row['region']} | {row['band']} | {recovered} |")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    main()
