"""Read a GEM-15 COG window over anonymous HTTPS.

Tiles are 1° cells. ``w38s37`` is the cell whose south-west corner is 38°E,
37°N. Nothing here is a site location.
"""

from __future__ import annotations

import math
import os

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "60")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_USERAGENT", "ai-archaeology-atlas/0.1")

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import Window, from_bounds

GEM_ROOT = "https://storage.googleapis.com/climate-and-sustainability/gem-15"
LAYERS = ("dsm", "dtm")


def tile_url(longitude_index: int, latitude_index: int, layer: str = "dsm") -> str:
    """Public COG for one 1° cell. ``layer`` is ``dsm`` or ``dtm``."""
    if layer not in LAYERS:
        raise ValueError(f"unknown GEM-15 layer {layer!r}")
    # Group folders are latitude block, then longitude block: p40_p20 holds w29s40.
    group = f"{_group_token(latitude_index)}_{_group_token(longitude_index)}"
    cell = f"w{_axis_token(longitude_index)}s{_axis_token(latitude_index)}"
    return f"{GEM_ROOT}/{group}/{cell}/{layer}/zall/mosaic.tif"


def paste_layer(
    destination: np.ndarray,
    dst_transform,
    dst_crs: str,
    west: float,
    south: float,
    east: float,
    north: float,
    layer: str = "dsm",
) -> None:
    """Bilinear-sample one GEM-15 layer into ``destination``. NaN stays empty."""
    for longitude_index, latitude_index in _cells(west, south, east, north):
        _paste_tile(
            destination,
            dst_transform,
            dst_crs,
            tile_url(longitude_index, latitude_index, layer),
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
    left, bottom, right, top = _bounds(dst_transform, destination.shape)
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
    data[~np.isfinite(data)] = np.nan
    return window, data


def _bounds(transform, shape: tuple[int, int]) -> tuple[float, float, float, float]:
    left = float(transform.c)
    top = float(transform.f)
    right = left + float(transform.a) * shape[1]
    bottom = top + float(transform.e) * shape[0]
    return left, bottom, right, top


def _cells(west: float, south: float, east: float, north: float):
    for longitude_index in range(math.floor(west), math.floor(east - 1e-9) + 1):
        for latitude_index in range(math.floor(south), math.floor(north - 1e-9) + 1):
            yield longitude_index, latitude_index


def _group_token(index: int) -> str:
    block = math.floor(index / 10.0) * 10
    sign = "p" if block >= 0 else "m"
    return f"{sign}{abs(int(block))}"


def _axis_token(index: int) -> str:
    if index >= 0:
        return str(index)
    return f"m{abs(index)}"
