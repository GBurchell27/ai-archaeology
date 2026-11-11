"""Build the national Turkey terrain and copy Şanlıurfa detail tiles.

Run from the repository root:

    .venv/bin/python Anatolia/atlas/scripts/build_atlas_terrain.py

Reads Copernicus DEM GLO-90 COGs and EOX Sentinel-2 cloudless tiles.
Does not write raw GeoTIFFs. Web images go to Anatolia/atlas/public/terrain.
"""

from __future__ import annotations

import json
import math
import os
import shutil
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "40")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "2")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff")

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.merge import merge
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "src"))
from ai_archaeology.relief import hillshade  # noqa: E402

WEST, SOUTH, EAST, NORTH = 25.5, 35.8, 45.0, 42.2
STEP = 0.01
TARGET_M = 1000.0
MAX_DIM = 1700
DST = "EPSG:3857"
OUT = REPO / "Anatolia" / "atlas" / "public" / "terrain"
SITES = REPO / "Anatolia" / "atlas" / "public" / "sites.geojson"
SANLIURFA = REPO / "Anatolia" / "explorer" / "public" / "terrain"
EOX = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"
DEM_CREDIT = (
    "Contains modified Copernicus DEM data © DLR e.V. 2010-2014 and © Airbus Defence "
    "and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA"
)
SAT_CREDIT = (
    "Sentinel-2 cloudless 2020 by EOX IT Services GmbH (CC BY 4.0). "
    "Contains modified Copernicus Sentinel data 2020. https://s2maps.eu"
)


