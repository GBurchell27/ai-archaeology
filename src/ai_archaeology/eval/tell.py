"""Tell score for 30 m terrain.

Ordinary hills outrank real tells when the rank is Laplacian strength.
This score prefers a round, flat-topped bump with smooth flanks, standing
on a quiet plain, and away from ridges and rugged ground. Size stays in
the 80–600 m band already measured by the blob scale, and height stays
in the 3–40 m gate. Nothing here is called a site.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage

from ai_archaeology.eval.detect import DetectorParams, _elongation, _local_peaks, prepare_surface
from ai_archaeology.relief import slope

FEATURE_NAMES = (
    "symmetry",
    "flatness",
    "profile",
    "isolation",
    "plain",
    "rugged",
    "elongation",
    "relief",
    "slope",
)


@dataclass(frozen=True)
class TellWeights:
    relief_radius_m: float
    min_height_m: float
    symmetry_exp: float
    flat_exp: float
    isolation_exp: float
    kind: str = "hand"

    def label(self) -> str:
        return (
            f"{self.kind} r={self.relief_radius_m:.0f} h>={self.min_height_m:.0f} "
            f"sym={self.symmetry_exp:.1f} flat={self.flat_exp:.1f} iso={self.isolation_exp:.1f}"
        )


HAND_GRID = tuple(
    TellWeights(radius, height, sym, flat, iso)
    for radius in (600.0, 1000.0)
    for height in (3.0, 8.0)
    for sym in (0.6, 1.2)
    for flat in (0.6, 1.2)
    for iso in (0.5, 1.2)
)


@dataclass
class PeakTable:
    """One row per shape-passing peak. Coordinates are private."""

    longitude: np.ndarray
    latitude: np.ndarray
    features: np.ndarray  # columns follow FEATURE_NAMES

    def __len__(self) -> int:
        return int(self.longitude.shape[0])


def context_rasters(dem: np.ndarray, pixel_m: float) -> dict[str, np.ndarray]:
    gradient = slope(dem, pixel_m).astype(np.float32)
    gradient[~np.isfinite(gradient)] = 90.0
    # A square mean is the regional background. A disk convolution at this
    # radius is the same idea and much slower on a full region.
    elevation = dem.astype(np.float32)
    invalid = ~np.isfinite(elevation)
    wide_px = max(1, int(round(2500.0 / pixel_m)))
    size = wide_px * 2 + 1
    area = float(size * size)
    # Voids stay out of the mean. Treating them as 0 m pulls a plain down toward sea level.
    filled = np.where(invalid, 0.0, elevation)
    total = ndimage.uniform_filter(filled, size=size) * area
    count = ndimage.uniform_filter((~invalid).astype(np.float32), size=size) * area
    background = np.full(elevation.shape, np.nan, dtype=np.float32)
    present = count > 0
    background[present] = total[present] / count[present]
    wide = elevation - background
    wide[invalid] = np.nan
    radius_px = max(1, int(round(2000.0 / pixel_m)))
    size = radius_px * 2 + 1
    regional_slope = ndimage.uniform_filter(gradient, size=size).astype(np.float32)
    rugged = ndimage.uniform_filter((gradient > 12.0).astype(np.float32), size=size).astype(np.float32)
    return {"slope": gradient, "wide": wide, "regional_slope": regional_slope, "rugged": rugged}


def peak_table(
    dem: np.ndarray,
    pixel_m: float,
    relief_radius_m: float,
    west: float,
    south: float,
    east: float,
    north: float,
    context: dict[str, np.ndarray] | None = None,
) -> tuple[PeakTable, dict[str, np.ndarray]]:
    surface = prepare_surface(dem, pixel_m, relief_radius_m)
    shared = context or context_rasters(dem, pixel_m)
    surface.update(shared)
    loose = DetectorParams(relief_radius_m, 3.0, 40.0, 0.0)
    response = surface["response"]
    radius_px = max(1, int(round(120.0 / pixel_m)))
    peaks = _local_peaks(response, radius_px, 0.0)
    rows: list[list[float]] = []
    longs: list[float] = []
    lats: list[float] = []
    height, width = response.shape
    for row, column in peaks:
        relief = float(surface["relief"][row, column])
        ground = float(surface["slope"][row, column])
        if relief < 3.0 or relief > 40.0 or ground > loose.max_slope_deg:
            continue
        elongation = _elongation(surface["relief"], row, column)
        if elongation > loose.max_elongation:
            continue
        features = _features(surface, row, column, pixel_m, elongation)
        rows.append(features)
        longs.append(west + (column + 0.5) / width * (east - west))
        lats.append(north - (row + 0.5) / height * (north - south))
    table = PeakTable(
        np.asarray(longs, dtype=np.float64),
        np.asarray(lats, dtype=np.float64),
        np.asarray(rows, dtype=np.float32).reshape((-1, len(FEATURE_NAMES))),
    )
    return table, surface


def hand_scores(table: PeakTable, weights: TellWeights) -> np.ndarray:
    if len(table) == 0:
        return np.zeros(0, dtype=np.float32)
    index = {name: position for position, name in enumerate(FEATURE_NAMES)}
    symmetry = table.features[:, index["symmetry"]]
    flatness = table.features[:, index["flatness"]]
    profile = table.features[:, index["profile"]]
    isolation = table.features[:, index["isolation"]]
    plain = table.features[:, index["plain"]]
    rugged = table.features[:, index["rugged"]]
    elongation = table.features[:, index["elongation"]]
    relief = table.features[:, index["relief"]]
    ground = table.features[:, index["slope"]]
    score = (
        np.power(np.clip(symmetry, 0.0, 1.0), weights.symmetry_exp)
        * np.power(np.clip(flatness, 0.0, 1.0), weights.flat_exp)
        * np.clip(profile, 0.0, 1.0)
        * np.power(np.clip(isolation, 0.0, 1.0), weights.isolation_exp)
        * np.clip(plain, 0.05, 1.0)
        * (1.0 - 0.85 * np.clip(rugged, 0.0, 1.0))
        / np.maximum(elongation, 1.0)
    )
    score[(relief < weights.min_height_m) | (ground > 16.0) | (elongation > 2.8)] = -1.0
    return score.astype(np.float32)


def fit_ranker(features: np.ndarray, labels: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, float] | None:
    """Balanced logistic weights. Fit only on rows the caller already filtered."""
    if features.size == 0 or int(labels.sum()) < 4 or int((labels == 0).sum()) < 4:
        return None
    mean = features.mean(axis=0)
    scale = features.std(axis=0) + 1e-3
    scaled = (features - mean) / scale
    positive = max(float(labels.sum()), 1.0)
    negative = max(float(len(labels) - labels.sum()), 1.0)
    sample_weight = np.where(labels > 0.5, 0.5 * len(labels) / positive, 0.5 * len(labels) / negative)
    beta = np.zeros(features.shape[1], dtype=np.float64)
    bias = 0.0
    for _ in range(50):
        prediction = 1.0 / (1.0 + np.exp(-np.clip(scaled @ beta + bias, -20.0, 20.0)))
        error = (prediction - labels) * sample_weight
        beta -= 0.4 * scaled.T @ error / len(labels)
        bias -= 0.4 * float(error.mean())
    return mean, scale, beta, bias


def ranker_scores(
    table: PeakTable,
    fitted: tuple[np.ndarray, np.ndarray, np.ndarray, float],
    min_height_m: float,
) -> np.ndarray:
    mean, scale, beta, bias = fitted
    if len(table) == 0:
        return np.zeros(0, dtype=np.float32)
    index = {name: position for position, name in enumerate(FEATURE_NAMES)}
    scaled = (table.features - mean) / scale
    score = scaled @ beta + bias
    relief = table.features[:, index["relief"]]
    ground = table.features[:, index["slope"]]
    elongation = table.features[:, index["elongation"]]
    score[(relief < min_height_m) | (ground > 16.0) | (elongation > 2.8)] = -1e9
    return score.astype(np.float32)


def select_top(table: PeakTable, score: np.ndarray, limit: int) -> list[tuple[float, float]]:
    if len(table) == 0 or limit <= 0:
        return []
    order = np.argsort(score)[::-1]
    chosen: list[tuple[float, float]] = []
    for index in order:
        if score[index] < 0:
            break
        chosen.append((float(table.longitude[index]), float(table.latitude[index])))
        if len(chosen) >= limit:
            break
    return chosen


def _features(surface: dict[str, np.ndarray], row: int, column: int, pixel_m: float, elongation: float) -> list[float]:
    relief = surface["relief"]
    gradient = surface["slope"]
    diameter = float(surface["diameter"][row, column]) or 180.0
    radius_px = int(np.clip(round((diameter / 2.0) / pixel_m), 2, 18))
    patch_relief = _patch(relief, row, column, radius_px)
    patch_slope = _patch(gradient, row, column, radius_px)
    yy, xx = np.ogrid[-radius_px:radius_px + 1, -radius_px:radius_px + 1]
    distance = np.hypot(yy, xx)
    inner = distance <= radius_px * 0.35
    flank = (distance > radius_px * 0.35) & (distance <= radius_px * 0.8)
    outer = (distance > radius_px * 0.8) & (distance <= radius_px + 0.1)
    if not inner.any() or not flank.any():
        inner = distance <= 1.0
        flank = distance > 1.0
    height_inner = _mean(patch_relief, inner)
    height_flank = _mean(patch_relief, flank)
    height_outer = _mean(patch_relief, outer) if outer.any() else float(patch_relief.min())
    drop = height_inner - height_outer
    monotonic = height_inner >= height_flank - 0.4 and height_flank >= height_outer - 0.4
    profile = 0.0 if drop <= 1.0 else float(min(1.0, drop / 8.0) * (1.0 if monotonic else 0.3))
    inner_slope = _mean(patch_slope, inner)
    flank_slope = _mean(patch_slope, flank)
    flat = float(np.exp(-inner_slope / 3.5))
    flanks = 1.0 if flank_slope > inner_slope + 0.4 and flank_slope < 15.0 else 0.35
    flatness = float(np.clip(flat * flanks, 0.0, 1.0))
    symmetry = _symmetry(patch_relief, distance, radius_px)
    local = max(float(relief[row, column]), 0.0)
    wide = abs(float(surface["wide"][row, column]))
    isolation = float(local / (wide + local + 1.0))
    plain = float(np.exp(-float(surface["regional_slope"][row, column]) / 3.5))
    rugged = float(np.clip(surface["rugged"][row, column], 0.0, 1.0))
    return [symmetry, flatness, profile, isolation, plain, rugged, float(elongation), local, float(gradient[row, column])]


def _symmetry(patch: np.ndarray, distance: np.ndarray, radius_px: int) -> float:
    yy, xx = np.ogrid[-radius_px:radius_px + 1, -radius_px:radius_px + 1]
    angle = np.arctan2(yy, xx)
    ring = (distance > radius_px * 0.35) & (distance <= radius_px)
    sectors = []
    for step in range(8):
        start = -np.pi + step * (2 * np.pi / 8)
        mask = ring & (angle >= start) & (angle < start + 2 * np.pi / 8)
        if mask.any():
            sectors.append(float(patch[mask].mean()))
    if len(sectors) < 4:
        return 0.2
    values = np.asarray(sectors)
    return float(np.clip(1.0 - values.std() / (abs(values.mean()) + 1.0), 0.0, 1.0))


def _patch(array: np.ndarray, row: int, column: int, radius_px: int) -> np.ndarray:
    height, width = array.shape
    window = np.zeros((radius_px * 2 + 1, radius_px * 2 + 1), dtype=np.float32)
    row0, row1 = max(0, row - radius_px), min(height, row + radius_px + 1)
    col0, col1 = max(0, column - radius_px), min(width, column + radius_px + 1)
    dest_r0 = row0 - (row - radius_px)
    dest_c0 = col0 - (column - radius_px)
    window[dest_r0:dest_r0 + (row1 - row0), dest_c0:dest_c0 + (col1 - col0)] = array[row0:row1, col0:col1]
    return window


def _mean(patch: np.ndarray, mask: np.ndarray) -> float:
    if not mask.any():
        return 0.0
    return float(patch[mask].mean())
