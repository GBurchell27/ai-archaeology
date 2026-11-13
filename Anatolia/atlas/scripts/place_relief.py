"""One Web Mercator elevation window: GEM-15 DSM, voids filled from GLO-30."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gem15_tiles  # noqa: E402
import glo30_tiles  # noqa: E402
import relief_fill  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "src"))
from ai_archaeology.dem_window import clean_elevation_window  # noqa: E402

DST = "EPSG:3857"
FINE_M = 15.0


def continuous_surface(
    left: float,
    bottom: float,
    right: float,
    top: float,
    pixel_m: float,
) -> tuple[np.ndarray, rasterio.Affine, dict]:
    """Elevation on ``pixel_m`` cells. GEM-15 DSM, with GLO-30 in the holes."""
    grid, grid_transform = _grid(left, bottom, right, top, pixel_m)
    west, south, east, north = _geographic(left, bottom, right, top)
    gem = np.full(grid.shape, np.nan, dtype=np.float32)
    reference = np.full(grid.shape, np.nan, dtype=np.float32)
    gem15_tiles.paste_layer(gem, grid_transform, DST, west, south, east, north, "dsm")
    glo30_tiles.paste_layer(reference, grid_transform, DST, west, south, east, north)
    filled, note = _prefer_gem(gem, reference)
    return clean_elevation_window(filled), grid_transform, note


def resample_grid(source: np.ndarray, src_transform, width: int, height: int, bounds) -> np.ndarray:
    """Bilinear sample of ``source`` onto another grid with the same bounds."""
    left, bottom, right, top = bounds
    dst_transform = from_bounds(left, bottom, right, top, width, height)
    destination = np.full((height, width), np.nan, dtype=np.float32)
    reproject(
        source,
        destination,
        src_transform=src_transform,
        src_crs=DST,
        src_nodata=np.nan,
        dst_transform=dst_transform,
        dst_crs=DST,
        dst_nodata=np.nan,
        resampling=Resampling.bilinear,
    )
    return destination


def _prefer_gem(gem: np.ndarray, reference: np.ndarray) -> tuple[np.ndarray, dict]:
    void_fraction = float(1.0 - np.isfinite(gem).mean()) if gem.size else 1.0
    if not np.isfinite(gem).any():
        return reference, {"source": "copernicus", "voidFraction": 1.0, "datumOffsetM": 0.0}
    filled, offset = relief_fill.fill_masked_cells(gem, reference)
    return filled, {
        "source": "gem15",
        "voidFraction": round(void_fraction, 4),
        "datumOffsetM": round(offset, 3),
    }


def _grid(left: float, bottom: float, right: float, top: float, pixel_m: float):
    width = max(2, int(round((right - left) / pixel_m)))
    height = max(2, int(round((top - bottom) / pixel_m)))
    grid_transform = from_bounds(left, bottom, right, top, width, height)
    return np.full((height, width), np.nan, dtype=np.float32), grid_transform


def _geographic(left: float, bottom: float, right: float, top: float):
    xs = [left, right, left, right]
    ys = [bottom, bottom, top, top]
    longitudes, latitudes = transform(DST, "EPSG:4326", xs, ys)
    return min(longitudes), min(latitudes), max(longitudes), max(latitudes)
