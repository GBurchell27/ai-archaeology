"""The 0.25 degree global cell grid. Row 0 touches 90N, column 0 touches 180W."""

from __future__ import annotations

import numpy as np

CELL_DEGREES = 0.25
N_ROWS = 720
N_COLS = 1440
SHAPE = (N_ROWS, N_COLS)
# shortcut: cells that are mostly sea or below sea level (polders, Caspian shore) count as ocean;
# switch to a real coastline mask if those places matter.
MIN_LAND_FRACTION = 0.25


def cell_of(lon, lat) -> tuple[np.ndarray, np.ndarray]:
    """Row and column of each point. 180E wraps to column 0; 90S joins the last row."""
    cols = np.floor((np.asarray(lon, dtype=float) + 180.0) / CELL_DEGREES).astype(int) % N_COLS
    rows = np.floor((90.0 - np.asarray(lat, dtype=float)) / CELL_DEGREES).astype(int)
    return np.clip(rows, 0, N_ROWS - 1), cols


def cell_centre(rows, cols) -> tuple[np.ndarray, np.ndarray]:
    lon = -180.0 + (np.asarray(cols) + 0.5) * CELL_DEGREES
    lat = 90.0 - (np.asarray(rows) + 0.5) * CELL_DEGREES
    return lon, lat


def latitude_grid() -> np.ndarray:
    _, lat = cell_centre(np.arange(N_ROWS), 0)
    return np.repeat(lat[:, None], N_COLS, axis=1)


def area_weights() -> np.ndarray:
    """Relative cell area: a 0.25 degree cell shrinks with the cosine of latitude."""
    return np.cos(np.radians(latitude_grid()))


def land_mask(land_fraction: np.ndarray) -> np.ndarray:
    """Cells where enough fine heights sit above sea level."""
    return land_fraction >= MIN_LAND_FRACTION
