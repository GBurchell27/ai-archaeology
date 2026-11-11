"""Leave-one-region-out. Tuning sees only the training regions' labels."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ai_archaeology.eval.detect import DetectorParams, find_candidates
from ai_archaeology.eval.tell import (
    HAND_GRID,
    TellWeights,
    fit_ranker,
    hand_scores,
    ranker_scores,
    select_top,
)

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


@dataclass(frozen=True)
class TellChoice:
    weights: TellWeights
    fitted: tuple | None
    train_recall_250: float
    train_density: float


def select_tell(prepared: dict, train_ids: list[str]) -> TellChoice:
    """Pick a tell score using only ``train_ids``. The held-out region is absent."""
    settings = list(HAND_GRID) + [
        TellWeights(radius, height, 1.0, 1.0, 1.0, kind="ranker")
        for radius in (600.0, 1000.0)
        for height in (3.0, 8.0)
    ]
    ranked: list[TellChoice] = []
    for weights in settings:
        recalls = []
        densities = []
        for held in train_ids:
            fit_ids = [region for region in train_ids if region != held]
            candidates = _apply_weights(prepared, held, weights, fit_ids)
            recalls.append(_recall(prepared[held], candidates))
            densities.append(_density(prepared[held], candidates))
        ranked.append(TellChoice(weights, None, _mean(recalls), _mean(densities)))
    allowed = [choice for choice in ranked if choice.train_density <= DENSITY_CAP]
    best = max(allowed or ranked, key=lambda choice: (choice.train_recall_250, -choice.train_density))
    fitted = None
    if best.weights.kind == "ranker":
        fitted = _fit_training(prepared, train_ids, best.weights)
        if fitted is None:
            hand = [choice for choice in ranked if choice.weights.kind == "hand"]
            best = max(hand, key=lambda choice: (choice.train_recall_250, -choice.train_density))
    return TellChoice(best.weights, fitted, best.train_recall_250, best.train_density)


def candidates_tell(prepared: dict, region_id: str, choice: TellChoice) -> list[tuple[float, float]]:
    fit_ids = []
    return _apply_weights(prepared, region_id, choice.weights, fit_ids, fitted=choice.fitted)


def _apply_weights(prepared, region_id, weights: TellWeights, fit_ids: list[str], fitted=None):
    region = prepared[region_id]
    table = region.tables[weights.relief_radius_m]
    if weights.kind == "ranker":
        model = fitted if fitted is not None else _fit_training(prepared, fit_ids, weights)
        if model is None:
            score = hand_scores(table, TellWeights(
                weights.relief_radius_m, weights.min_height_m, 1.0, 1.0, 1.0,
            ))
        else:
            score = ranker_scores(table, model, weights.min_height_m)
    else:
        score = hand_scores(table, weights)
    area_km2 = region.grid.area_m2 / 1_000_000.0
    limit = max(1, int(DENSITY_CAP / 100.0 * area_km2))
    return select_top(table, score, limit)


def _fit_training(prepared, train_ids: list[str], weights: TellWeights):
    blocks = []
    labels = []
    for region_id in train_ids:
        table = prepared[region_id].tables[weights.relief_radius_m]
        if len(table) == 0:
            continue
        blocks.append(table.features)
        labels.append(_mound_labels(table, prepared[region_id].sites))
    if not blocks:
        return None
    return fit_ranker(np.vstack(blocks), np.concatenate(labels))


def _mound_labels(table, sites) -> np.ndarray:
    mounds = [(site.longitude, site.latitude) for site in sites if site.terrain == "mound"]
    labels = np.zeros(len(table), dtype=np.float64)
    if not mounds or len(table) == 0:
        return labels
    mound_lon = np.array([item[0] for item in mounds])
    mound_lat = np.array([item[1] for item in mounds])
    # Equirectangular metres, accurate enough at 250 m inside one region.
    lat_scale = 110540.0
    lon_scale = 111320.0 * np.cos(np.radians(table.latitude))
    dlon = (table.longitude[:, None] - mound_lon[None, :]) * lon_scale[:, None]
    dlat = (table.latitude[:, None] - mound_lat[None, :]) * lat_scale
    nearest = np.hypot(dlon, dlat).min(axis=1)
    labels[nearest <= 250.0] = 1.0
    return labels


def _density(region, candidates: list[tuple[float, float]]) -> float:
    area_km2 = region.grid.area_m2 / 1_000_000.0
    return len(candidates) * 100.0 / area_km2
