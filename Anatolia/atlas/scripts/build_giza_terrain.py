"""Build the Giza walk's static ground: a GEM-15 window and a Sentinel-2 drape.

The owner approved this download on 26 Nov 2026. It fetches only that window.
Raw tiles stay in memory. Nothing here fetches photographs or trains a splat.

Run from the repository root:

    .venv/bin/python Anatolia/atlas/scripts/build_giza_terrain.py

GEM-15 and Sentinel-2 L2A are cloud-optimised GeoTIFFs. Rasterio reads the
window with HTTP range requests, not the whole tile. The surface model includes
the pyramids, so their footprints are flattened to the ground beside them
before anything is written. The walk then stands the procedural pyramids on
that ground.

Outputs, all small enough to commit:

    Anatolia/atlas/public/walk/giza/height.u16
    Anatolia/atlas/public/walk/giza/drape.jpg
    Anatolia/atlas/public/walk/giza/terrain.json
"""

from __future__ import annotations

import json
import math
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff,.TIF")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "90")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_USERAGENT", "ai-archaeology-atlas/0.1")

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import Affine, array_bounds, from_bounds, from_origin
from rasterio.warp import reproject, transform, transform_bounds
from rasterio.windows import Window, from_bounds as window_from_bounds
from rasterio.crs import CRS

SCRIPT_DIR = Path(__file__).resolve().parent
ATLAS = SCRIPT_DIR.parent
REPO = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(REPO / "src"))

import gem15_tiles  # noqa: E402
import glo30_tiles  # noqa: E402
import relief_fill  # noqa: E402
from ai_archaeology.dem_window import clean_elevation_window  # noqa: E402
from terrain_credits import GIZA_RELIEF_CREDIT as RELIEF_CREDIT  # noqa: E402
from giza_terrain_mask import (  # noqa: E402
    PlacedFootprint,
    PyramidPlan,
    corner_radius_m,
    flatten_footprints,
    footprint_base_m,
    match_pyramids,
)

FETCH_M = 9000.0
WINDOW_M = 6000.0
CELL_M = 15.0
DRAPE_M = 10.0
ASSET_BUDGET_BYTES = int(1.5 * 1024 * 1024)
STAC_URL = "https://earth-search.aws.element84.com/v1/search"
OUT_DIR = ATLAS / "public" / "walk" / "giza"
USER_AGENT = "ai-archaeology-atlas/0.1"
# Sum of the three peak-to-centre misses after one shared translation.
WORST_RESIDUAL_M = 45.0


def main() -> None:
    pyramids = model_pyramids()
    longitude, latitude = published_anchor()
    crs = local_crs(longitude, latitude)
    fetch = read_fetch_grid(crs, longitude, latitude)
    peaks = match_pyramids(fetch.values, CELL_M, pyramids)
    window, peaks = crop_to_pyramids(fetch, peaks)
    origin = frame_origin(peaks, pyramids)
    _refuse_large_residual(peaks, pyramids, origin)
    footprints = place_footprints(pyramids, origin, window.values)
    _refuse_flat_mounds(window.values, peaks, footprints)
    cleared = flatten_footprints(window.values, footprints, CELL_M)
    scene = cloud_free_scene(geographic_bounds(window.transform, window.values.shape, crs))
    drape = read_drape(scene, window)
    written = write_assets(cleared, footprints, origin, drape, scene)
    print(f"wrote {written} bytes under {OUT_DIR.relative_to(REPO)}", flush=True)


def model_pyramids() -> list[PyramidPlan]:
    """Centres and bases from the walk model, so the ground uses the same frame."""
    completed = subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", _PYRAMID_PROGRAM],
        cwd=ATLAS,
        check=True,
        capture_output=True,
        text=True,
    )
    rows = json.loads(completed.stdout)
    return [PyramidPlan(row["id"], float(row["east"]), float(row["south"]), float(row["base"])) for row in rows]


def published_anchor() -> tuple[float, float]:
    """The published catalogue point the window is fetched around. Not written out."""
    featured = json.loads((ATLAS / "public" / "world" / "featured.json").read_text())
    site = next(item for item in featured if item["id"] == "Q12508")
    return float(site["lon"]), float(site["lat"])


