"""Recall, distance bands, density, and a random baseline.

Recall without the number of candidates per area is not a result. The random
baseline places the same count uniformly in the same rectangle.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

BANDS_M = (250.0, 500.0, 1000.0)


@dataclass(frozen=True)
class Hit:
    site_id: str
    distance_m: float

    @property
    def band(self) -> str:
        for limit in BANDS_M:
            if self.distance_m <= limit:
                return str(int(limit))
        return "miss"


def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    radius = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def nearest_hits(
    sites: list[tuple[str, float, float]],
    candidates: list[tuple[float, float]],
) -> list[Hit]:
    hits: list[Hit] = []
    for site_id, longitude, latitude in sites:
        if not candidates:
            hits.append(Hit(site_id, math.inf))
            continue
        distance = min(haversine_m(longitude, latitude, lon, lat) for lon, lat in candidates)
        hits.append(Hit(site_id, distance))
    return hits


def recall_at(hits: list[Hit], radius_m: float) -> float:
    if not hits:
        return 0.0
    return sum(hit.distance_m <= radius_m for hit in hits) / len(hits)


def density_per_100km2(n_candidates: int, area_km2: float) -> float:
    if area_km2 <= 0:
        raise ValueError("area must be positive")
    return n_candidates * 100.0 / area_km2


def expected_random_recall(n_candidates: int, area_m2: float, radius_m: float) -> float:
    """Probability one interior site is within ``radius_m`` of a random candidate.

    This treats candidates as independent uniform draws and ignores the border,
    so it is slightly high for sites near the edge of the rectangle.
    """
    if n_candidates <= 0 or area_m2 <= 0:
        return 0.0
    disk = math.pi * radius_m * radius_m
    fraction = min(1.0, disk / area_m2)
    return 1.0 - (1.0 - fraction) ** n_candidates


def rectangle_area_m2(west: float, south: float, east: float, north: float) -> float:
    mid_lat = math.radians((south + north) / 2)
    width = (east - west) * 111320.0 * math.cos(mid_lat)
    height = (north - south) * 110540.0
    return abs(width * height)


def monte_carlo_recall(
    sites: list[tuple[float, float]],
    west: float,
    south: float,
    east: float,
    north: float,
    n_candidates: int,
    radius_m: float,
    draws: int = 200,
    seed: int = 11,
) -> float:
    if not sites or n_candidates <= 0:
        return 0.0
    rng = np.random.default_rng(seed)
    recovered = 0
    total = 0
    for _ in range(draws):
        longs = rng.uniform(west, east, n_candidates)
        lats = rng.uniform(south, north, n_candidates)
        for longitude, latitude in sites:
            total += 1
            for index in range(n_candidates):
                if haversine_m(longitude, latitude, float(longs[index]), float(lats[index])) <= radius_m:
                    recovered += 1
                    break
    return recovered / total
