"""Relief visualisations from a digital elevation model.

Hillshade, slope, local relief, and sky-view factor are ways to *see* a
surface. They do not see through rock or deep sediment, and they are not
detections.

Units: elevations and ``pixel_size`` must use the same horizontal unit,
normally metres. A degree-pixel DEM mixes units and will not be meaningful.

Array orientation for ``north_up`` / ``columns_east``: by default, row 0 is
north and column 0 is west, matching a north-up GeoTIFF.

Non-finite cells are excluded from the result. They are filled with the
median elevation only so the filters can run, which can distort cells that
touch NoData.
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path

import numpy as np
import rasterio
from rasterio.errors import RasterioIOError
from scipy import ndimage

_PREVIEW = {
    "hillshade": ("Hillshade", "gray", "unit"),
    "multidirectional_hillshade": ("Multi-directional hillshade", "gray", "unit"),
    "slope": ("Slope (degrees)", "cividis", "slope"),
    "local_relief": ("Local relief (positive = locally high)", "RdBu_r", "diverging"),
    "sky_view_factor": ("Sky-view factor", "gray", "unit"),
}


def hillshade(
    dem: np.ndarray,
    pixel_size: float | tuple[float, float],
    azimuth: float = 315.0,
    altitude: float = 45.0,
    *,
    north_up: bool = True,
    columns_east: bool = True,
) -> np.ndarray:
    """Lambert cosine hillshade in ``[0, 1]``.

    ``azimuth`` is the direction the light comes from, degrees clockwise from
    north. ``altitude`` is degrees above the horizon. Self-shadowed slopes are
    0. Uses central differences, so values are close to ``gdaldem hillshade``
    but not identical (GDAL uses Horn's method and scales to 1–255).
    """
    _check_altitude(altitude)
    _check_azimuth(azimuth)
    filled, invalid = _finite_work_array(dem)
    shaded = _shade_array(
        filled, pixel_size, azimuth, altitude, north_up, columns_east
    )
    return _restore(shaded, invalid)


def multidirectional_hillshade(
    dem: np.ndarray,
    pixel_size: float | tuple[float, float],
    altitude: float = 45.0,
    n_directions: int = 8,
    azimuths: list[float] | tuple[float, ...] | None = None,
    *,
    north_up: bool = True,
    columns_east: bool = True,
) -> np.ndarray:
    """Mean of hillshades from equally spaced azimuths, still in ``[0, 1]``.

    This is a plain average, not a principal-component blend.
    """
    _check_altitude(altitude)
    if azimuths is None:
        if n_directions < 1:
            raise ValueError("n_directions must be at least 1")
        azimuths = [index * (360.0 / n_directions) for index in range(n_directions)]
    if len(azimuths) < 1:
        raise ValueError("azimuths must not be empty")
    filled, invalid = _finite_work_array(dem)
    row_spacing, col_spacing = _spacing(pixel_size)
    dz_north, dz_east = _gradients(
        filled, row_spacing, col_spacing, north_up, columns_east
    )
    slope_rad, aspect = _slope_and_aspect(dz_north, dz_east)
    layers = [
        _incidence(slope_rad, aspect, azimuth, altitude) for azimuth in azimuths
    ]
    return _restore(np.mean(layers, axis=0), invalid)


def slope(
    dem: np.ndarray,
    pixel_size: float | tuple[float, float],
) -> np.ndarray:
    """Slope magnitude in degrees from horizontal (central differences)."""
    filled, invalid = _finite_work_array(dem)
    row_spacing, col_spacing = _spacing(pixel_size)
    dz_row, dz_col = np.gradient(filled, row_spacing, col_spacing)
    degrees = np.degrees(np.arctan(np.hypot(dz_col, dz_row)))
    return _restore(degrees, invalid)


def local_relief(
    dem: np.ndarray,
    pixel_size: float | tuple[float, float],
    radius: float,
) -> np.ndarray:
    """DEM minus a circular moving mean of the given radius.

    Positive values are locally high (a mound). Negative values are locally
    low (a ditch). This is the simple residual, not Hesse's full local-relief
    model.
    """
    filled, invalid = _finite_work_array(dem)
    smoothed = ndimage.convolve(
        filled, _disk_kernel(radius, *_spacing(pixel_size)), mode="nearest"
    )
    return _restore(filled - smoothed, invalid)


def sky_view_factor(
    dem: np.ndarray,
    pixel_size: float | tuple[float, float],
    radius: float,
    n_directions: int = 16,
) -> np.ndarray:
    """Sky-view factor in ``[0, 1]`` from a horizon search.

    In each direction the horizon is the maximum elevation angle within
    ``radius``. Angles below the horizontal do not obstruct the sky.
    ``SVF = 1 - mean(sin(horizon angle))``, the straightforward form from
    Zakšek, Oštir, and Kokalj (2011), with no vertical exaggeration.
    Depressions read low. Peaks and flat ground read high. This is a picture
    of the surface, not of anything buried.
    """
    if n_directions < 4:
        raise ValueError("n_directions must be at least 4")
    filled, invalid = _finite_work_array(dem)
    row_spacing, col_spacing = _spacing(pixel_size)
    step = min(row_spacing, col_spacing)
    _check_radius(radius, step)
    n_steps = int(np.floor(radius / step))
    mean_sine = _mean_horizon_sine(
        filled, row_spacing, col_spacing, step, n_steps, n_directions
    )
    return _restore(np.clip(1.0 - mean_sine, 0.0, 1.0), invalid)


def write_relief_outputs(
    dem_path: Path | str,
    out_dir: Path | str,
    *,
    azimuth: float = 315.0,
    altitude: float = 45.0,
    multi_directions: int = 8,
    relief_radius: float = 20.0,
    svf_radius: float = 20.0,
    svf_directions: int = 16,
) -> dict[str, Path]:
    """Read a single-band DEM GeoTIFF and write each visualisation.

    Each product is a float32 GeoTIFF with the source CRS and transform, plus
    a PNG preview. Returns the GeoTIFF paths.
    """
    source = _read_dem(Path(dem_path))
    spacing = (source["row_spacing"], source["col_spacing"])
    products = _compute_products(
        source["values"],
        spacing,
        azimuth=azimuth,
        altitude=altitude,
        multi_directions=multi_directions,
        relief_radius=relief_radius,
        svf_radius=svf_radius,
        svf_directions=svf_directions,
        north_up=source["north_up"],
        columns_east=source["columns_east"],
    )
    destination = Path(out_dir)
    destination.mkdir(parents=True, exist_ok=True)
    written: dict[str, Path] = {}
    for name, array in products.items():
        geotiff_path = destination / f"{name}.tif"
        _write_geotiff(geotiff_path, array, source["profile"])
        _write_preview(destination / f"{name}.png", array, name)
        written[name] = geotiff_path
    return written


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for ``python -m ai_archaeology.relief``."""
    args = _parse_args(argv)
    try:
        written = write_relief_outputs(
            args.dem,
            args.out_dir,
            azimuth=args.azimuth,
            altitude=args.altitude,
            multi_directions=args.multi_directions,
            relief_radius=args.relief_radius,
            svf_radius=args.svf_radius,
            svf_directions=args.svf_directions,
        )
    except (ValueError, OSError, RasterioIOError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    for path in written.values():
        print(path)
    return 0


def _compute_products(dem, spacing, **options):
    orientation = {
        "north_up": options["north_up"],
        "columns_east": options["columns_east"],
    }
    return {
        "hillshade": hillshade(
            dem,
            spacing,
            azimuth=options["azimuth"],
            altitude=options["altitude"],
            **orientation,
        ),
        "multidirectional_hillshade": multidirectional_hillshade(
            dem,
            spacing,
            altitude=options["altitude"],
            n_directions=options["multi_directions"],
            **orientation,
        ),
        "slope": slope(dem, spacing),
        "local_relief": local_relief(dem, spacing, options["relief_radius"]),
        "sky_view_factor": sky_view_factor(
            dem, spacing, options["svf_radius"], options["svf_directions"]
        ),
    }


def _shade_array(dem, pixel_size, azimuth, altitude, north_up, columns_east):
    row_spacing, col_spacing = _spacing(pixel_size)
    dz_north, dz_east = _gradients(
        dem, row_spacing, col_spacing, north_up, columns_east
    )
    slope_rad, aspect = _slope_and_aspect(dz_north, dz_east)
    return _incidence(slope_rad, aspect, azimuth, altitude)


def _incidence(slope_rad, aspect, azimuth, altitude):
    altitude_rad = np.radians(altitude)
    azimuth_rad = np.radians(azimuth)
    cosine = np.sin(altitude_rad) * np.cos(slope_rad) + np.cos(altitude_rad) * np.sin(
        slope_rad
    ) * np.cos(azimuth_rad - aspect)
    return np.clip(cosine, 0.0, 1.0)


def _gradients(dem, row_spacing, col_spacing, north_up, columns_east):
    dz_row, dz_col = np.gradient(dem, row_spacing, col_spacing)
    dz_north = -dz_row if north_up else dz_row
    dz_east = dz_col if columns_east else -dz_col
    return dz_north, dz_east


def _slope_and_aspect(dz_north, dz_east):
    """Aspect is the downhill facing direction, clockwise from north."""
    slope_rad = np.arctan(np.hypot(dz_east, dz_north))
    aspect = np.arctan2(-dz_east, -dz_north)
    return slope_rad, np.where(aspect < 0.0, aspect + (2.0 * np.pi), aspect)


def _disk_kernel(radius, row_spacing, col_spacing):
    _check_radius(radius, min(row_spacing, col_spacing))
    row_radius = int(np.floor(radius / row_spacing))
    col_radius = int(np.floor(radius / col_spacing))
    row_offsets = np.arange(-row_radius, row_radius + 1) * row_spacing
    col_offsets = np.arange(-col_radius, col_radius + 1) * col_spacing
    rows, cols = np.meshgrid(row_offsets, col_offsets, indexing="ij")
    weights = ((rows * rows + cols * cols) <= radius * radius).astype(np.float64)
    weights /= weights.sum()
    return weights


def _mean_horizon_sine(grid, row_spacing, col_spacing, step, n_steps, n_directions):
    rows, cols = np.indices(grid.shape)
    sin_sum = np.zeros(grid.shape, dtype=np.float64)
    for index in range(n_directions):
        bearing = 2.0 * np.pi * index / n_directions
        horizon = _horizon_angle(
            grid,
            rows,
            cols,
            north=np.cos(bearing),
            east=np.sin(bearing),
            row_spacing=row_spacing,
            col_spacing=col_spacing,
            step=step,
            n_steps=n_steps,
        )
        sin_sum += np.sin(horizon)
    return sin_sum / n_directions


def _horizon_angle(grid, rows, cols, north, east, row_spacing, col_spacing, step, n_steps):
    """Maximum above-horizon angle along one bearing. Below-horizon stays 0."""
    max_angle = np.zeros(grid.shape, dtype=np.float64)
    # Row 0 is treated as north only for labelling bearings. SVF uses a full
    # circle, so a south-up raster still samples every direction.
    row_per_metre = -north / row_spacing
    col_per_metre = east / col_spacing
    for step_index in range(1, n_steps + 1):
        distance = step_index * step
        sampled = ndimage.map_coordinates(
            grid,
            [rows + row_per_metre * distance, cols + col_per_metre * distance],
            order=1,
            mode="constant",
            cval=np.nan,
        )
        angle = np.arctan2(sampled - grid, distance)
        finite = np.isfinite(angle)
        max_angle = np.where(finite, np.maximum(max_angle, angle), max_angle)
    return max_angle


def _finite_work_array(dem):
    grid = np.asarray(dem, dtype=np.float64)
    if grid.ndim != 2 or grid.size == 0:
        raise ValueError("DEM must be a non-empty 2-D array")
    invalid = ~np.isfinite(grid)
    if not np.any(invalid):
        return grid, invalid
    filled = grid.copy()
    median = np.nanmedian(grid)
    filled[invalid] = 0.0 if not np.isfinite(median) else median
    return filled, invalid


def _restore(result, invalid):
    if not np.any(invalid):
        return result
    restored = np.array(result, dtype=np.float64, copy=True)
    restored[invalid] = np.nan
    return restored


def _spacing(pixel_size):
    if isinstance(pixel_size, (int, float)):
        row_spacing = col_spacing = float(pixel_size)
    else:
        try:
            row_spacing, col_spacing = (float(pixel_size[0]), float(pixel_size[1]))
        except (TypeError, ValueError, IndexError) as exc:
            raise ValueError(
                "pixel_size must be a positive number or (row_spacing, col_spacing)"
            ) from exc
    if (
        not np.isfinite(row_spacing)
        or not np.isfinite(col_spacing)
        or row_spacing <= 0
        or col_spacing <= 0
    ):
        raise ValueError("pixel_size must be positive and finite")
    return row_spacing, col_spacing


def _check_radius(radius, pixel):
    if not np.isfinite(radius) or radius < pixel:
        raise ValueError("radius must be finite and at least one pixel")


def _check_altitude(altitude):
    if not np.isfinite(altitude) or not 0.0 <= altitude <= 90.0:
        raise ValueError("altitude must be between 0 and 90 degrees")


def _check_azimuth(azimuth):
    if not np.isfinite(azimuth):
        raise ValueError("azimuth must be finite")


def _read_dem(path: Path):
    with rasterio.open(path) as src:
        if src.count > 1:
            warnings.warn("DEM has multiple bands; only band 1 is used.", stacklevel=2)
        _warn_about_crs(src.crs, src.transform)
        values = src.read(1).astype(np.float64)
        _apply_nodata(values, src.nodata, src.read_masks(1))
        profile = src.profile.copy()
        row_spacing = abs(float(src.transform.e))
        col_spacing = abs(float(src.transform.a))
    if row_spacing == 0 or col_spacing == 0:
        raise ValueError("DEM transform has a zero pixel size")
    return {
        "values": values,
        "profile": profile,
        "row_spacing": row_spacing,
        "col_spacing": col_spacing,
        "north_up": profile["transform"].e < 0,
        "columns_east": profile["transform"].a > 0,
    }


def _apply_nodata(values, nodata, mask):
    if nodata is not None and np.isfinite(nodata):
        values[values == nodata] = np.nan
    values[mask == 0] = np.nan


def _warn_about_crs(crs, transform):
    if crs is not None and getattr(crs, "is_geographic", False):
        warnings.warn(
            "DEM CRS is geographic, so pixel size is in degrees while elevations "
            "are usually metres. Slope, hillshade, relief radius, and sky-view "
            "factor then mix units. Reproject to a metre CRS before interpreting "
            "the result.",
            stacklevel=3,
        )
    if transform.b != 0 or transform.d != 0:
        warnings.warn(
            "DEM transform includes rotation or shear. Spacing uses only the "
            "axis-aligned pixel size, so hillshade direction can be wrong.",
            stacklevel=3,
        )


def _write_geotiff(path: Path, array: np.ndarray, profile: dict) -> None:
    updated = profile.copy()
    for key in ("blockxsize", "blockysize", "tiled", "photometric", "colormap"):
        updated.pop(key, None)
    updated.update(
        driver="GTiff",
        dtype="float32",
        count=1,
        height=int(array.shape[0]),
        width=int(array.shape[1]),
        nodata=np.nan,
        compress="deflate",
        tiled=False,
    )
    data = np.asarray(array, dtype=np.float32)
    with rasterio.open(path, "w", **updated) as dst:
        dst.write(data, 1)


def _write_preview(path: Path, array: np.ndarray, name: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    title, cmap, kind = _PREVIEW[name]
    vmin, vmax = _preview_limits(kind, array)
    figure, axis = plt.subplots(figsize=(6.0, 5.0), dpi=120)
    image = axis.imshow(
        np.ma.masked_invalid(array),
        cmap=cmap,
        vmin=vmin,
        vmax=vmax,
        interpolation="nearest",
    )
    axis.set_title(title)
    axis.set_axis_off()
    figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)
    figure.tight_layout()
    figure.savefig(path)
    plt.close(figure)


def _preview_limits(kind, array):
    if kind == "unit":
        return 0.0, 1.0
    finite = array[np.isfinite(array)]
    if finite.size == 0:
        return 0.0, 1.0
    if kind == "slope":
        return 0.0, max(float(np.percentile(finite, 99)), 1.0)
    half = max(float(np.percentile(np.abs(finite), 99)), 1e-3)
    return -half, half


def _parse_args(argv):
    parser = argparse.ArgumentParser(
        prog="python -m ai_archaeology.relief",
        description=(
            "Write hillshade, slope, local relief, and sky-view factor "
            "GeoTIFFs from a single-band DEM."
        ),
        epilog=(
            "These layers help a person look. They are not detections, and "
            "they cannot see through rock or deep sediment."
        ),
    )
    parser.add_argument("dem", type=Path, help="Single-band DEM GeoTIFF")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--azimuth", type=float, default=315.0)
    parser.add_argument("--altitude", type=float, default=45.0)
    parser.add_argument("--multi-directions", type=int, default=8)
    parser.add_argument(
        "--relief-radius",
        type=float,
        default=20.0,
        help="Local-relief radius in the DEM horizontal unit (usually metres)",
    )
    parser.add_argument(
        "--svf-radius",
        type=float,
        default=20.0,
        help="Sky-view search radius in the DEM horizontal unit",
    )
    parser.add_argument("--svf-directions", type=int, default=16)
    return parser.parse_args(argv)


if __name__ == "__main__":
    raise SystemExit(main())
