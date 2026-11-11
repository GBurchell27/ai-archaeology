"""USGS 3DEP bare-earth elevation from The National Map ImageServer.

The service is public domain. A requested pixel size is not proof that a 1 m
lidar posting exists under the window: where 3DEP has only a coarser DEM, the
export is that coarser surface resampled to the requested size. The delivered
pixel size is what later code treats as native.
"""

from __future__ import annotations

import math
import urllib.parse
from pathlib import Path

import rasterio

from ai_archaeology.ingest.crs_utm import utm_epsg
from ai_archaeology.ingest.http_fetch import download_file
from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.ingest.source import SourceTerrain

EXPORT_URL = (
    "https://elevation.nationalmap.gov/arcgis/rest/services/"
    "3DEPElevation/ImageServer/exportImage"
)
ATTRIBUTION = (
    "Map services and data available from U.S. Geological Survey, "
    "National Geospatial Program."
)


class Usgs3depAdapter:
    adapter_id = "usgs_3dep"

    def fetch(
        self,
        bounds_wgs84: tuple[float, float, float, float],
        destination: Path,
        repo_root: Path,
        target_resolution_m: float = 1.0,
    ) -> SourceTerrain:
        assert_untracked_product(destination, repo_root)
        _export(bounds_wgs84, destination, target_resolution_m)
        return SourceTerrain(
            path=destination,
            source="USGS 3DEP Elevation ImageServer",
            licence="US-public-domain",
            attribution=ATTRIBUTION,
            acquisition_date=None,
            native_resolution_m=_pixel_metres(destination),
            vertical_datum="NAVD88",
            bare_earth=True,
            source_url=EXPORT_URL,
            adapter=self.adapter_id,
        )


def _export(bounds_wgs84, destination: Path, target_resolution_m: float) -> None:
    west, south, east, north = bounds_wgs84
    centre_lon = (west + east) / 2.0
    centre_lat = (south + north) / 2.0
    width_m, height_m = _span_metres(west, south, east, north, centre_lat)
    pixels_x = max(2, int(round(width_m / target_resolution_m)))
    pixels_y = max(2, int(round(height_m / target_resolution_m)))
    image_sr = str(utm_epsg(centre_lon, centre_lat))
    query = urllib.parse.urlencode(
        {
            "bbox": f"{west},{south},{east},{north}",
            "bboxSR": "4326",
            "imageSR": image_sr,
            "size": f"{pixels_x},{pixels_y}",
            "format": "tiff",
            "pixelType": "F32",
            "noDataInterpretation": "esriNoDataMatchAny",
            "interpolation": "RSP_BilinearInterpolation",
            "f": "image",
        }
    )
    download_file(f"{EXPORT_URL}?{query}", destination, timeout=180)


def _span_metres(west, south, east, north, centre_lat) -> tuple[float, float]:
    metres_per_degree = 111_320.0
    width = (east - west) * metres_per_degree * math.cos(math.radians(centre_lat))
    height = (north - south) * metres_per_degree
    return abs(width), abs(height)


def _pixel_metres(path: Path) -> float:
    with rasterio.open(path) as dataset:
        pixel = abs(float(dataset.res[0]))
    if pixel <= 0:
        raise ValueError("3DEP export has a zero pixel size")
    return pixel
