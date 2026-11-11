"""Read a Copernicus GLO-30 window for one evaluation region.

Voids are masked with the same cleaner as the atlas. Raw tiles are not written.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject

from ai_archaeology.dem_window import clean_elevation_window
from ai_archaeology.eval.catalog import KnownSite

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff")

PAD_DEG = 0.12
MAX_PIXELS = 2800
TARGET_M = 30.0


@dataclass(frozen=True)
class RegionGrid:
    region: str
    dem: np.ndarray
    pixel_m: float
    west: float
    south: float
    east: float
    north: float

    @property
    def area_m2(self) -> float:
        mid = math.radians((self.south + self.north) / 2)
        width = (self.east - self.west) * 111320.0 * math.cos(mid)
        height = (self.north - self.south) * 110540.0
        return abs(width * height)


def bounds_of(sites: list[KnownSite]) -> tuple[float, float, float, float]:
    longs = [site.longitude for site in sites]
    lats = [site.latitude for site in sites]
    west, east = min(longs) - PAD_DEG, max(longs) + PAD_DEG
    south, north = min(lats) - PAD_DEG, max(lats) + PAD_DEG
    # A single site still needs empty ground around it, or density is meaningless.
    if east - west < 0.28:
        mid = (east + west) / 2
        west, east = mid - 0.14, mid + 0.14
    if north - south < 0.28:
        mid = (north + south) / 2
        south, north = mid - 0.14, mid + 0.14
    return west, south, east, north


def read_region(region: str, sites: list[KnownSite]) -> RegionGrid:
    west, south, east, north = bounds_of(sites)
    pixel_m = _pixel_size(west, south, east, north)
    width, height = _shape(west, south, east, north, pixel_m)
    dem = _mosaic(west, south, east, north, width, height)
    dem = clean_elevation_window(dem)
    return RegionGrid(region, dem, pixel_m, west, south, east, north)


def _pixel_size(west: float, south: float, east: float, north: float) -> float:
    mid = math.radians((south + north) / 2)
    width_m = (east - west) * 111320.0 * math.cos(mid)
    height_m = (north - south) * 110540.0
    longest = max(width_m, height_m)
    return max(TARGET_M, longest / MAX_PIXELS)


def _shape(west: float, south: float, east: float, north: float, pixel_m: float) -> tuple[int, int]:
    mid = math.radians((south + north) / 2)
    width = int(round((east - west) * 111320.0 * math.cos(mid) / pixel_m))
    height = int(round((north - south) * 110540.0 / pixel_m))
    return max(32, width), max(32, height)


def _mosaic(west: float, south: float, east: float, north: float, width: int, height: int) -> np.ndarray:
    destination = np.full((height, width), np.nan, dtype=np.float32)
    transform = from_bounds(west, south, east, north, width, height)
    for lat in range(math.floor(south), math.floor(north) + 1):
        for lon in range(math.floor(west), math.floor(east) + 1):
            _paint_tile(destination, transform, lat, lon)
    if not np.isfinite(destination).any():
        raise RuntimeError(f"no GLO-30 coverage for {west:.2f},{south:.2f},{east:.2f},{north:.2f}")
    return destination


def _paint_tile(destination: np.ndarray, transform, lat: int, lon: int) -> None:
    urls = []
    fine = f"Copernicus_DSM_COG_10_N{lat}_00_E{lon:03d}_00_DEM"
    urls.append(f"https://copernicus-dem-30m.s3.amazonaws.com/{fine}/{fine}.tif")
    coarse = f"Copernicus_DSM_COG_30_N{lat}_00_E{lon:03d}_00_DEM"
    urls.append(f"https://copernicus-dem-90m.s3.amazonaws.com/{coarse}/{coarse}.tif")
    source = None
    for url in urls:
        try:
            source = rasterio.open(url)
            break
        except Exception:
            source = None
    if source is None:
        return
    staged = np.full(destination.shape, np.nan, dtype=np.float32)
    try:
        nodata = source.nodata if source.nodata is not None else -32767.0
        reproject(
            source=rasterio.band(source, 1),
            destination=staged,
            src_transform=source.transform,
            src_crs=source.crs,
            src_nodata=nodata,
            dst_transform=transform,
            dst_crs="EPSG:4326",
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
    finally:
        source.close()
    finite = np.isfinite(staged) & (staged > -100) & (staged < 5500)
    destination[finite] = staged[finite]
