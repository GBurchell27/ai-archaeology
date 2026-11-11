"""Turn a DEM grid and Sentinel reflectance into small viewer textures."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from ai_archaeology.relief import (
    hillshade,
    local_relief,
    multidirectional_hillshade,
    sky_view_factor,
    slope,
)

HILLSHADE_AZIMUTH = 315.0
HILLSHADE_ALTITUDE = 45.0
MULTI_DIRECTIONS = 8
SVF_DIRECTIONS = 8
REGION_RELIEF_RADIUS_M = 1800.0
REGION_SVF_RADIUS_M = 2400.0
SITE_RELIEF_RADIUS_M = 360.0
SITE_SVF_RADIUS_M = 480.0


def write_terrain_textures(
    elevation: np.ndarray,
    row_metres: float,
    column_metres: float,
    red: np.ndarray,
    green: np.ndarray,
    blue: np.ndarray,
    nir: np.ndarray,
    out_dir: Path,
    *,
    relief_radius_m: float,
    svf_radius_m: float,
) -> dict[str, float]:
    """Write height.u16 and JPEG layers. Returns the absolute elevation range."""
    out_dir.mkdir(parents=True, exist_ok=True)
    spacing = (row_metres, column_metres)
    _write_jpeg(out_dir / "hillshade.jpg", _gray(hillshade(
        elevation, spacing, azimuth=HILLSHADE_AZIMUTH, altitude=HILLSHADE_ALTITUDE
    ), 0.0, 1.0))
    _write_jpeg(out_dir / "multidirectional-hillshade.jpg", _gray(multidirectional_hillshade(
        elevation, spacing, altitude=HILLSHADE_ALTITUDE, n_directions=MULTI_DIRECTIONS
    ), 0.0, 1.0))
    slope_degrees = slope(elevation, spacing)
    slope_max = max(float(np.nanpercentile(slope_degrees, 98)), 5.0)
    _write_jpeg(out_dir / "slope.jpg", _slope_color(slope_degrees, slope_max))
    residual = local_relief(elevation, spacing, relief_radius_m)
    relief_limit = max(float(np.nanpercentile(np.abs(residual), 98)), 1.0)
    _write_jpeg(out_dir / "local-relief.jpg", _diverging(residual, relief_limit))
    view = sky_view_factor(elevation, spacing, svf_radius_m, n_directions=SVF_DIRECTIONS)
    low, high = np.nanpercentile(view, (2, 98))
    _write_jpeg(out_dir / "sky-view-factor.jpg", _gray(view, float(low), float(max(high, low + 1e-3))))
    _write_jpeg(out_dir / "true-colour.jpg", _stretch_rgb(red, green, blue))
    _write_jpeg(out_dir / "false-colour.jpg", _stretch_rgb(nir, red, green))
    _write_jpeg(out_dir / "ndvi.jpg", _ndvi_color(red, nir))
    return _write_height(out_dir / "height.u16", elevation)


def raster_names() -> dict[str, str]:
    return {
        "hillshade": "hillshade.jpg",
        "multidirectional-hillshade": "multidirectional-hillshade.jpg",
        "slope": "slope.jpg",
        "local-relief": "local-relief.jpg",
        "sky-view-factor": "sky-view-factor.jpg",
        "true-colour": "true-colour.jpg",
        "false-colour": "false-colour.jpg",
        "ndvi": "ndvi.jpg",
    }


def layer_catalog() -> list[dict[str, str]]:
    return [
        {
            "id": "shaded",
            "title": "Shaded relief",
            "kind": "procedural",
            "description": "Live colour from elevation, lit by the sun sliders. This is the view to turn as you change the light.",
        },
        {
            "id": "hillshade",
            "title": "Hillshade",
            "kind": "raster",
            "description": "Lambert hillshade from ai_archaeology.relief, azimuth 315° and altitude 45°. Central differences, display image.",
        },
        {
            "id": "multidirectional-hillshade",
            "title": "Multi-directional hillshade",
            "kind": "raster",
            "description": "Mean of eight hillshades. Softer than a single sun direction, still only the surface shape.",
        },
        {
            "id": "slope",
            "title": "Slope",
            "kind": "raster",
            "description": "Slope in degrees, stretched for display. Pale is flat, brown is steeper.",
        },
        {
            "id": "local-relief",
            "title": "Local relief",
            "kind": "raster",
            "description": "DEM minus a circular mean. Blue is locally low, red is locally high. Overview radius 1.8 km; site tiles 360 m.",
        },
        {
            "id": "sky-view-factor",
            "title": "Sky-view factor",
            "kind": "raster",
            "description": "Horizon search, eight directions, display-stretched. Darker ground sees less sky. Overview radius 2.4 km; site tiles 480 m.",
        },
        {
            "id": "true-colour",
            "title": "Sentinel-2 true colour",
            "kind": "raster",
            "description": "L2A red, green, and blue, display-stretched. One low-cloud day, not a multi-year composite.",
        },
        {
            "id": "false-colour",
            "title": "Sentinel-2 false colour",
            "kind": "raster",
            "description": "Near-infrared, red, and green. Vegetation tends to read red in this combination.",
        },
        {
            "id": "ndvi",
            "title": "NDVI",
            "kind": "raster",
            "description": "(NIR − red) / (NIR + red). Brown is bare or dry, green is vegetated. A display ramp, not a field measurement.",
        },
        {
            "id": "corona",
            "title": "CORONA",
            "kind": "placeholder",
            "description": "CORONA Atlas imagery is not included yet. This slot is reserved for later rectified KH-4B frames.",
        },
    ]


def _write_height(path: Path, elevation: np.ndarray) -> dict[str, float]:
    finite = elevation[np.isfinite(elevation)]
    lowest = float(np.min(finite))
    highest = float(np.max(finite))
    span = max(highest - lowest, 1e-6)
    scaled = np.clip(np.round((elevation - lowest) / span * 65535.0), 0, 65535)
    path.write_bytes(np.asarray(scaled, dtype="<u2").tobytes())
    return {"min": lowest, "max": highest}


def _write_jpeg(path: Path, rgb: np.ndarray) -> None:
    image = Image.fromarray(np.asarray(rgb, dtype=np.uint8), mode="RGB")
    image.save(path, format="JPEG", quality=84, optimize=True)


def _gray(values: np.ndarray, low: float, high: float) -> np.ndarray:
    scale = np.clip((values - low) / max(high - low, 1e-6), 0.0, 1.0)
    channel = np.round(scale * 255.0).astype(np.uint8)
    return np.dstack([channel, channel, channel])


def _slope_color(degrees: np.ndarray, high: float) -> np.ndarray:
    mix = np.clip(degrees / high, 0.0, 1.0)[..., None]
    flat = np.array([236, 226, 206], dtype=np.float32)
    steep = np.array([102, 64, 36], dtype=np.float32)
    return np.round(flat * (1.0 - mix) + steep * mix).astype(np.uint8)


def _diverging(values: np.ndarray, limit: float) -> np.ndarray:
    balance = np.clip(values / limit, -1.0, 1.0)
    low = np.array([38, 86, 140], dtype=np.float32)
    mid = np.array([244, 238, 226], dtype=np.float32)
    high = np.array([158, 54, 42], dtype=np.float32)
    weight = np.abs(balance)[..., None]
    endpoint = np.where(balance[..., None] >= 0.0, high, low)
    return np.round(mid * (1.0 - weight) + endpoint * weight).astype(np.uint8)


def _stretch_rgb(red: np.ndarray, green: np.ndarray, blue: np.ndarray) -> np.ndarray:
    channels = [_stretch_channel(np.where(np.isfinite(band), band, np.nan)) for band in (red, green, blue)]
    return np.dstack(channels)


def _stretch_channel(values: np.ndarray) -> np.ndarray:
    finite = values[np.isfinite(values)]
    if finite.size == 0:
        return np.zeros(values.shape, dtype=np.uint8)
    low, high = np.percentile(finite, (2, 98))
    if high <= low:
        high = low + 1e-6
    scaled = np.clip((values - low) / (high - low), 0.0, 1.0)
    scaled = np.where(np.isfinite(scaled), scaled, 0.0) ** 0.9
    return np.round(scaled * 255.0).astype(np.uint8)


def _ndvi_color(red: np.ndarray, nir: np.ndarray) -> np.ndarray:
    denominator = nir + red
    ndvi = np.where(np.abs(denominator) > 1e-6, (nir - red) / denominator, np.nan)
    stops = (
        (-0.2, (70, 90, 120)),
        (0.05, (150, 110, 70)),
        (0.2, (196, 176, 96)),
        (0.45, (90, 140, 64)),
        (0.75, (24, 90, 48)),
    )
    return _ramp(ndvi, stops)


def _ramp(values: np.ndarray, stops: tuple[tuple[float, tuple[int, int, int]], ...]) -> np.ndarray:
    flat = np.where(np.isfinite(values), values, stops[0][0])
    red = np.interp(flat, [stop[0] for stop in stops], [stop[1][0] for stop in stops])
    green = np.interp(flat, [stop[0] for stop in stops], [stop[1][1] for stop in stops])
    blue = np.interp(flat, [stop[0] for stop in stops], [stop[1][2] for stop in stops])
    rgb = np.dstack([red, green, blue])
    rgb[~np.isfinite(values)] = 30
    return np.clip(np.round(rgb), 0, 255).astype(np.uint8)
