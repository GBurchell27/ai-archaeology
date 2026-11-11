"""Leave-one-region-out. Tuning sees only the training regions' labels."""

from __future__ import annotations

from dataclasses import dataclass

from ai_archaeology.eval.detect import DetectorParams, find_candidates

DENSITY_CAP = 15.0
PARAM_GRID = tuple(
    DetectorParams(relief_radius_m=radius, min_height_m=height, max_height_m=40.0, response_percentile=0.0)
    for radius in (600.0, 1000.0)
    for height in (3.0, 8.0)
)


@dataclass(frozen=True)
class Choice:
    params: DetectorParams
    train_recall_250: float
    train_density: float


def leave_one_out(region_ids: list[str], tune, apply) -> list:
    """``tune`` receives the other region ids. ``apply`` scores the held-out region."""
    reports = []
    for held in region_ids:
        train_ids = [region for region in region_ids if region != held]
        params = tune(train_ids)
        reports.append(apply(held, params))
    return reports


def select_params(prepared: dict, train_ids: list[str]) -> Choice:
    ranked: list[Choice] = []
    for params in PARAM_GRID:
        recalls = []
        densities = []
        for region_id in train_ids:
            region = prepared[region_id]
            candidates = candidates_for(region, params)
            recalls.append(_recall(region, candidates))
            densities.append(len(candidates) * 100.0 / (region.grid.area_m2 / 1_000_000.0))
        choice = Choice(params, _mean(recalls), _mean(densities))
        ranked.append(choice)
    allowed = [choice for choice in ranked if choice.train_density <= DENSITY_CAP]
    pool = allowed or ranked
    return max(pool, key=lambda choice: (choice.train_recall_250, -choice.train_density))


def candidates_for(region, params: DetectorParams) -> list[tuple[float, float]]:
    surface = region.surfaces[params.relief_radius_m]
    peaks = find_candidates(
        surface,
        region.grid.pixel_m,
        params,
        region.grid.west,
        region.grid.south,
        region.grid.east,
        region.grid.north,
    )
    area_km2 = region.grid.area_m2 / 1_000_000.0
    limit = max(1, int(DENSITY_CAP / 100.0 * area_km2))
    return [(longitude, latitude) for longitude, latitude, _strength in peaks[:limit]]


def _recall(region, candidates: list[tuple[float, float]]) -> float:
    from ai_archaeology.eval.metrics import nearest_hits, recall_at

    sites = [(site.id, site.longitude, site.latitude) for site in region.sites]
    return recall_at(nearest_hits(sites, candidates), 250.0)


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)
