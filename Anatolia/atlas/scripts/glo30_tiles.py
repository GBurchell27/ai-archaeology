"""Read a Copernicus GLO-30 window from the public AWS COGs."""

from __future__ import annotations

import math

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import Window, from_bounds

GLO_ROOT = "https://copernicus-dem-30m.s3.amazonaws.com"
VOID_BELOW = -1000.0


def tile_url(latitude_index: int, longitude_index: int) -> str:
    name = f"Copernicus_DSM_COG_10_N{latitude_index}_00_E{longitude_index:03d}_00_DEM"
    return f"{GLO_ROOT}/{name}/{name}.tif"


def paste_layer(
    destination: np.ndarray,
    dst_transform,
    dst_crs: str,
    west: float,
    south: float,
    east: float,
    north: float,
) -> None:
    """Bilinear-sample GLO-30 into ``destination``. Sentinel voids become NaN."""
    for latitude_index, longitude_index in _cells(west, south, east, north):
        _paste_tile(
            destination,
            dst_transform,
            dst_crs,
            tile_url(latitude_index, longitude_index),
        )


def _paste_tile(destination: np.ndarray, dst_transform, dst_crs: str, url: str) -> None:
    try:
        source = rasterio.open(url)
    except rasterio.errors.RasterioIOError:
        return
    with source:
        window, data = _read_intersection(source, destination, dst_transform, dst_crs)
        if data is None or window is None:
            return
        staged = np.full(destination.shape, np.nan, dtype=np.float32)
        reproject(
            data,
            staged,
            src_transform=source.window_transform(window),
            src_crs=source.crs,
            src_nodata=np.nan,
            dst_transform=dst_transform,
            dst_crs=dst_crs,
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
        holes = ~np.isfinite(destination) & np.isfinite(staged)
        destination[holes] = staged[holes]


def _read_intersection(source, destination, dst_transform, dst_crs: str):
    left = float(dst_transform.c)
    top = float(dst_transform.f)
    right = left + float(dst_transform.a) * destination.shape[1]
    bottom = top + float(dst_transform.e) * destination.shape[0]
    try:
        src_bounds = transform_bounds(dst_crs, source.crs, left, bottom, right, top, densify_pts=21)
    except rasterio.errors.RasterioIOError:
        return None, None
    window = from_bounds(*src_bounds, transform=source.transform)
    frame = Window(0, 0, source.width, source.height)
    window = window.intersection(frame).round_offsets().round_lengths()
    if window.width < 1 or window.height < 1:
        return None, None
    data = source.read(1, window=window).astype(np.float32)
    if source.nodata is not None:
        data[data == source.nodata] = np.nan
    data[data < VOID_BELOW] = np.nan
    return window, data


def _cells(west: float, south: float, east: float, north: float):
    for latitude_index in range(math.floor(south), math.floor(north - 1e-9) + 1):
        for longitude_index in range(math.floor(west), math.floor(east - 1e-9) + 1):
            yield latitude_index, longitude_index
