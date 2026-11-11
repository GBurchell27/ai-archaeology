"""Clip free CAST orthorectified CORONA GeoTIFFs onto the existing site windows.

The full frames stay on the CAST server. This writes a display JPEG for the
swipe compare and records the frame, licence, and the fact that the
orthorectification residual was not measured.

Source, no account required:
https://cast-ftp1.cast.uark.edu/coronaftp2/
"""

import json
import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import from_bounds
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[3]
METADATA = ROOT / "Anatolia/atlas/public/terrain/metadata.json"
DETAILS = ROOT / "Anatolia/atlas/public/terrain/details"
RADIUS = 6378137.0
FTP = "https://cast-ftp1.cast.uark.edu/coronaftp2"
CREDIT = "Center for Advanced Spatial Technologies, University of Arkansas/U.S. Geological Survey"
NOTE = (
    "Clipped from the CAST orthorectified GeoTIFF in EPSG:4326 and resampled onto this site window. "
    "No control points were added. The orthorectification residual was not measured. "
    "The grey scale is a 2nd–98th percentile display stretch, not the raw scan."
)

# Göbekli and Karahan use the frames named in Anatolia/data-sources.md.
# Harran is on the same 4 Nov 1968 strip. A010 and A011 envelopes contain the
# point, but the scan is black there. A012 is the frame that actually covers
# the Harran window.
SITES = {
    "gobekli-tepe": {
        "path": "1105-1009d/1105-1009da/ds1105-1009da009.tif",
        "frame": "1105-1009A009",
        "date": "1968-11-04",
    },
    "karahan-tepe": {
        "path": "1105-1025d/1105-1025da/ds1105-1025da059.tif",
        "frame": "1105-1025A059",
        "date": "1968-11-05",
    },
    "harran": {
        "path": "1105-1009d/1105-1009da/ds1105-1009da012.tif",
        "frame": "1105-1009A012",
        "date": "1968-11-04",
    },
}


def main() -> None:
    metadata = json.loads(METADATA.read_text())
    for site_id, source in SITES.items():
        detail = metadata["details"][site_id]
        url = f"{FTP}/{source['path']}"
        image, pixel_m = clip(url, detail["bounds"])
        destination = DETAILS / site_id / "corona.jpg"
        Image.fromarray(image, "L").save(destination, quality=78, optimize=True)
        detail["rasters"]["corona"] = f"details/{site_id}/corona.jpg"
        detail["corona"] = {
            "frame": source["frame"],
            "date": source["date"],
            "sourceUrl": "https://corona.cast.uark.edu/atlas",
            "licence": "CC BY-SA 4.0",
            "credit": CREDIT,
            "pixelSizeM": round(pixel_m, 2),
            "note": NOTE,
        }
        print(site_id, source["frame"], f"{pixel_m:.2f} m", destination.stat().st_size)
    METADATA.write_text(json.dumps(metadata, indent=2) + "\n")


def clip(url: str, bounds: list[float], size: int = 1400) -> tuple[np.ndarray, float]:
    left, bottom, right, top = bounds
    with rasterio.open(url) as source:
        longitudes, latitudes = geographic_grid(left, bottom, right, top, size)
        window = from_bounds(float(longitudes.min()), float(latitudes.min()), float(longitudes.max()), float(latitudes.max()), source.transform)
        window = window.round_offsets().round_lengths()
        data = source.read(1, window=window, boundless=False)
        transform = source.window_transform(window)
        latitude = float(latitudes.mean())
        pixel_m = abs(source.transform.a) * 111320 * math.cos(math.radians(latitude))
    columns = (longitudes - transform.c) / transform.a
    rows = (latitudes - transform.f) / transform.e
    sampled = map_coordinates(data, [rows, columns], order=1, mode="constant", cval=0)
    finite = sampled > 0
    if finite.mean() < 0.9:
        raise RuntimeError(f"{url} does not cover this site window")
    low, high = np.percentile(sampled[finite], [2, 98])
    stretched = np.clip((sampled - low) / max(high - low, 1), 0, 1)
    return (stretched * 255).astype(np.uint8), pixel_m


def geographic_grid(left: float, bottom: float, right: float, top: float, size: int):
    east = np.linspace(left, right, size)
    north = np.linspace(top, bottom, size)
    east_grid, north_grid = np.meshgrid(east, north)
    longitude = np.degrees(east_grid / RADIUS)
    latitude = np.degrees(2 * np.arctan(np.exp(north_grid / RADIUS)) - math.pi / 2)
    return longitude, latitude


if __name__ == "__main__":
    main()
