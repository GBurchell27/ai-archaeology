"""JPEG previews of a place-relief grid. Colours match the explorer export."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from ai_archaeology.relief import hillshade, local_relief, multidirectional_hillshade, sky_view_factor, slope

AZIMUTH = 315.0
ALTITUDE = 45.0
RELIEF_RADIUS_M = 360.0
SVF_RADIUS_M = 480.0


def write_hillshade(path: Path, elevation: np.ndarray, pixel_m: float) -> None:
    shaded = hillshade(elevation, pixel_m, azimuth=AZIMUTH, altitude=ALTITUDE)
    _write(path, _gray(shaded, 0.0, 1.0))


def write_hypsometric(path: Path, elevation: np.ndarray) -> None:
    _write(path, _hypsometric(elevation))


def write_derivatives(path_for, elevation: np.ndarray, pixel_m: float, keys: set[str]) -> None:
    """Write the derivative JPEGs whose names are in ``keys``."""
    spacing = (pixel_m, pixel_m)
    if "multidirectional-hillshade" in keys:
        image = multidirectional_hillshade(elevation, spacing, altitude=ALTITUDE, n_directions=8)
        _write(path_for("multidirectional-hillshade"), _gray(image, 0.0, 1.0))
    if "slope" in keys:
        degrees = slope(elevation, spacing)
        high = max(float(np.nanpercentile(degrees, 98)), 5.0)
        _write(path_for("slope"), _slope_color(degrees, high))
    if "local-relief" in keys:
        residual = local_relief(elevation, spacing, RELIEF_RADIUS_M)
        limit = max(float(np.nanpercentile(np.abs(residual), 98)), 1.0)
        _write(path_for("local-relief"), _diverging(residual, limit))
    if "sky-view-factor" in keys:
        view = sky_view_factor(elevation, spacing, SVF_RADIUS_M, n_directions=8)
        low, high = np.nanpercentile(view, (2, 98))
        _write(path_for("sky-view-factor"), _gray(view, float(low), float(max(high, low + 1e-3))))


def _write(path: Path, rgb: np.ndarray) -> None:
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


def _hypsometric(grid: np.ndarray) -> np.ndarray:
    stops = (
        (0, (48, 78, 92)),
        (50, (92, 112, 78)),
        (400, (166, 132, 78)),
        (1200, (196, 176, 140)),
        (2500, (232, 228, 220)),
        (5200, (250, 250, 250)),
    )
    levels = [item[0] for item in stops]
    red = np.interp(grid, levels, [item[1][0] for item in stops])
    green = np.interp(grid, levels, [item[1][1] for item in stops])
    blue = np.interp(grid, levels, [item[1][2] for item in stops])
    return np.clip(np.dstack([red, green, blue]), 0, 255).astype(np.uint8)
