"""Build the national Turkey terrain and copy Şanlıurfa detail tiles.

Run from the repository root:

    .venv/bin/python Anatolia/atlas/scripts/build_atlas_terrain.py

Reads Copernicus DEM GLO-90 COGs and EOX Sentinel-2 cloudless tiles.
Does not write raw GeoTIFFs. Web images go to Anatolia/atlas/public/terrain.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import sys
import re
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

USER_AGENT = "ai-archaeology-atlas/0.1"
DEM_HOST = "copernicus-dem-30m.s3.amazonaws.com"

os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "40")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "2")
os.environ.setdefault("GDAL_HTTP_USERAGENT", USER_AGENT)
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff")

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import Affine, from_bounds
from rasterio.warp import reproject, transform_bounds

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(REPO / "src"))
import cog_range  # noqa: E402
from ai_archaeology.dem_window import clean_elevation_window  # noqa: E402
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
    "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH "
    "(Contains modified Copernicus Sentinel data 2020) — CC BY-NC-SA 4.0"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--details-only", action="store_true")
    args = parser.parse_args()
    if args.details_only:
        refresh_site_details()
        return
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
    satellite(left, bottom, right, top, grid.shape[1], grid.shape[0], national / "satellite.jpg", zoom=7)
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


def refresh_site_details() -> None:
    """Replace Crusader windows with ~10 km GLO-30 tiles. Keeps the national mosaic."""
    metadata_path = OUT / "metadata.json"
    metadata = json.loads(metadata_path.read_text())
    sites = json.loads(SITES.read_text())
    details = {key: value for key, value in metadata["details"].items() if key not in {
        feature["id"] for feature in sites["features"] if feature["properties"]["layer"] == "crusader"
    }}
    details.update(copy_sanliurfa())
    details.update(crusader_details(sites))
    metadata["details"] = details
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
    total = sum(path.stat().st_size for path in OUT.rglob("*") if path.is_file())
    print(f"updated details in {OUT} ({total / 1_048_576:.1f} MB)", flush=True)


def satellite(left: float, bottom: float, right: float, top: float, width: int, height: int, path: Path, zoom: int = 7) -> None:
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


def crusader_details(sites: dict, geographic: np.ndarray | None = None, transform: rasterio.Affine | None = None) -> dict:
    """About 10 km of GLO-30 around each Crusader pin, plus an EOX cloudless drape."""
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
        Image.fromarray(gray(shade), "RGB").save(out_dir / "hillshade.jpg", quality=86, optimize=True)
        Image.fromarray(hypsometric(array), "RGB").save(out_dir / "hypsometric.jpg", quality=86, optimize=True)
        satellite(left, bottom, right, top, array.shape[1], array.shape[0], out_dir / "satellite.jpg", zoom=11)
        details[site_id] = {
            "bounds": [left, bottom, right, top],
            "width": int(array.shape[1]),
            "height": int(array.shape[0]),
            "pixelSizeM": pixel,
            "elevation": elevation,
            "rasters": {
                "hillshade": f"details/{site_id}/hillshade.jpg",
                "hypsometric": f"details/{site_id}/hypsometric.jpg",
                "satellite": f"details/{site_id}/satellite.jpg",
            },
        }
    return details


JPEG_MAX_BYTES = 2 * 1024 * 1024
CONTENT_RANGE = re.compile(r"bytes (\d+)-(\d+)/(\d+|\*)", re.IGNORECASE)
RANGE_REQUEST = re.compile(r"bytes=(\d+)-(\d+)")


def validate_content_range(header: str | None, start: int, end: int) -> None:
    """A 206 body must be the exact byte interval that was requested."""
    if header is None:
        raise RuntimeError("missing content range")
    match = CONTENT_RANGE.fullmatch(header.strip())
    if match is None or int(match.group(1)) != start or int(match.group(2)) != end:
        raise RuntimeError("content range does not match the request")
    total = match.group(3)
    if total != "*" and int(total) <= end:
        raise RuntimeError("content range does not match the request")


def endpoint(url: str) -> tuple[str, str, int]:
    """Scheme, lowercase host, and port. HTTPS defaults to 443 and HTTP to 80."""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in {"https", "http"} or not parts.hostname:
        raise urllib.error.URLError("redirect left the original host")
    if parts.port is not None:
        port = parts.port
    else:
        port = 443 if parts.scheme == "https" else 80
    return parts.scheme, parts.hostname.lower(), port


class SameHostRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only when scheme, host, and port all stay the same."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if endpoint(req.full_url) != endpoint(newurl):
            raise urllib.error.URLError("redirect left the original host")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def read_pinned(url: str, timeout: float = 40, max_bytes: int = JPEG_MAX_BYTES, extra_headers: dict | None = None, require_range: bool = False) -> bytes:
    """GET a URL, refusing a redirect that changes scheme, host, or port.

    The body is capped at `max_bytes`. A ranged read must come back as 206;
    a 200 that ignores Range would be the whole object.
    """
    headers = {"User-Agent": USER_AGENT}
    if extra_headers:
        headers.update(extra_headers)
    request = urllib.request.Request(url, headers=headers)
    opener = urllib.request.build_opener(SameHostRedirectHandler)
    with opener.open(request, timeout=timeout) as response:
        status = getattr(response, "status", None) or response.getcode()
        if require_range and status != 206:
            raise RuntimeError("server ignored the range request")
        if require_range:
            requested = RANGE_REQUEST.fullmatch((extra_headers or {}).get("Range", ""))
            if requested is None:
                raise RuntimeError("missing content range")
            validate_content_range(response.headers.get("Content-Range"), int(requested.group(1)), int(requested.group(2)))
        declared = response.headers.get("Content-Length")
        if declared is not None and int(declared) > max_bytes:
            raise RuntimeError("download exceeded the byte cap")
        body = bytearray()
        while len(body) <= max_bytes:
            block = response.read(min(64 * 1024, max_bytes - len(body) + 1))
            if not block:
                break
            body.extend(block)
        if len(body) > max_bytes:
            raise RuntimeError("download exceeded the byte cap")
        return bytes(body)


def read_dem_window(url: str, west: float, south: float, east: float, north: float):
    """The lon/lat window of one GLO-30 COG, via Range requests under the byte cap."""
    if endpoint(url) != ("https", DEM_HOST, 443):
        raise ValueError("unexpected DEM host")

    def fetch(start: int, end: int) -> bytes:
        return read_pinned(
            url,
            timeout=40,
            max_bytes=end - start + 1,
            extra_headers={"Range": f"bytes={start}-{end}"},
            require_range=True,
        )

    return cog_range.read_window(fetch, west, south, east, north, cog_range.MAX_COG_BYTES)


def read_site_window(longitude: float, latitude: float):
    """A 10 km GLO-30 window, about 40 m cells, including any tile the box crosses."""
    centre_x, centre_y = _mercator(longitude, latitude)
    half = 5000.0
    left, bottom, right, top = centre_x - half, centre_y - half, centre_x + half, centre_y + half
    west, south = _inverse(left, bottom)
    east, north = _inverse(right, top)
    sources = []
    for lat_tile in range(math.floor(south), math.floor(north) + 1):
        for lon_tile in range(math.floor(west), math.floor(east) + 1):
            name = f"Copernicus_DSM_COG_10_N{lat_tile}_00_E{lon_tile:03d}_00_DEM"
            url = f"https://{DEM_HOST}/{name}/{name}.tif"
            try:
                window = read_dem_window(url, west, south, east, north)
            except Exception:
                continue
            if window is not None:
                sources.append(window)
    if not sources:
        return None
    pixels = 256
    array = np.full((pixels, pixels), np.nan, dtype=np.float32)
    dst_transform = from_bounds(left, bottom, right, top, pixels, pixels)
    for source, (scale_x, origin_x, scale_y, origin_y) in sources:
        staged = np.full_like(array, np.nan)
        reproject(
            source=source,
            destination=staged,
            src_transform=Affine(scale_x, 0.0, origin_x, 0.0, -scale_y, origin_y),
            src_crs="EPSG:4326",
            src_nodata=np.nan,
            dst_transform=dst_transform,
            dst_crs=DST,
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
        finite = np.isfinite(staged) & (staged > -1000) & (staged < 5500)
        array[finite] = staged[finite]
    try:
        array = clean_elevation_window(array)
    except ValueError:
        return None
    return array, left, bottom, right, top


def _mercator(longitude: float, latitude: float) -> tuple[float, float]:
    radius = 6378137.0
    x_coord = radius * math.radians(longitude)
    y_coord = radius * math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))
    return x_coord, y_coord


def _inverse(x_coord: float, y_coord: float) -> tuple[float, float]:
    radius = 6378137.0
    longitude = math.degrees(x_coord / radius)
    latitude = math.degrees(2 * math.atan(math.exp(y_coord / radius)) - math.pi / 2)
    return longitude, latitude


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
    from io import BytesIO
    return Image.open(BytesIO(read_pinned(url, timeout=40, max_bytes=JPEG_MAX_BYTES))).convert("RGB")


if __name__ == "__main__":
    main()
