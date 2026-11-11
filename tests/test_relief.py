"""Synthetic-DEM tests for relief visualisations.

The monument here is invented. Its coordinates in the GeoTIFF tests are an
arbitrary grid origin, not a place.
"""

import subprocess
import sys
import warnings

import numpy as np
import pytest
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine, from_origin

from ai_archaeology.relief import (
    hillshade,
    local_relief,
    multidirectional_hillshade,
    sky_view_factor,
    slope,
    write_relief_outputs,
)

PROJECTED = CRS.from_epsg(32637)


def monument_dem(size=121):
    """Flat plane, circular mound, and a ring ditch. Pixel size is 1."""
    center = size // 2
    rows, cols = np.indices((size, size))
    distance = np.hypot(rows - center, cols - center)
    dem = np.zeros((size, size), dtype=np.float64)
    mound = distance <= 5
    dem[mound] = 4.0 * (1.0 - (distance[mound] / 5.0) ** 2)
    ditch = (distance >= 11) & (distance <= 15)
    dem[ditch] = -3.0
    return dem, center


def write_geotiff(path, dem, *, crs, transform, nodata=None):
    profile = {
        "driver": "GTiff",
        "height": dem.shape[0],
        "width": dem.shape[1],
        "count": 1,
        "dtype": "float32",
        "crs": crs,
        "transform": transform,
    }
    if nodata is not None:
        profile["nodata"] = nodata
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(np.asarray(dem, dtype=np.float32), 1)


def test_flat_surface_has_zero_slope_and_known_hillshade():
    flat = np.zeros((16, 16))
    altitude = 45.0
    shaded = hillshade(flat, 1.0, azimuth=315, altitude=altitude)
    expected = np.sin(np.radians(altitude))
    assert np.allclose(shaded, expected)
    assert np.allclose(slope(flat, 1.0), 0.0)
    assert np.all((shaded >= 0.0) & (shaded <= 1.0))


def test_west_facing_ramp_is_lit_from_the_west():
    # Elevation increases eastward, so the surface faces west.
    ramp = np.tile(np.arange(36, dtype=np.float64), (36, 1))
    lit = hillshade(ramp, 1.0, azimuth=270, altitude=45)
    dark = hillshade(ramp, 1.0, azimuth=90, altitude=45)
    assert lit[18, 18] == pytest.approx(1.0, abs=1e-6)
    assert dark[18, 18] == pytest.approx(0.0, abs=1e-6)
    assert slope(ramp, 1.0)[18, 18] == pytest.approx(45.0, abs=1e-6)


def test_column_axis_flag_follows_east():
    ramp = np.tile(np.arange(24, dtype=np.float64), (24, 1))
    # Increasing column is west, so this ramp faces east.
    lit = hillshade(ramp, 1.0, azimuth=90, altitude=45, columns_east=False)
    assert lit[12, 12] == pytest.approx(1.0, abs=1e-6)


def test_north_up_flag_follows_north():
    rises_with_row = np.tile(np.arange(24, dtype=np.float64)[:, None], (1, 24))
    # Row 0 is south, so increasing row is north and the surface faces south.
    lit = hillshade(rises_with_row, 1.0, azimuth=180, altitude=45, north_up=False)
    dark = hillshade(rises_with_row, 1.0, azimuth=0, altitude=45, north_up=False)
    assert lit[12, 12] == pytest.approx(1.0, abs=1e-6)
    assert dark[12, 12] == pytest.approx(0.0, abs=1e-6)


def test_hillshade_stays_in_range_and_multidirectional_is_the_mean():
    dem, _center = monument_dem(81)
    azimuths = (0.0, 90.0, 180.0, 270.0)
    combined = multidirectional_hillshade(dem, 1.0, altitude=40, azimuths=azimuths)
    parts = [hillshade(dem, 1.0, azimuth=item, altitude=40) for item in azimuths]
    assert np.all((combined >= 0.0) & (combined <= 1.0))
    np.testing.assert_allclose(combined, np.mean(parts, axis=0))
    degrees = slope(dem, 1.0)
    assert np.all((degrees >= 0.0) & (degrees <= 90.0))


def test_mound_and_ring_ditch_stand_out_in_local_relief_and_svf():
    """The mound is locally high, the ditch locally low, and the ditch is darker in SVF.

    On a flat plane a mound top sees as much sky as the plain, so SVF does not
    mark the peak. The ring ditch does: its floor is a dark ring around a
    bright interior. Local relief carries the sign of both landforms.
    """
    dem, center = monument_dem()
    ditch = (center, center + 13)
    plain = (8, 8)
    relief = local_relief(dem, 1.0, radius=20)
    view = sky_view_factor(dem, 1.0, radius=22, n_directions=16)

    assert relief[center, center] > 1.0
    assert relief[ditch] < -1.0
    assert abs(relief[plain]) < 0.25
    assert relief[center, center] - relief[ditch] > 2.0

    assert np.all((view >= 0.0) & (view <= 1.0))
    assert view[plain] > 0.95
    assert view[center, center] > 0.9
    assert view[ditch] < view[plain] - 0.15
    assert view[center, center] > view[ditch] + 0.15


def test_open_ground_has_full_sky_and_a_pit_does_not():
    flat = np.zeros((33, 33))
    assert np.allclose(sky_view_factor(flat, 1.0, radius=8, n_directions=8), 1.0)

    pit = np.zeros((33, 33))
    pit[16, 16] = -10.0
    view = sky_view_factor(pit, 1.0, radius=6, n_directions=8)
    assert view[16, 16] < 0.2