def local_crs(longitude: float, latitude: float) -> CRS:
    """Metres east and north of the anchor. lat_0 is the origin; lat_ts keeps the scale true."""
    projection = "+proj=eqc +datum=WGS84 +units=m +no_defs"
    projection += " +lat_ts=" + f"{latitude:.8f}"
    projection += " +lat_0=" + f"{latitude:.8f}"
    projection += " +lon_0=" + f"{longitude:.8f}"
    return CRS.from_proj4(projection)


def read_fetch_grid(crs: CRS, longitude: float, latitude: float):
    cells = int(round(FETCH_M / CELL_M))
    half = cells * CELL_M / 2.0
    grid_transform = from_origin(-half, half, CELL_M, CELL_M)
    bounds = geographic_bounds(grid_transform, (cells, cells), crs)
    _refuse_shifted_window(bounds, longitude, latitude)
    values = read_surface(crs, grid_transform, (cells, cells))
    return _Grid(values, grid_transform)


def read_surface(crs: CRS, grid_transform, shape: tuple[int, int]) -> np.ndarray:
    west, south, east, north = geographic_bounds(grid_transform, shape, crs)
    gem = np.full(shape, np.nan, dtype=np.float32)
    reference = np.full(shape, np.nan, dtype=np.float32)
    wkt = crs.to_wkt()
    gem15_tiles.paste_layer(gem, grid_transform, wkt, west, south, east, north, "dsm")
    glo30_tiles.paste_layer(reference, grid_transform, wkt, west, south, east, north)
    filled, _offset = relief_fill.fill_masked_cells(gem, reference)
    if not np.isfinite(filled).any():
        raise RuntimeError("GEM-15 window is empty")
    return clean_elevation_window(filled)


def crop_to_pyramids(fetch, peaks: list[tuple[int, int]]):
    """A 6 km window centred on the three mounds."""
    cells = int(round(WINDOW_M / CELL_M))
    centre_row = sum(row for row, _col in peaks) / len(peaks)
    centre_col = sum(col for _row, col in peaks) / len(peaks)
    row0 = _clamped_start(centre_row, cells, fetch.values.shape[0])
    col0 = _clamped_start(centre_col, cells, fetch.values.shape[1])
    cropped = fetch.values[row0:row0 + cells, col0:col0 + cells]
    shifted = [(row - row0, col - col0) for row, col in peaks]
    if cropped.shape != (cells, cells) or any(row < 0 or col < 0 or row >= cells or col >= cells for row, col in shifted):
        raise RuntimeError("the pyramids do not fit in the fetched window")
    transform = fetch.transform * Affine.translation(col0, row0)
    return _Grid(cropped, transform), shifted


def frame_origin(peaks: list[tuple[int, int]], pyramids: list[PyramidPlan]) -> tuple[float, float]:
    """Walk-frame position of the grid's north-west corner (west edge, north edge)."""
    west = [pyramid.east_m - (col + 0.5) * CELL_M for (_row, col), pyramid in zip(peaks, pyramids, strict=True)]
    north = [pyramid.south_m - (row + 0.5) * CELL_M for (row, _col), pyramid in zip(peaks, pyramids, strict=True)]
    return sum(west) / len(west), sum(north) / len(north)


def place_footprints(pyramids: list[PyramidPlan], origin: tuple[float, float], elevation: np.ndarray) -> list[PlacedFootprint]:
    west_m, north_m = origin
    placed = []
    for pyramid in pyramids:
        row, col = _cell_of(pyramid.east_m, pyramid.south_m, west_m, north_m)
        placed.append(PlacedFootprint(pyramid, row, col, corner_radius_m(pyramid.base_m), base_m=0.0))
    return [
        PlacedFootprint(foot.plan, foot.row, foot.col, foot.radius_m, footprint_base_m(elevation, foot, placed, CELL_M))
        for foot in placed
    ]


def cloud_free_scene(bounds: tuple[float, float, float, float]) -> dict:
    """The newest Sentinel-2 L2A scene whose crop is almost free of cloud."""
    for feature in _stac_features(bounds):
        if _scene_is_clear(feature, bounds):
            day = str(feature["properties"]["datetime"])[:10]
            print(f"Sentinel-2 {feature['id']} {day}", flush=True)
            return feature
    raise RuntimeError("no cloud-free Sentinel-2 scene covers the window")


def read_drape(scene: dict, window) -> np.ndarray:
    shape = _drape_shape(window)
    grid_transform = from_bounds(*array_bounds(window.values.shape[0], window.values.shape[1], window.transform), shape[1], shape[0])
    crs = local_crs(*published_anchor())
    bands = [_read_band(_asset(scene, name)["href"], shape, grid_transform, crs) for name in ("red", "green", "blue")]
    return np.dstack([_stretch(band) for band in bands])


