"""Write a single-band float32 Cloud Optimised GeoTIFF."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio

from ai_archaeology.ingest.constants import NODATA


def write_elevation_cog(
    path: Path,
    values: np.ndarray,
    transform: rasterio.Affine,
    crs,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    profile = {
        "driver": "COG",
        "dtype": "float32",
        "count": 1,
        "height": int(values.shape[0]),
        "width": int(values.shape[1]),
        "crs": crs,
        "transform": transform,
        "nodata": NODATA,
        "compress": "deflate",
        "overview_resampling": "average",
    }
    with rasterio.open(path, "w", **profile) as dataset:
        dataset.write(np.asarray(values, dtype=np.float32), 1)


def write_stack_cog(
    path: Path,
    bands: np.ndarray,
    transform: rasterio.Affine,
    crs,
    descriptions: tuple[str, ...],
) -> None:
    """``bands`` is ``(count, height, width)`` float32."""
    path.parent.mkdir(parents=True, exist_ok=True)
    count, height, width = bands.shape
    profile = {
        "driver": "COG",
        "dtype": "float32",
        "count": count,
        "height": height,
        "width": width,
        "crs": crs,
        "transform": transform,
        "nodata": NODATA,
        "compress": "deflate",
        "overview_resampling": "average",
    }
    with rasterio.open(path, "w", **profile) as dataset:
        dataset.write(np.asarray(bands, dtype=np.float32))
        for index, name in enumerate(descriptions, start=1):
            dataset.set_band_description(index, name)
