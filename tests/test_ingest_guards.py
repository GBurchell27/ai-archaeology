"""Licence, CRS, nodata, and output-path guards."""

from pathlib import Path

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

from ai_archaeology.ingest.adapters.ireland_gsi import require_gsi_licence
from ai_archaeology.ingest.adapters.usgs_3dep import _pixel_metres
from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.train.fit import as_arrays
from ai_archaeology.train.patches import LabelledPatch, patch_is_usable


def test_gsi_licence_comes_from_the_record():
    from ai_archaeology.ingest.adapters.ireland_gsi import EXPECTED_LICENCE

    assert require_gsi_licence(EXPECTED_LICENCE) == EXPECTED_LICENCE
    with pytest.raises(ValueError):
        require_gsi_licence("Creative Commons Attribution 4.0")
    with pytest.raises(ValueError):
        require_gsi_licence("all rights reserved")


def test_three_dep_pixel_size_checks_the_crs(tmp_path: Path):
    path = tmp_path / "geographic.tif"
    _write(path, "EPSG:4326")
    with pytest.raises(ValueError):
        _pixel_metres(path, 32615)
    projected = tmp_path / "utm.tif"
    _write(projected, "EPSG:32615")
    assert _pixel_metres(projected, 32615) == pytest.approx(1.0)


def test_nodata_is_not_replaced_with_zero():
    values = np.ones((1, 2, 2), dtype=np.float32)
    values[0, 0, 1] = NODATA
    images, _features, _labels = as_arrays([LabelledPatch(1, "ringfort", "c0_r0", "", values)])
    assert not np.any(images == 0)
    assert not np.any(images == NODATA)
    assert images[0, 0, 0, 1] == pytest.approx(1.0)


def test_patch_usability_checks_every_band():
    patch = np.zeros((2, 4, 4), dtype=np.float32)
    patch[1] = NODATA
    assert patch_is_usable(patch) is False


def test_product_paths_are_not_the_whole_home_directory(tmp_path: Path):
    with pytest.raises(ValueError):
        assert_untracked_product(Path.home() / "notes.txt", tmp_path)
    private = Path.home() / ".ai-archaeology" / "reviews.sqlite"
    assert_untracked_product(private, tmp_path)


def _write(path: Path, crs: str) -> None:
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="float32",
        crs=crs,
        transform=from_origin(0, 2, 1, 1),
    ) as dataset:
        dataset.write(np.zeros((1, 2, 2), dtype=np.float32))
