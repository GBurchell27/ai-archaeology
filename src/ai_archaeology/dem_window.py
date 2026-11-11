"""Clean a DEM window before it is draped on a mesh.

Copernicus tiles store voids as -32767. A bilinear warp smears that sentinel,
and a missing edge sample is sometimes left as 0. Neither value is an elevation.
"""

from __future__ import annotations

import numpy as np
from scipy.ndimage import distance_transform_edt, median_filter

VOID_BELOW = -100.0
VOID_ABOVE = 5500.0
SPIKE_METRES = 160.0
EDGE_CELLS = 2


def clean_elevation_window(grid: np.ndarray) -> np.ndarray:
    values = np.array(grid, dtype=np.float32, copy=True)
    values[void_mask(values)] = np.nan
    if not np.isfinite(values).any():
        raise ValueError("elevation window has no finite samples")
    filled = fill_voids(values)
    despiked = replace_spikes(filled)
    return clip_edge_outliers(despiked)


def void_mask(values: np.ndarray) -> np.ndarray:
    return ~np.isfinite(values) | (values < VOID_BELOW) | (values > VOID_ABOVE)


def fill_voids(values: np.ndarray) -> np.ndarray:
    missing = ~np.isfinite(values)
    if not bool(missing.any()):
        return values
    nearest = distance_transform_edt(missing, return_distances=False, return_indices=True)
    filled = values.copy()
    filled[missing] = values[tuple(nearest[:, missing])]
    return filled


def replace_spikes(values: np.ndarray) -> np.ndarray:
    smooth = median_filter(values, size=3)
    spikes = np.abs(values - smooth) > SPIKE_METRES
    cleaned = values.copy()
    cleaned[spikes] = smooth[spikes]
    return cleaned


def clip_edge_outliers(values: np.ndarray) -> np.ndarray:
    cleaned = values.copy()
    height, width = cleaned.shape
    if height <= EDGE_CELLS * 2 + 1 or width <= EDGE_CELLS * 2 + 1:
        return cleaned
    for row in range(height):
        for column in range(width):
            if not _on_edge(row, column, height, width):
                continue
            anchor = _inward_median(cleaned, row, column)
            if abs(float(cleaned[row, column]) - anchor) > SPIKE_METRES:
                cleaned[row, column] = anchor
    return cleaned


def _on_edge(row: int, column: int, height: int, width: int) -> bool:
    return (
        row < EDGE_CELLS
        or column < EDGE_CELLS
        or row >= height - EDGE_CELLS
        or column >= width - EDGE_CELLS
    )


def _inward_median(values: np.ndarray, row: int, column: int) -> float:
    height, width = values.shape
    row_anchor = min(max(row, EDGE_CELLS), height - EDGE_CELLS - 1)
    column_anchor = min(max(column, EDGE_CELLS), width - EDGE_CELLS - 1)
    window = values[row_anchor - 1:row_anchor + 2, column_anchor - 1:column_anchor + 2]
    return float(np.median(window))
