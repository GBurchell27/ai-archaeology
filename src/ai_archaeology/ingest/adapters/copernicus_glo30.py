"""Copernicus DEM GLO-30 public COGs on AWS.

GLO-30 is a digital surface model on EGM2008, about 30 m at the equator.
The public licence allows reproduction and adaptation. Armenia and Azerbaijan
are outside the public tile set; this adapter is used for a Turkey window.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.ingest.nodata import mask_voids
from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.ingest.source import SourceTerrain

BUCKET = "https://copernicus-dem-30m.s3.amazonaws.com"
ATTRIBUTION = (
    "Copernicus DEM GLO-30. DOI: https://doi.org/10.5270/ESA-c5d3d65. "
    "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 "
    "provided under COPERNICUS by the European Union and ESA."
)
NATIVE_RESOLUTION_M = 30.0
GDAL_HTTP = {
    "AWS_NO_SIGN_REQUEST": "YES",
    "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.TIF,.tiff",
    "GDAL_HTTP_CONNECTTIMEOUT": "15",
    "GDAL_HTTP_TIMEOUT": "60",
}


class CopernicusGlo30Adapter:
    adapter_id = "copernicus_glo30"

    def fetch(
        self,
        bounds_wgs84: tuple[float, float, float, float],
        destination: Path,
        repo_root: Path,
    ) -> SourceTerrain:
        assert_untracked_product(destination, repo_root)
        _write_window(bounds_wgs84, destination)
        return SourceTerrain(
            path=destination,
            source="Copernicus DEM GLO-30",
            licence="Copernicus-DEM-GLO-30-free-and-open",
            attribution=ATTRIBUTION,
            acquisition_date="2011/2015",
            native_resolution_m=NATIVE_RESOLUTION_M,
            vertical_datum="EGM2008",
            bare_earth=False,
            source_url=f"{BUCKET}/readme.html",
            adapter=self.adapter_id,
        )


def tile_url(latitude: int, longitude: int) -> str:
    northing = f"N{latitude:02d}_00" if latitude >= 0 else f"S{abs(latitude):02d}_00"
    easting = f"E{longitude:03d}_00" if longitude >= 0 else f"W{abs(longitude):03d}_00"
    name = f"Copernicus_DSM_COG_10_{northing}_{easting}_DEM"
    return f"{BUCKET}/{name}/{name}.tif"


def tiles_for_bounds(bounds_wgs84: tuple[float, float, float, float]) -> list[tuple[int, int]]:
    west, south, east, north = bounds_wgs84
    latitudes = range(math.floor(south), math.floor(north - 1e-9) + 1)
    longitudes = range(math.floor(west), math.floor(east - 1e-9) + 1)
    return [(latitude, longitude) for latitude in latitudes for longitude in longitudes]


def _write_window(bounds_wgs84, destination: Path) -> None:
    with rasterio.Env(**GDAL_HTTP):
        datasets = [rasterio.open(tile_url(lat, lon)) for lat, lon in tiles_for_bounds(bounds_wgs84)]
        try:
            declared_nodata = datasets[0].nodata
            mosaic, transform = merge(datasets, bounds=bounds_wgs84, dtype="float32", nodata=NODATA)
        finally:
            for dataset in datasets:
                dataset.close()
    elevation = mask_voids(mosaic[0], declared_nodata)
    _write_geographic(destination, elevation, transform)


def _write_geographic(destination, elevation, transform) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    height, width = elevation.shape
    profile = {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "height": height,
        "width": width,
        "crs": "EPSG:4326",
        "transform": transform,
        "nodata": NODATA,
        "compress": "deflate",
    }
    with rasterio.open(destination, "w", **profile) as dataset:
        dataset.write(np.asarray(elevation, dtype=np.float32), 1)
