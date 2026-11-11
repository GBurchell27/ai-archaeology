"""Fetch the Şanlıurfa window of Copernicus DEM GLO-30 and one Sentinel-2 day.

Raw reads stay in memory. Callers write only the small web assets.
"""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff")

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.warp import Resampling, reproject, transform, transform_bounds
from rasterio.windows import from_bounds
from scipy.ndimage import distance_transform_edt

WEST, SOUTH, EAST, NORTH = 38.55, 36.75, 39.55, 37.55
DEM_TILES = (
    (36, 38),
    (36, 39),
    (37, 38),
    (37, 39),
)
DST_CRS = "EPSG:32637"
SRC_CRS = "EPSG:4326"
STAC_URL = "https://earth-search.aws.element84.com/v1/search"
DEM_NODATA = -32768.0
REGION_PIXEL_M = 120.0
SITE_PIXEL_M = 30.0
SITE_SIZE_M = 5000.0


@dataclass(frozen=True)
class Grid:
    values: np.ndarray
    transform: rasterio.Affine
    crs: str

    @property
    def width(self) -> int:
        return int(self.values.shape[1])

    @property
    def height(self) -> int:
        return int(self.values.shape[0])

    @property
    def bounds(self) -> tuple[float, float, float, float]:
        left = self.transform.c
        top = self.transform.f
        right = left + self.transform.a * self.width
        bottom = top + self.transform.e * self.height
        return (left, bottom, right, top)

    @property
    def row_metres(self) -> float:
        return abs(float(self.transform.e))

    @property
    def column_metres(self) -> float:
        return abs(float(self.transform.a))


def dem_tile_url(latitude_band: int, longitude_band: int) -> str:
    name = f"Copernicus_DSM_COG_10_N{latitude_band}_00_E{longitude_band:03d}_00_DEM"
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"


def load_geographic_dem() -> tuple[np.ndarray, rasterio.Affine]:
    """Mosaic the four GLO-30 COGs over the study window, in EPSG:4326."""
    datasets = [rasterio.open(dem_tile_url(lat, lon)) for lat, lon in DEM_TILES]
    try:
        mosaic, transform_ll = merge(
            datasets,
            bounds=(WEST, SOUTH, EAST, NORTH),
            nodata=DEM_NODATA,
            dtype="float32",
        )
    finally:
        for dataset in datasets:
            dataset.close()
    grid = mosaic[0].astype(np.float32)
    grid[grid <= DEM_NODATA + 1] = np.nan
    missing = float(np.mean(~np.isfinite(grid)))
    if missing > 0.05:
        raise RuntimeError(f"DEM window is {missing:.1%} empty; the tile set does not cover the extent")
    return fill_nans(grid), transform_ll


def region_grid(dem_ll: np.ndarray, transform_ll: rasterio.Affine) -> Grid:
    left, bottom, right, top = transform_bounds(SRC_CRS, DST_CRS, WEST, SOUTH, EAST, NORTH)
    width = max(2, int(round((right - left) / REGION_PIXEL_M)))
    height = max(2, int(round((top - bottom) / REGION_PIXEL_M)))
    values, dst_transform = _warp(dem_ll, transform_ll, (left, bottom, right, top), width, height)
    return Grid(fill_nans(values), dst_transform, DST_CRS)


def site_grid(dem_ll: np.ndarray, transform_ll: rasterio.Affine, longitude: float, latitude: float) -> tuple[Grid, tuple[float, float]]:
    easting, northing = _to_utm(longitude, latitude)
    half = SITE_SIZE_M / 2.0
    bounds = (easting - half, northing - half, easting + half, northing + half)
    pixels = max(2, int(round(SITE_SIZE_M / SITE_PIXEL_M)))
    values, dst_transform = _warp(dem_ll, transform_ll, bounds, pixels, pixels)
    return Grid(fill_nans(values), dst_transform, DST_CRS), (easting, northing)


def search_sentinel_day() -> tuple[str, list[dict]]:
    """Most recent low-cloud Sentinel-2 L2A day whose footprints cover the window."""
    features = _stac_features()
    by_day: dict[str, list[dict]] = {}
    for feature in features:
        day = str(feature["properties"]["datetime"])[:10]
        by_day.setdefault(day, []).append(feature)
    for day in sorted(by_day, reverse=True):
        if _covers_extent(by_day[day]):
            return day, by_day[day]
    raise RuntimeError("No low-cloud Sentinel-2 day covers the study window")


