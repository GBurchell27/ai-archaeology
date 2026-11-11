"""Training-free mound detector on a DEM window.

Local relief minus a wide circular mean, then a multi-scale Laplacian of
Gaussian for blobs about 80–600 m across. A peak is kept only if that
residual is about 3–40 m high, the ground is not a cliff, and the blob is
not a long ridge. Nothing here is called a site.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage

from ai_archaeology.relief import local_relief, slope

DIAMETERS_M = (80.0, 140.0, 220.0, 340.0, 500.0, 600.0)


@dataclass(frozen=True)
class DetectorParams:
    relief_radius_m: float
    min_height_m: float
    max_height_m: float
    response_percentile: float
    max_slope_deg: float = 16.0
    max_elongation: float = 2.8


def scale_response(relief: np.ndarray, pixel_m: float) -> tuple[np.ndarray, np.ndarray]:
    """Scale-normalised blob strength and the diameter that won at each cell."""
    response = np.zeros(relief.shape, dtype=np.float32)
    diameter = np.zeros(relief.shape, dtype=np.float32)
    for width_m in DIAMETERS_M:
        sigma = max(0.8, (width_m / 2.0) / (np.sqrt(2.0) * pixel_m))
        # A mound is a bright bump. gaussian_laplace is negative there.
        strength = (-ndimage.gaussian_laplace(relief, sigma) * sigma * sigma).astype(np.float32)
        better = strength > response
        response = np.where(better, strength, response)
        diameter = np.where(better, width_m, diameter)
    return response, diameter


def prepare_surface(dem: np.ndarray, pixel_m: float, relief_radius_m: float) -> dict[str, np.ndarray]:
    relief = local_relief(dem, pixel_m, relief_radius_m).astype(np.float32)
    relief[~np.isfinite(relief)] = 0.0
    response, diameter = scale_response(relief, pixel_m)
    gradient = slope(dem, pixel_m).astype(np.float32)
    gradient[~np.isfinite(gradient)] = 90.0
    return {"relief": relief, "response": response, "diameter": diameter, "slope": gradient}


def find_candidates(
    surface: dict[str, np.ndarray],
    pixel_m: float,
    params: DetectorParams,
    west: float,
    south: float,
    east: float,
    north: float,
) -> list[tuple[float, float, float]]:
    """Return (longitude, latitude, response) for peaks that pass the gates."""
    response = surface["response"]
    radius_px = max(1, int(round(120.0 / pixel_m)))
    peaks = _local_peaks(response, radius_px, 0.0)
    height, width = response.shape
    found: list[tuple[float, float, float]] = []
    for row, column in peaks:
        if not _passes_shape(surface, row, column, params):
            continue
        longitude = west + (column + 0.5) / width * (east - west)
        latitude = north - (row + 0.5) / height * (north - south)
        found.append((longitude, latitude, float(response[row, column])))
    found.sort(key=lambda item: item[2], reverse=True)
    return found


def _local_peaks(response: np.ndarray, radius_px: int, threshold: float) -> list[tuple[int, int]]:
    footprint = np.ones((radius_px * 2 + 1, radius_px * 2 + 1), dtype=bool)
    neighbourhood = ndimage.maximum_filter(response, footprint=footprint)
    mask = (response == neighbourhood) & (response >= threshold)
    rows, columns = np.nonzero(mask)
    return list(zip(rows.tolist(), columns.tolist(), strict=True))


def _passes_shape(surface: dict[str, np.ndarray], row: int, column: int, params: DetectorParams) -> bool:
    relief = float(surface["relief"][row, column])
    if relief < params.min_height_m or relief > params.max_height_m:
        return False
    if float(surface["slope"][row, column]) > params.max_slope_deg:
        return False
    return _elongation(surface["relief"], row, column) <= params.max_elongation


def _elongation(relief: np.ndarray, row: int, column: int) -> float:
    half = 8
    patch = relief[max(0, row - half):row + half + 1, max(0, column - half):column + half + 1]
    level = max(float(relief[row, column]) * 0.45, 1.0)
    ys, xs = np.nonzero(patch >= level)
    if xs.size < 6:
        return 99.0
    cov = np.cov(xs.astype(float), ys.astype(float))
    axes = np.linalg.eigvalsh(cov)
    return float(np.sqrt(axes[-1] / max(axes[0], 1e-6)))
