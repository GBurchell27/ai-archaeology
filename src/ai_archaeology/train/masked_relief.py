"""Relief for training. Frozen and held-out cells are not read into the kernels."""

from __future__ import annotations

import numpy as np

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.ingest.relief_stack import build_relief_stack
from ai_archaeology.regions.blocks import BlockGrid


def training_relief_stack(
    elevation: np.ndarray,
    transform,
    resolution_m: float,
    grid: BlockGrid,
    held_out_fold: int | None,
    *,
    radius_m: float,
    multi_directions: int,
    svf_directions: int,
) -> np.ndarray:
    masked = masked_training_elevation(elevation, transform, grid, held_out_fold)
    return build_relief_stack(
        masked,
        resolution_m,
        radius_m=radius_m,
        multi_directions=multi_directions,
        svf_directions=svf_directions,
        propagate_nan=True,
    )


def masked_training_elevation(
    elevation: np.ndarray,
    transform,
    grid: BlockGrid,
    held_out_fold: int | None,
) -> np.ndarray:
    """Copy only pixels the training split is allowed to use."""
    excluded = grid.excluded_pixel_mask(elevation.shape, transform, held_out_fold)
    allowed = ~excluded
    masked = np.full(elevation.shape, np.nan, dtype=np.float64)
    taken = np.asarray(elevation[allowed], dtype=np.float64)
    taken[taken == NODATA] = np.nan
    masked[allowed] = taken
    return masked
