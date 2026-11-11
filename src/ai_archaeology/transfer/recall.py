"""Recall at fixed radii, plus a random baseline at the same density."""

from __future__ import annotations

import numpy as np


def recall_at_radius(candidate_xy: np.ndarray, site_xy: np.ndarray, radius_m: float) -> float:
    if site_xy.size == 0:
        return 0.0
    hits = 0
    for site in site_xy:
        distance = np.hypot(candidate_xy[:, 0] - site[0], candidate_xy[:, 1] - site[1])
        if candidate_xy.size and np.any(distance <= radius_m):
            hits += 1
    return hits / site_xy.shape[0]


def recall_at_radii(candidate_xy: np.ndarray, site_xy: np.ndarray, radii_m: tuple[float, ...]) -> dict[str, float]:
    return {str(int(radius)): recall_at_radius(candidate_xy, site_xy, radius) for radius in radii_m}


def candidate_count(area_km2: float, density_per_km2: float) -> int:
    if area_km2 <= 0 or density_per_km2 <= 0:
        raise ValueError("area and density must be positive")
    return max(1, int(round(area_km2 * density_per_km2)))


def top_density_indices(scores: np.ndarray, count: int) -> np.ndarray:
    count = min(count, int(scores.size))
    order = np.argsort(scores)[::-1]
    return order[:count]


def random_baseline_recall(
    pool_xy: np.ndarray,
    site_xy: np.ndarray,
    count: int,
    radii_m: tuple[float, ...],
    draws: int,
    seed: int,
) -> dict[str, dict[str, float]]:
    generator = np.random.default_rng(seed)
    totals = {str(int(radius)): [] for radius in radii_m}
    if pool_xy.shape[0] == 0:
        return {key: {"mean": 0.0, "std": 0.0} for key in totals}
    for _draw in range(draws):
        choice = generator.choice(pool_xy.shape[0], size=min(count, pool_xy.shape[0]), replace=False)
        recalls = recall_at_radii(pool_xy[choice], site_xy, radii_m)
        for key, value in recalls.items():
            totals[key].append(value)
    return {
        key: {"mean": float(np.mean(values)), "std": float(np.std(values))}
        for key, values in totals.items()
    }
