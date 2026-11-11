"""Resample elevation onto the resolution ladder in a metre CRS."""

from __future__ import annotations

import math

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.ingest.resolution import assert_not_upsampling


def snap_bounds(
    bounds: tuple[float, float, float, float], resolution_m: float
) -> tuple[float, float, float, float]:
    min_x, min_y, max_x, max_y = bounds
    snapped_min_x = math.floor(min_x / resolution_m) * resolution_m
    snapped_min_y = math.floor(min_y / resolution_m) * resolution_m
    snapped_max_x = math.ceil(max_x / resolution_m) * resolution_m
    snapped_max_y = math.ceil(max_y / resolution_m) * resolution_m
    return snapped_min_x, snapped_min_y, snapped_max_x, snapped_max_y


def grid_shape(
    bounds: tuple[float, float, float, float], resolution_m: float
) -> tuple[rasterio.Affine, int, int]:
    min_x, min_y, max_x, max_y = snap_bounds(bounds, resolution_m)
    width = max(1, int(round((max_x - min_x) / resolution_m)))
    height = max(1, int(round((max_y - min_y) / resolution_m)))
    transform = from_origin(min_x, max_y, resolution_m, resolution_m)
    return transform, width, height


def resampling_for(native_resolution_m: float, target_resolution_m: float) -> Resampling:
    assert_not_upsampling(native_resolution_m, target_resolution_m)
    if target_resolution_m > native_resolution_m * 1.01:
        return Resampling.average
    return Resampling.bilinear


def resample_elevation(
    values: np.ndarray,
    source_transform: rasterio.Affine,
    source_crs,
    destination_crs,
    destination_bounds: tuple[float, float, float, float],
    native_resolution_m: float,
    target_resolution_m: float,
) -> tuple[np.ndarray, rasterio.Affine]:
    transform, width, height = grid_shape(destination_bounds, target_resolution_m)
    destination = np.full((height, width), NODATA, dtype=np.float32)
    reproject(
        source=values,
        destination=destination,
        src_transform=source_transform,
        src_crs=source_crs,
        src_nodata=NODATA,
        dst_transform=transform,
        dst_crs=destination_crs,
        dst_nodata=NODATA,
        resampling=resampling_for(native_resolution_m, target_resolution_m),
    )
    return destination, transform