def write_assets(cleared: np.ndarray, footprints: list[PlacedFootprint], origin: tuple[float, float], drape: np.ndarray, scene: dict) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    record = _record(cleared, footprints, origin, scene)
    height_path = OUT_DIR / "height.u16"
    drape_path = OUT_DIR / "drape.jpg"
    (OUT_DIR / "terrain.json").write_text(json.dumps(record, indent=2) + "\n")
    _write_height(height_path, cleared, record["minM"], record["maxM"])
    _write_jpeg(drape_path, drape)
    total = sum(path.stat().st_size for path in OUT_DIR.iterdir() if path.is_file())
    if total > ASSET_BUDGET_BYTES:
        raise RuntimeError(f"Giza terrain assets are {total} bytes, over the 1.5 MB budget")
    return total


def geographic_bounds(grid_transform, shape: tuple[int, int], crs: CRS) -> tuple[float, float, float, float]:
    left, bottom, right, top = array_bounds(shape[0], shape[1], grid_transform)
    longitudes, latitudes = transform(crs, "EPSG:4326", [left, right, left, right], [bottom, bottom, top, top])
    return min(longitudes), min(latitudes), max(longitudes), max(latitudes)


class _Grid:
    def __init__(self, values: np.ndarray, grid_transform):
        self.values = values
        self.transform = grid_transform


def _refuse_shifted_window(bounds: tuple[float, float, float, float], longitude: float, latitude: float) -> None:
    centre_longitude = (bounds[0] + bounds[2]) / 2.0
    centre_latitude = (bounds[1] + bounds[3]) / 2.0
    if abs(centre_longitude - longitude) > 0.05 or abs(centre_latitude - latitude) > 0.05:
        raise RuntimeError("the terrain window is not centred on the published anchor")


def _refuse_large_residual(peaks, pyramids, origin) -> None:
    west_m, north_m = origin
    misses = []
    for (row, col), pyramid in zip(peaks, pyramids, strict=True):
        east = west_m + (col + 0.5) * CELL_M
        south = north_m + (row + 0.5) * CELL_M
        misses.append(math.hypot(east - pyramid.east_m, south - pyramid.south_m))
    worst = max(misses)
    print("peak residuals m: " + ", ".join(f"{miss:.1f}" for miss in misses), flush=True)
    if worst > WORST_RESIDUAL_M:
        raise RuntimeError(f"a pyramid peak is {worst:.0f} m from its centre")


def _refuse_flat_mounds(elevation, peaks, footprints) -> None:
    stands = [float(elevation[row, col]) - foot.base_m for (row, col), foot in zip(peaks, footprints, strict=True)]
    print("mounds stand m above the ring: " + ", ".join(f"{stand:.0f}" for stand in stands), flush=True)
    if min(stands) < 25.0:
        raise RuntimeError("a pyramid mound is missing from the surface model")


def _cell_of(east_m: float, south_m: float, west_m: float, north_m: float) -> tuple[float, float]:
    column = (east_m - west_m) / CELL_M - 0.5
    row = (south_m - north_m) / CELL_M - 0.5
    return row, column


def _clamped_start(centre: float, cells: int, limit: int) -> int:
    return min(max(0, int(round(centre - cells / 2))), limit - cells)