def main() -> None:
    print("mosaic GLO-90", flush=True)
    geographic, geo_transform = mosaic_glo90()
    print(f"  geographic {geographic.shape[1]} x {geographic.shape[0]}", flush=True)
    grid, dst_transform, pixel_m = warp_national(geographic, geo_transform)
    print(f"  web grid {grid.shape[1]} x {grid.shape[0]} at {pixel_m:.0f} m", flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    national = OUT / "national"
    national.mkdir(parents=True, exist_ok=True)
    elevation = write_height(national / "height.u16", grid)
    shade = hillshade(grid, (pixel_m, pixel_m), azimuth=315, altitude=45)
    Image.fromarray(gray(shade), "RGB").save(national / "hillshade.jpg", quality=80, optimize=True)
    Image.fromarray(hypsometric(grid), "RGB").save(national / "hypsometric.jpg", quality=80, optimize=True)
    left, bottom, right, top = bounds_of(dst_transform, grid.shape[1], grid.shape[0])
    print("satellite mosaic", flush=True)
    satellite(left, bottom, right, top, grid.shape[1], grid.shape[0], national / "satellite.jpg")
    sites = json.loads(SITES.read_text())
    details = {}
    details.update(copy_sanliurfa())
    details.update(crusader_details(sites, geographic, geo_transform))
    metadata = {
        "crs": DST,
        "bounds": [left, bottom, right, top],
        "width": int(grid.shape[1]),
        "height": int(grid.shape[0]),
        "pixelSizeM": pixel_m,
        "elevation": elevation,
        "heightFile": "national/height.u16",
        "rasters": {
            "relief": "national/hillshade.jpg",
            "hypsometric": "national/hypsometric.jpg",
            "satellite": "national/satellite.jpg",
        },
        "attribution": {"dem": DEM_CREDIT, "satellite": SAT_CREDIT},
        "honestNote": (
            f"National terrain cells are about {pixel_m:.0f} m. They show ranges and plains, not buildings. "
            "Şanlıurfa site tiles are 30 m and still cannot resolve individual enclosures."
        ),
        "details": details,
    }
    (OUT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    total = sum(path.stat().st_size for path in OUT.rglob("*") if path.is_file())
    print(f"wrote {OUT} ({total / 1_048_576:.1f} MB)", flush=True)


def mosaic_glo90() -> tuple[np.ndarray, rasterio.Affine]:
    width = int(round((EAST - WEST) / STEP))
    height = int(round((NORTH - SOUTH) / STEP))
    destination = np.full((height, width), np.nan, dtype=np.float32)
    transform = from_bounds(WEST, SOUTH, EAST, NORTH, width, height)
    tiles = [(lat, lon) for lat in range(35, 43) for lon in range(25, 45)]
    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(read_tile, lat, lon) for lat, lon in tiles]
        for future in as_completed(futures):
            done += 1
            if done % 20 == 0:
                print(f"  tiles {done}/{len(tiles)}", flush=True)
            piece = future.result()
            if piece is None:
                continue
            array, left, bottom, right, top = piece
            source_transform = from_bounds(left, bottom, right, top, array.shape[1], array.shape[0])
            staged = np.full_like(destination, np.nan)
            reproject(
                source=array,
                destination=staged,
                src_transform=source_transform,
                src_crs="EPSG:4326",
                src_nodata=np.nan,
                dst_transform=transform,
                dst_crs="EPSG:4326",
                resampling=Resampling.bilinear,
            )
            finite = np.isfinite(staged)
            destination[finite] = staged[finite]
    destination[destination < -1000] = np.nan
    missing = float(np.mean(~np.isfinite(destination)))
    print(f"  empty fraction before sea fill {missing:.1%}", flush=True)
    destination[~np.isfinite(destination)] = 0.0
    return destination, transform


def read_tile(lat: int, lon: int):
    name = f"Copernicus_DSM_COG_30_N{lat}_00_E{lon:03d}_00_DEM"
    url = f"https://copernicus-dem-90m.s3.amazonaws.com/{name}/{name}.tif"
    try:
        with rasterio.open(url) as source:
            array = source.read(1, out_shape=(100, 100), resampling=Resampling.average).astype(np.float32)
            bounds = source.bounds
    except Exception:
        return None
    array[array < -1000] = np.nan
    return array, bounds.left, bounds.bottom, bounds.right, bounds.top


def warp_national(grid: np.ndarray, transform: rasterio.Affine):
    left, bottom, right, top = transform_bounds("EPSG:4326", DST, WEST, SOUTH, EAST, NORTH)
    span = max(right - left, top - bottom)
    pixel = max(TARGET_M, span / MAX_DIM)
    width = max(2, int(round((right - left) / pixel)))
    height = max(2, int(round((top - bottom) / pixel)))
    dst_transform = from_bounds(left, bottom, right, top, width, height)
    destination = np.zeros((height, width), dtype=np.float32)
    reproject(
        source=grid,
        destination=destination,
        src_transform=transform,
        src_crs="EPSG:4326",
        dst_transform=dst_transform,
        dst_crs=DST,
        resampling=Resampling.bilinear,
    )
    actual = abs(float(dst_transform.a))
    return destination, dst_transform, actual


def satellite(left: float, bottom: float, right: float, top: float, width: int, height: int, path: Path) -> None:
    zoom = 7
    x0, y_north = world_to_tile(mercator_to_lon(left), mercator_to_lat(top), zoom)
    x1, y_south = world_to_tile(mercator_to_lon(right), mercator_to_lat(bottom), zoom)
    xs = range(math.floor(min(x0, x1)), math.floor(max(x0, x1)) + 1)
    ys = range(math.floor(min(y_north, y_south)), math.floor(max(y_north, y_south)) + 1)
    tile = 256
    mosaic = Image.new("RGB", (len(xs) * tile, len(ys) * tile))
    for row, y_index in enumerate(ys):
        for column, x_index in enumerate(xs):
            image = fetch_jpeg(EOX.format(z=zoom, y=y_index, x=x_index))
            mosaic.paste(image, (column * tile, row * tile))
    west, north = tile_origin(xs[0], ys[0], zoom)
    east, south = tile_origin(xs[-1] + 1, ys[-1] + 1, zoom)
    scale_x = mosaic.width / (east - west)
    scale_y = mosaic.height / (north - south)
    crop_left = int((left - west) * scale_x)
    crop_top = int((north - top) * scale_y)
    crop_right = int((right - west) * scale_x)
    crop_bottom = int((north - bottom) * scale_y)
    cropped = mosaic.crop((crop_left, crop_top, crop_right, crop_bottom))
    cropped.resize((width, height), Image.Resampling.BILINEAR).save(path, quality=78, optimize=True)


def copy_sanliurfa() -> dict:
    meta_path = SANLIURFA / "metadata.json"
    if not meta_path.exists():
        print("  no Şanlıurfa tiles to copy", flush=True)
        return {}
    source_meta = json.loads(meta_path.read_text())
    copied = {}
    for site in source_meta["sites"]:
        site_id = site["id"]
        destination = OUT / "details" / site_id
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(SANLIURFA / "sites" / site_id, destination)
        left, bottom, right, top = transform_bounds("EPSG:32637", DST, *site["bounds"])
        rasters = {key: f"details/{site_id}/{Path(name).name}" for key, name in site["rasters"].items()}
        copied[site_id] = {
            "bounds": [left, bottom, right, top],
            "width": site["width"],
            "height": site["height"],
            "pixelSizeM": site["pixelSizeM"],
            "elevation": site["elevation"],
            "rasters": rasters,
        }
        print(f"  copied {site_id}", flush=True)
    return copied


def crusader_details(sites: dict, geographic: np.ndarray, transform: rasterio.Affine) -> dict:
    """Finer GLO-90 windows for crusader pins. Şanlıurfa tiles already cover the Neolithic set."""
    del geographic, transform
    details = {}
    for feature in sites["features"]:
        if feature["properties"]["layer"] != "crusader":
            continue
        site_id = feature["id"]
        longitude, latitude = feature["geometry"]["coordinates"]
        window = read_site_window(longitude, latitude)
        if window is None:
            print(f"  no detail for {site_id}", flush=True)
            continue
        array, left, bottom, right, top = window
        print(f"  detail {site_id}", flush=True)
        out_dir = OUT / "details" / site_id
        out_dir.mkdir(parents=True, exist_ok=True)
        elevation = write_height(out_dir / "height.u16", array)
        pixel = (right - left) / array.shape[1]
        shade = hillshade(array, (abs((top - bottom) / array.shape[0]), pixel), azimuth=315, altitude=45)
        Image.fromarray(gray(shade), "RGB").save(out_dir / "hillshade.jpg", quality=82, optimize=True)
        Image.fromarray(hypsometric(array), "RGB").save(out_dir / "hypsometric.jpg", quality=82, optimize=True)
        details[site_id] = {
            "bounds": [left, bottom, right, top],
            "width": int(array.shape[1]),
            "height": int(array.shape[0]),
            "pixelSizeM": pixel,
            "elevation": elevation,
            "rasters": {
                "hillshade": f"details/{site_id}/hillshade.jpg",
                "hypsometric": f"details/{site_id}/hypsometric.jpg",
            },
        }
    return details


def read_site_window(longitude: float, latitude: float):
    """About 15 km of GLO-90 around a published point, including tiles the box crosses."""
    span = 0.14
    left, right = longitude - span / 2, longitude + span / 2
    bottom, top = latitude - span / 2, latitude + span / 2
    datasets = []
    for lat_tile in range(math.floor(bottom), math.floor(top) + 1):
        for lon_tile in range(math.floor(left), math.floor(right) + 1):
            name = f"Copernicus_DSM_COG_30_N{lat_tile}_00_E{lon_tile:03d}_00_DEM"
            url = f"https://copernicus-dem-90m.s3.amazonaws.com/{name}/{name}.tif"
            try:
                datasets.append(rasterio.open(url))
            except Exception:
                continue
    if not datasets:
        return None
    try:
        mosaic, _mosaic_transform = merge(datasets, bounds=(left, bottom, right, top), nodata=-9999, dtype="float32")
    finally:
        for dataset in datasets:
            dataset.close()
    source = mosaic[0].astype(np.float32)
    source[source < -1000] = np.nan
    array = np.zeros((80, 80), dtype=np.float32)
    reproject(
        source=np.where(np.isfinite(source), source, 0),
        destination=array,
        src_transform=from_bounds(left, bottom, right, top, source.shape[1], source.shape[0]),
        src_crs="EPSG:4326",
        dst_transform=from_bounds(left, bottom, right, top, 80, 80),
        dst_crs="EPSG:4326",
        resampling=Resampling.bilinear,
    )
    mercator = transform_bounds("EPSG:4326", DST, left, bottom, right, top)
    return array, mercator[0], mercator[1], mercator[2], mercator[3]


def write_height(path: Path, grid: np.ndarray) -> dict[str, float]:
    lowest = float(np.min(grid))
    highest = float(np.max(grid))
    span = max(highest - lowest, 1.0)
    scaled = np.clip(np.round((grid - lowest) / span * 65535.0), 0, 65535).astype("<u2")
    path.write_bytes(scaled.tobytes())
    return {"min": lowest, "max": highest}


def gray(values: np.ndarray) -> np.ndarray:
    channel = np.clip(np.round(values * 255.0), 0, 255).astype(np.uint8)
    return np.dstack([channel, channel, channel])


def hypsometric(grid: np.ndarray) -> np.ndarray:
    stops = (
        (0, (48, 78, 92)),
        (50, (92, 112, 78)),
        (400, (166, 132, 78)),
        (1200, (196, 176, 140)),
        (2500, (232, 228, 220)),
        (5200, (250, 250, 250)),
    )
    red = np.interp(grid, [item[0] for item in stops], [item[1][0] for item in stops])
    green = np.interp(grid, [item[0] for item in stops], [item[1][1] for item in stops])
    blue = np.interp(grid, [item[0] for item in stops], [item[1][2] for item in stops])
    return np.clip(np.dstack([red, green, blue]), 0, 255).astype(np.uint8)


def bounds_of(transform, width: int, height: int):
    left = transform.c
    top = transform.f
    right = left + transform.a * width
    bottom = top + transform.e * height
    return left, bottom, right, top


def world_to_tile(lon: float, lat: float, zoom: int) -> tuple[float, float]:
    scale = 2**zoom
    x_index = (lon + 180.0) / 360.0 * scale
    latitude = math.radians(lat)
    y_index = (1 - math.asinh(math.tan(latitude)) / math.pi) / 2 * scale
    return x_index, y_index


def tile_origin(x_index: int, y_index: int, zoom: int) -> tuple[float, float]:
    """Web-mercator corner of an XYZ tile. Y index grows southward."""
    scale = 2**zoom
    longitude = x_index / scale * 360.0 - 180.0
    mercator_angle = math.pi * (1 - 2 * y_index / scale)
    latitude = math.degrees(math.atan(math.sinh(mercator_angle)))
    radius = 6378137.0
    x_coord = radius * math.radians(longitude)
    y_coord = radius * math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))
    return x_coord, y_coord


def mercator_to_lon(x_coord: float) -> float:
    return math.degrees(x_coord / 6378137.0)


def mercator_to_lat(y_coord: float) -> float:
    return math.degrees(2 * math.atan(math.exp(y_coord / 6378137.0)) - math.pi / 2)


def fetch_jpeg(url: str) -> Image.Image:
    request = urllib.request.Request(url, headers={"User-Agent": "ai-archaeology-atlas/0.1"})
    with urllib.request.urlopen(request, timeout=40) as response:
        return Image.open(response).convert("RGB")


if __name__ == "__main__":
    main()