def test_nodata_cells_stay_nodata():
    dem = np.full((12, 12), 5.0)
    dem[0, :] = np.nan
    shaded = hillshade(dem, 1.0, azimuth=315, altitude=45)
    assert np.isnan(shaded[0, :]).all()
    assert np.isfinite(shaded[6, 6])


@pytest.mark.parametrize(
    "call",
    [
        lambda: hillshade(np.zeros((6, 6)), 0),
        lambda: hillshade(np.zeros((6, 6)), -2),
        lambda: hillshade(np.zeros((6, 6)), 1, altitude=120),
        lambda: hillshade(np.zeros((6, 6)), 1, azimuth=np.nan),
        lambda: hillshade(np.zeros(6), 1),
        lambda: local_relief(np.zeros((6, 6)), 2, radius=1),
        lambda: sky_view_factor(np.zeros((6, 6)), 1, radius=4, n_directions=3),
    ],
)
def test_rejects_bad_parameters(call):
    with pytest.raises(ValueError):
        call()


def test_cli_preserves_georeferencing_and_writes_previews(tmp_path):
    dem, center = monument_dem(81)
    source = tmp_path / "synthetic_dem.tif"
    transform = from_origin(1000.0, 2000.0, 1.0, 1.0)
    write_geotiff(source, dem, crs=PROJECTED, transform=transform)
    out_dir = tmp_path / "relief"
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "ai_archaeology.relief",
            str(source),
            "--out-dir",
            str(out_dir),
            "--relief-radius",
            "20",
            "--svf-radius",
            "18",
            "--svf-directions",
            "8",
            "--azimuth",
            "315",
            "--altitude",
            "45",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stderr
    assert "NotGeoreferencedWarning" not in completed.stderr

    expected_relief = local_relief(dem, 1.0, radius=20)
    for name in (
        "hillshade",
        "multidirectional_hillshade",
        "slope",
        "local_relief",
        "sky_view_factor",
    ):
        geotiff = out_dir / f"{name}.tif"
        preview = out_dir / f"{name}.png"
        assert preview.stat().st_size > 1000
        with rasterio.open(geotiff) as src:
            assert src.crs == PROJECTED
            assert src.transform == transform
            assert src.width == dem.shape[1]
            assert src.height == dem.shape[0]
            assert src.count == 1
            assert src.dtypes[0] == "float32"
            written = src.read(1)
        if name == "local_relief":
            np.testing.assert_allclose(written, expected_relief, atol=1e-5)
            assert written[center, center] > 1.0
            assert written[center, center + 13] < -1.0


def test_nodata_value_is_preserved_as_nan(tmp_path):
    dem = np.full((16, 16), 10.0)
    dem[0, 0] = -9999.0
    source = tmp_path / "with_nodata.tif"
    transform = from_origin(0.0, 0.0, 2.0, 2.0)
    write_geotiff(source, dem, crs=PROJECTED, transform=transform, nodata=-9999.0)
    out_dir = tmp_path / "out"
    write_relief_outputs(
        source,
        out_dir,
        relief_radius=4,
        svf_radius=4,
        svf_directions=4,
    )
    with rasterio.open(out_dir / "slope.tif") as src:
        assert src.crs == PROJECTED
        assert src.transform == transform
        band = src.read(1)
    assert np.isnan(band[0, 0])
    assert np.isfinite(band[8, 8])
    assert slope(np.zeros((16, 16)), (2.0, 2.0))[8, 8] == pytest.approx(0.0)


def test_geographic_crs_warns_about_mixed_units(tmp_path):
    dem = np.zeros((12, 12))
    source = tmp_path / "geographic.tif"
    write_geotiff(
        source,
        dem,
        crs=CRS.from_epsg(4326),
        transform=from_origin(1000.0, 2000.0, 1.0, 1.0),
    )
    with pytest.warns(UserWarning, match="geographic"):
        write_relief_outputs(
            source,
            tmp_path / "out",
            relief_radius=2,
            svf_radius=2,
            svf_directions=4,
        )


def test_projected_crs_does_not_warn_about_degrees(tmp_path):
    dem = np.zeros((12, 12))
    source = tmp_path / "projected.tif"
    write_geotiff(
        source,
        dem,
        crs=PROJECTED,
        transform=from_origin(1000.0, 2000.0, 1.0, 1.0),
    )
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        write_relief_outputs(
            source,
            tmp_path / "out",
            relief_radius=2,
            svf_radius=2,
            svf_directions=4,
        )
    assert not any("geographic" in str(item.message) for item in caught)


def test_south_up_geotiff_hillshade_faces_south(tmp_path):
    # Row index increases north. Elevation increases north, so the slope faces south.
    dem = np.tile(np.arange(30, dtype=np.float64)[:, None], (1, 30))
    source = tmp_path / "south_up.tif"
    # Translated south-up grid. Not Affine.identity, which GDAL may drop.
    transform = Affine(1.0, 0.0, 1000.0, 0.0, 1.0, 500.0)
    write_geotiff(source, dem, crs=PROJECTED, transform=transform)
    out_dir = tmp_path / "out"
    write_relief_outputs(
        source,
        out_dir,
        azimuth=180,
        altitude=45,
        relief_radius=2,
        svf_radius=2,
        svf_directions=4,
    )
    with rasterio.open(out_dir / "hillshade.tif") as src:
        assert src.transform == transform
        written = src.read(1)
    assert written[15, 15] == pytest.approx(1.0, abs=1e-5)
