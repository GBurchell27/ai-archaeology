"""Reduce a fine global raster to 0.25 degree cells."""

from __future__ import annotations

import warnings

import numpy as np

from ai_archaeology.relief import slope

METRES_PER_DEGREE = 111_320.0


def block_reduce(fine: np.ndarray, factor: int, reducer) -> np.ndarray:
    """Apply ``reducer`` (for example ``np.nanmean``) to each factor x factor block."""
    rows, cols = fine.shape[0] // factor, fine.shape[1] // factor
    blocks = fine.reshape(rows, factor, cols, factor).swapaxes(1, 2)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN blocks are ocean cells
        return reducer(blocks.reshape(rows, cols, factor * factor), axis=2)


def slope_degrees_geographic(heights: np.ndarray, north_latitude: float, pixel_degrees: float) -> np.ndarray:
    """Slope of a north-up lon/lat height grid, one latitude row band at a time.

    A degree of longitude shrinks with latitude, so each band gets its own east-west spacing.
    """
    band_rows = max(1, int(round(1.0 / pixel_degrees)))
    north_south_m = pixel_degrees * METRES_PER_DEGREE
    result = np.empty(heights.shape, dtype=np.float32)
    for start in range(0, heights.shape[0], band_rows):
        stop = min(start + band_rows, heights.shape[0])
        halo_start, halo_stop = max(start - 1, 0), min(stop + 1, heights.shape[0])
        latitude = north_latitude - (start + stop) / 2.0 * pixel_degrees
        east_west_m = north_south_m * max(np.cos(np.radians(latitude)), 0.01)
        band = slope(heights[halo_start:halo_stop], (north_south_m, east_west_m))
        result[start:stop] = band[start - halo_start : start - halo_start + stop - start]
    return result
