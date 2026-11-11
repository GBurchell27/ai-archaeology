"""The resolution ladder refuses invented detail and repeats exactly."""

import numpy as np
import pytest
from rasterio.transform import from_origin

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.ingest.resample import resample_elevation
from ai_archaeology.ingest.resolution import (
    UpsampleRefused,
    assert_not_upsampling,
    selectable_resolutions,
)

CRS = "EPSG:32629"
TRANSFORM = from_origin(500000.0, 5100020.0, 1.0, 1.0)
BOUNDS = (500000.0, 5100000.0, 500020.0, 5100020.0)


def test_ladder_keeps_only_rungs_the_sensor_can_support():
    assert selectable_resolutions(1.0) == (1.0, 5.0, 10.0, 30.0)
    assert selectable_resolutions(30.0) == (30.0,)


def test_upsampling_a_30m_dem_is_refused():
    with pytest.raises(UpsampleRefused):
        assert_not_upsampling(30.0, 10.0)


def test_constant_surface_is_preserved_when_coarsened():
    values = np.full((20, 20), 42.0, dtype=np.float32)
    coarsened, _transform = resample_elevation(values, TRANSFORM, CRS, CRS, BOUNDS, 1.0, 5.0)
    finite = coarsened[coarsened != NODATA]
    assert finite.size == 16
    assert np.allclose(finite, 42.0)


def test_repeated_resample_matches():
    ramp = np.tile(np.arange(20, dtype=np.float32), (20, 1))
    first, _ = resample_elevation(ramp, TRANSFORM, CRS, CRS, BOUNDS, 1.0, 5.0)
    second, _ = resample_elevation(ramp, TRANSFORM, CRS, CRS, BOUNDS, 1.0, 5.0)
    assert np.array_equal(first, second)


def test_coarsened_ramp_stays_ordered_eastward():
    ramp = np.tile(np.arange(20, dtype=np.float32), (20, 1))
    coarsened, _ = resample_elevation(ramp, TRANSFORM, CRS, CRS, BOUNDS, 1.0, 5.0)
    centre = coarsened[coarsened.shape[0] // 2]
    finite = centre[centre != NODATA]
    assert np.all(np.diff(finite) > 0)
