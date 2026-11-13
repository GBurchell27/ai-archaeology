"""Reproject the existing Şanlıurfa web assets into the atlas without network access."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform

from build_atlas_terrain import DST, OUT, SANLIURFA, hypsometric, write_height

DIRECTORY = "regions/sanliurfa"


def build_region() -> Path:
    source = json.loads((SANLIURFA / "metadata.json").read_text(encoding="utf-8"))
    record = source["region"]
    width, height = record["width"], record["height"]
    crs = source["crs"]
    bounds = inner_mercator_bounds(record["bounds"], crs)
    src_transform = from_bounds(*record["bounds"], width, height)
    dst_transform = from_bounds(*bounds, width, height)

    def warp(values: np.ndarray) -> np.ndarray:
        result = np.full(values.shape, np.nan, dtype=np.float32)
        reproject(
            values, result, src_crs=crs, src_transform=src_transform,
            dst_crs=DST, dst_transform=dst_transform, dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
        if not np.isfinite(result).all():
            raise ValueError("The Şanlıurfa atlas window extends outside the source grid")
        return result

    encoded = np.fromfile(SANLIURFA / "region" / "height.u16", dtype="<u2").reshape(height, width)
    low, high = record["elevation"]["min"], record["elevation"]["max"]
    grid = warp(low + encoded.astype(np.float32) * ((high - low) / 65535))
    destination = OUT / DIRECTORY
    destination.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=destination) as directory:
        staging = Path(directory)
        elevation = write_height(staging / "height.u16", grid)
        tint = Image.fromarray(hypsometric(grid))
        rasters = {
            "terrain": f"{DIRECTORY}/terrain.jpg",
            "hypsometric": f"{DIRECTORY}/hypsometric.jpg",
        }
        tint.save(staging / "hypsometric.jpg", quality=90)
        for layer, path in record["rasters"].items():
            name = Path(path).name
            with Image.open(SANLIURFA / path) as image:
                pixels = np.asarray(image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS))
            rgb = warp(np.moveaxis(pixels, -1, 0))
            Image.fromarray(np.moveaxis(rgb.round().clip(0, 255).astype(np.uint8), 0, -1)).save(
                staging / name, quality=90,
            )
            rasters[layer] = f"{DIRECTORY}/{name}"

        with Image.open(staging / Path(rasters["true-colour"]).name) as satellite:
            Image.blend(tint, satellite, 0.48).save(staging / "terrain.jpg", quality=90)

        manifest = {
            "name": "Şanlıurfa",
            "bounds": bounds,
            "width": width,
            "height": height,
            "pixelSizeM": record["pixelSizeM"],
            "elevation": elevation,
            "heightFile": f"{DIRECTORY}/height.u16",
            "rasters": rasters,
            "sentinelCredit": source["attribution"]["sentinel"],
            "sentinelDay": source["sentinel"]["day"],
        }
        for file in staging.iterdir():
            file.replace(destination / file.name)
        metadata = staging / "metadata.json"
        metadata.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        metadata.replace(destination / metadata.name)
    return destination / "metadata.json"


def inner_mercator_bounds(bounds: list[float], crs: str) -> tuple[float, float, float, float]:
    """Inscribed rectangle with a half-cell margin for bilinear sampling."""
    left, bottom, right, top = bounds
    edge_x = np.linspace(left, right, 33)
    edge_y = np.linspace(bottom, top, 33)
    west, _ = transform(crs, DST, [left] * len(edge_y), edge_y)
    east, _ = transform(crs, DST, [right] * len(edge_y), edge_y)
    _, south = transform(crs, DST, edge_x, [bottom] * len(edge_x))
    _, north = transform(crs, DST, edge_x, [top] * len(edge_x))
    margin = 85
    return max(west) + margin, max(south) + margin, min(east) - margin, min(north) - margin


if __name__ == "__main__":
    print(f"Prepared {build_region()}")
