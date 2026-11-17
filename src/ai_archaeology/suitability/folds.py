"""Spatial hold-out groups: 5 degree blocks and macro-regions.

Neighbouring cells look alike, so a random split would flatter the model. Whole blocks are
held out together instead.
"""

from __future__ import annotations

import numpy as np

from ai_archaeology.suitability.grid import CELL_DEGREES, N_COLS, cell_centre

BLOCK_DEGREES = 5
CELLS_PER_BLOCK = int(BLOCK_DEGREES / CELL_DEGREES)
BLOCKS_PER_ROW = N_COLS // CELLS_PER_BLOCK
# Coarse longitude/latitude boxes, only good enough to ask "does it transfer between continents".
MACRO_REGIONS = ("Americas", "Europe and Anatolia", "Africa and Near East", "Asia", "Oceania")


def block_ids(rows: np.ndarray, cols: np.ndarray) -> np.ndarray:
    return (np.asarray(rows) // CELLS_PER_BLOCK) * BLOCKS_PER_ROW + np.asarray(cols) // CELLS_PER_BLOCK


def block_folds(rows: np.ndarray, cols: np.ndarray, n_folds: int = 5, seed: int = 0) -> np.ndarray:
    """Fold index per cell. Every cell of a block lands in the same fold."""
    blocks, block_of_cell = np.unique(block_ids(rows, cols), return_inverse=True)
    fold_of_block = np.random.default_rng(seed).permutation(len(blocks)) % n_folds
    return fold_of_block[block_of_cell]


def macro_region(rows: np.ndarray, cols: np.ndarray) -> np.ndarray:
    """Index into ``MACRO_REGIONS`` per cell."""
    lon, lat = cell_centre(rows, cols)
    old_world_west = (lon >= -30) & (lon < 60)
    return np.select(
        [lon < -30, old_world_west & (lat >= 36), old_world_west, (lon >= 110) & (lat < -10)],
        [0, 1, 2, 4],
        default=3,
    )
