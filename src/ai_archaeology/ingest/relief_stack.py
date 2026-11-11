"""Relief layers on a standardised metre grid, via ``ai_archaeology.relief``."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio

from ai_archaeology.ingest.cog import write_stack_cog
from ai_archaeology.ingest.constants import NODATA, RELIEF_BANDS
from ai_archaeology.relief import (
    hillshade,
    local_relief,
    multidirectional_hillshade,
    sky_view_factor,
    slope,
)


def relief_radius_m(resolution_m: float, configured_radius_m: float | None) -> float:
    """Keep a neighbourhood of at least three pixels on coarse rungs."""
    base = 20.0 if configured_radius_m is None else configured_radius_m
    return max(base, resolution_m * 3.0)


def build_relief_stack(
    elevation: np.ndarray,
    resolution_m: float,
    *,
    radius_m: float,
    multi_directions: int,
    svf_directions: int,
    propagate_nan: bool = False,
) -> np.ndarray:
    work = np.array(elevation, dtype=np.float64, copy=True)
    work[work == NODATA] = np.nan
    shared = {"propagate_nan": propagate_nan}
    layers = (
        hillshade(work, resolution_m, **shared),
        multidirectional_hillshade(work, resolution_m, n_directions=multi_directions, **shared),
        slope(work, resolution_m, **shared),
        local_relief(work, resolution_m, radius_m, **shared),
        sky_view_factor(work, resolution_m, radius_m, svf_directions, **shared),
    )
    stack = np.stack([_finite_or_nodata(layer) for layer in layers], axis=0)
    return stack


def write_relief_stack(
    path: Path,
    elevation: np.ndarray,
    transform: rasterio.Affine,
    crs,
    resolution_m: float,
    *,
    radius_m: float,
    multi_directions: int,
    svf_directions: int,
) -> np.ndarray:
    stack = build_relief_stack(
        elevation,
        resolution_m,
        radius_m=radius_m,
        multi_directions=multi_directions,
        svf_directions=svf_directions,
    )
    write_stack_cog(path, stack, transform, crs, RELIEF_BANDS)
    return stack


def _finite_or_nodata(values: np.ndarray) -> np.ndarray:
    output = np.asarray(values, dtype=np.float32)
    invalid = ~np.isfinite(output)
    if np.any(invalid):
        output = output.copy()
        output[invalid] = np.float32(NODATA)
    return output
