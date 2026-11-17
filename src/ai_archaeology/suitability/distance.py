"""Great-circle distance from cells to the nearest cell of a mask."""

from __future__ import annotations

import numpy as np
from scipy.spatial import cKDTree

from ai_archaeology.suitability.grid import cell_centre

EARTH_RADIUS_KM = 6371.0


def unit_sphere_xyz(rows: np.ndarray, cols: np.ndarray) -> np.ndarray:
    lon, lat = (np.radians(angle) for angle in cell_centre(rows, cols))
    return np.column_stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])


def distance_km(target_mask: np.ndarray, query_mask: np.ndarray) -> np.ndarray:
    """Distance from each ``query_mask`` cell centre to the nearest ``target_mask`` cell centre.

    Cells outside ``query_mask`` are NaN.
    """
    tree = cKDTree(unit_sphere_xyz(*np.nonzero(target_mask)))
    chord, _ = tree.query(unit_sphere_xyz(*np.nonzero(query_mask)))
    distances = np.full(target_mask.shape, np.nan, dtype=np.float32)
    distances[query_mask] = 2.0 * EARTH_RADIUS_KM * np.arcsin(np.clip(chord / 2.0, 0.0, 1.0))
    return distances