def read_reflectance(scenes: list[dict], asset_name: str, grid: Grid) -> np.ndarray:
    """Median of one band from the day's scenes, on ``grid``'s UTM cells."""
    arrays = [_read_scene_band(scene["assets"][asset_name]["href"], grid) for scene in scenes]
    return _nanmedian(arrays)


def fill_nans(grid: np.ndarray) -> np.ndarray:
    invalid = ~np.isfinite(grid)
    if not np.any(invalid):
        return np.asarray(grid, dtype=np.float32)
    if np.all(invalid):
        raise ValueError("elevation grid has no finite values")
    _distances, indices = distance_transform_edt(invalid, return_indices=True)
    return np.asarray(grid[tuple(indices)], dtype=np.float32)


def _warp(source, src_transform, bounds, width, height):
    left, bottom, right, top = bounds
    dst_transform = rasterio.transform.from_bounds(left, bottom, right, top, width, height)
    destination = np.full((height, width), np.nan, dtype=np.float32)
    reproject(
        source=source,
        destination=destination,
        src_transform=src_transform,
        src_crs=SRC_CRS,
        src_nodata=np.nan,
        dst_transform=dst_transform,
        dst_crs=DST_CRS,
        dst_nodata=np.nan,
        resampling=Resampling.bilinear,
    )
    return destination, dst_transform


def _to_utm(longitude: float, latitude: float) -> tuple[float, float]:
    eastings, northings = transform(SRC_CRS, DST_CRS, [longitude], [latitude])
    return float(eastings[0]), float(northings[0])


def _stac_features() -> list[dict]:
    body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": [WEST, SOUTH, EAST, NORTH],
        "datetime": "2025-05-01T00:00:00Z/2026-11-11T00:00:00Z",
        "query": {"eo:cloud_cover": {"lt": 12}},
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
        "limit": 100,
    }
    request = urllib.request.Request(
        STAC_URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = json.load(response)
    return list(payload["features"])


def _covers_extent(scenes: list[dict]) -> bool:
    boxes = [feature["bbox"] for feature in scenes]
    for longitude in np.linspace(WEST, EAST, 5):
        for latitude in np.linspace(SOUTH, NORTH, 5):
            inside = any(
                box[0] <= longitude <= box[2] and box[1] <= latitude <= box[3] for box in boxes
            )
            if not inside:
                return False
    return True


def _read_scene_band(href: str, grid: Grid) -> np.ndarray:
    left, bottom, right, top = grid.bounds
    with rasterio.open(href) as source:
        same_crs = source.crs is not None and source.crs.to_epsg() == 32637
        if same_crs:
            window = from_bounds(left, bottom, right, top, transform=source.transform)
            sampled = source.read(
                1,
                window=window,
                out_shape=(grid.height, grid.width),
                resampling=Resampling.bilinear,
                boundless=True,
                fill_value=0,
            ).astype(np.float32)
            sampled[_outside_source(grid, source.bounds)] = np.nan
        else:
            sampled = np.full((grid.height, grid.width), np.nan, dtype=np.float32)
            reproject(
                source=rasterio.band(source, 1),
                destination=sampled,
                src_transform=source.transform,
                src_crs=source.crs,
                dst_transform=grid.transform,
                dst_crs=grid.crs,
                dst_nodata=np.nan,
                resampling=Resampling.bilinear,
            )
    peak = np.nanmax(sampled) if np.any(np.isfinite(sampled)) else 0.0
    if peak > 100:
        sampled = sampled / 10000.0
    sampled[sampled < 0] = np.nan
    return sampled


def _outside_source(grid: Grid, bounds) -> np.ndarray:
    rows, columns = np.indices((grid.height, grid.width))
    x_coords = grid.transform.c + (columns + 0.5) * grid.transform.a
    y_coords = grid.transform.f + (rows + 0.5) * grid.transform.e
    return (
        (x_coords < bounds.left)
        | (x_coords > bounds.right)
        | (y_coords < bounds.bottom)
        | (y_coords > bounds.top)
    )


def _nanmedian(arrays: list[np.ndarray]) -> np.ndarray:
    stacked = np.stack(arrays, axis=0)
    with np.errstate(all="ignore"):
        combined = np.nanmedian(stacked, axis=0)
    return np.asarray(combined, dtype=np.float32)