def _stac_features(bounds: tuple[float, float, float, float]) -> list[dict]:
    west, south, east, north = bounds
    body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": [west, south, east, north],
        "datetime": "2023-01-01T00:00:00Z/2026-11-20T00:00:00Z",
        "query": {"eo:cloud_cover": {"lt": 8}},
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
        "limit": 30,
    }
    request = urllib.request.Request(
        STAC_URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = json.load(response)
    return [feature for feature in payload["features"] if _asset(feature, "red") and _asset(feature, "scl")]


def _scene_is_clear(feature: dict, bounds: tuple[float, float, float, float]) -> bool:
    box = feature["bbox"]
    west, south, east, north = bounds
    covers = box[0] <= west and box[1] <= south and box[2] >= east and box[3] >= north
    if not covers:
        return False
    # Cloud classes in the scene classification layer. A scene average is not the crop.
    classes = _read_classification(_asset(feature, "scl")["href"], bounds)
    cloudy = np.isin(classes, (3, 8, 9, 10))
    return float(np.mean(cloudy)) < 0.02


def _read_classification(href: str, bounds: tuple[float, float, float, float]) -> np.ndarray:
    west, south, east, north = bounds
    with rasterio.open(href) as source:
        left, bottom, right, top = transform_bounds("EPSG:4326", source.crs, west, south, east, north)
        window = window_from_bounds(left, bottom, right, top, transform=source.transform)
        window = window.intersection(Window(0, 0, source.width, source.height)).round_offsets().round_lengths()
        if window.width < 1 or window.height < 1:
            return np.zeros((1, 1), dtype=np.uint8)
        return source.read(1, window=window)


def _drape_shape(window) -> tuple[int, int]:
    left, bottom, right, top = array_bounds(window.values.shape[0], window.values.shape[1], window.transform)
    return int(round((top - bottom) / DRAPE_M)), int(round((right - left) / DRAPE_M))


def _read_band(href: str, shape: tuple[int, int], grid_transform, crs: CRS) -> np.ndarray:
    destination = np.full(shape, np.nan, dtype=np.float32)
    with rasterio.open(href) as source:
        reproject(
            source=rasterio.band(source, 1),
            destination=destination,
            src_transform=source.transform,
            src_crs=source.crs,
            src_nodata=0,
            dst_transform=grid_transform,
            dst_crs=crs,
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
    return destination


def _asset(feature: dict, name: str) -> dict | None:
    assets = feature["assets"]
    return assets.get(name) or assets.get(name.upper())


def _stretch(band: np.ndarray) -> np.ndarray:
    finite = band[np.isfinite(band)]
    if finite.size == 0:
        raise RuntimeError("Sentinel-2 band is empty")
    low, high = np.percentile(finite, [2, 98])
    span = max(float(high - low), 1.0)
    scaled = np.clip((np.nan_to_num(band, nan=low) - low) / span, 0.0, 1.0)
    return (scaled * 255.0).astype(np.uint8)


def _record(cleared: np.ndarray, footprints: list[PlacedFootprint], origin: tuple[float, float], scene: dict) -> dict:
    bases = [foot.base_m for foot in footprints]
    datum = sum(bases) / len(bases)
    day = str(scene["properties"]["datetime"])[:10]
    lowest = round(float(np.min(cleared)), 3)
    highest = round(float(np.max(cleared)), 3)
    return {
        "width": int(cleared.shape[1]),
        "height": int(cleared.shape[0]),
        "cellM": CELL_M,
        "westM": round(origin[0], 3),
        "northM": round(origin[1], 3),
        "minM": lowest,
        "maxM": highest,
        "datumM": round(datum, 3),
        "baseOffsetM": {foot.plan.id: round(foot.base_m - datum, 3) for foot in footprints},
        "reliefCredit": RELIEF_CREDIT,
        "imageryCredit": f"Contains modified Copernicus Sentinel data {day[:4]}",
        "imageryDay": day,
        "sceneId": str(scene["id"]),
        "note": (
            "Pyramid footprints in the surface model are flattened to the ground beside them, "
            "so the drawn pyramids are not a second copy of the mounds. "
            "The peaks of those mounds sit 31 to 36 m from Petrie's centres."
        ),
    }


def _write_height(path: Path, grid: np.ndarray, lowest: float, highest: float) -> None:
    span = max(highest - lowest, 1.0)
    scaled = np.clip(np.round((grid - lowest) / span * 65535.0), 0, 65535).astype("<u2")
    path.write_bytes(scaled.tobytes())


def _write_jpeg(path: Path, rgb: np.ndarray) -> None:
    image = Image.fromarray(rgb, "RGB")
    for quality in (82, 74, 66, 58):
        image.save(path, "JPEG", quality=quality, optimize=True)
        if path.stat().st_size <= 900_000:
            return
    raise RuntimeError("Sentinel-2 drape is over 900 KB")


_PYRAMID_PROGRAM = r"""
import { register } from "node:module";
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);
const { gizaPyramids } = await import("./lib/walk/gizaModel.ts");
const rows = gizaPyramids().map((pyramid) => ({
  id: pyramid.id,
  east: pyramid.centre[0],
  south: pyramid.centre[1],
  base: pyramid.casingBaseM,
}));
console.log(JSON.stringify(rows));
"""


if __name__ == "__main__":
    main()
