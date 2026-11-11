"""The frozen split is closed to patch edges, relief kernels, and held-out folds."""

import numpy as np
import pytest
from rasterio.transform import from_origin

from ai_archaeology.regions.blocks import (
    BlockGrid,
    FrozenSplitError,
    footprint_bounds,
)
from ai_archaeology.train.masked_relief import training_relief_stack
from ai_archaeology.train.patches import extract_training_patch
from ai_archaeology.train.sample import collect_training_patches

PIXEL_M = 10.0
PATCH = 8
RADIUS_M = 20.0
GRID = BlockGrid(
    origin_x=0.0,
    origin_y=0.0,
    block_size_m=100.0,
    n_columns=4,
    n_rows=4,
    frozen_columns=frozenset({3}),
    buffer_m=150.0,
    n_folds=3,
)
TRANSFORM = from_origin(0.0, 400.0, PIXEL_M, PIXEL_M)


def test_centre_just_west_of_the_buffer_is_refused():
    # Old centre check allowed 149.999 because the buffer starts at 150.
    # The 8 px window still reaches into that buffer.
    centre = GRID.exclusion_easting() - 0.001
    min_x, max_x, _min_y, _max_y = footprint_bounds(centre, 200.0, PATCH, PIXEL_M, 0.0)
    assert max_x > GRID.exclusion_easting()
    stack = np.ones((5, 40, 40), dtype=np.float32)
    with pytest.raises(FrozenSplitError):
        extract_training_patch(
            stack, TRANSFORM, centre, 200.0, PATCH, GRID, relief_radius_m=0.0
        )
    assert min_x < centre < GRID.exclusion_easting()


def test_an_allowed_footprint_stays_outside_the_frozen_strip():
    centre = 40.0
    _min_x, max_x, _min_y, _max_y = footprint_bounds(centre, 200.0, PATCH, PIXEL_M, RADIUS_M)
    assert max_x < GRID.exclusion_easting()
    stack = np.ones((5, 40, 40), dtype=np.float32)
    patch = extract_training_patch(
        stack, TRANSFORM, centre, 200.0, PATCH, GRID, relief_radius_m=RADIUS_M
    )
    assert patch.shape == (5, PATCH, PATCH)


def test_perturbing_the_frozen_column_leaves_training_patches_identical():
    before, frozen = _elevation()
    first = _patches(before, TRAIN)
    after = before.copy()
    after[:, frozen] += 400.0
    second = _patches(after, TRAIN)
    assert first
    assert len(first) == len(second)
    for left, right in zip(first, second):
        assert left.values.tobytes() == right.values.tobytes()
        assert left.label == right.label
        assert left.block_id == right.block_id


def test_perturbing_a_held_out_fold_leaves_training_patches_identical():
    before, _frozen = _elevation()
    held_out = _fold_pixels(before, TRAIN, fold=1)
    first = _patches(before, TRAIN, held_out_fold=1)
    after = before.copy()
    after[held_out] += 400.0
    second = _patches(after, TRAIN, held_out_fold=1)
    assert first
    assert len(first) == len(second)
    for left, right in zip(first, second):
        assert left.values.tobytes() == right.values.tobytes()


def test_masked_relief_does_not_depend_on_frozen_or_held_out_values():
    before, frozen = _elevation()
    after = before.copy()
    after[:, frozen] += 400.0
    held_out = _fold_pixels(before, TRAIN, fold=1)
    after[held_out] += 250.0
    allowed = ~TRAIN.excluded_pixel_mask(before.shape, TRAIN_TRANSFORM, held_out_fold=1)
    first = _stack(before, held_out_fold=1)
    second = _stack(after, held_out_fold=1)
    assert np.array_equal(first[:, allowed], second[:, allowed])


def _patches(elevation, grid, held_out_fold=None):
    return collect_training_patches(
        elevation,
        TRAIN_TRANSFORM,
        "EPSG:32629",
        [],
        grid,
        resolution_m=PIXEL_M,
        relief_radius_m=RADIUS_M,
        patch_size=PATCH,
        negatives_per_positive=1,
        buffer_m=80.0,
        seed=5,
        held_out_fold=held_out_fold,
        hard_negatives=[],
        multi_directions=4,
        svf_directions=4,
    )


def _stack(elevation, held_out_fold):
    return training_relief_stack(
        elevation,
        TRAIN_TRANSFORM,
        PIXEL_M,
        TRAIN,
        held_out_fold,
        radius_m=RADIUS_M,
        multi_directions=4,
        svf_directions=4,
    )


TRAIN = BlockGrid(
    origin_x=0.0,
    origin_y=0.0,
    block_size_m=200.0,
    n_columns=4,
    n_rows=4,
    frozen_columns=frozenset({3}),
    buffer_m=20.0,
    n_folds=3,
)
TRAIN_TRANSFORM = from_origin(0.0, 800.0, PIXEL_M, PIXEL_M)


def _elevation():
    height, width = 80, 80
    rows, columns = np.indices((height, width))
    elevation = (rows + columns).astype(np.float32)
    elevation[12, 8] = np.float32(-9999.0)
    centres = 5.0 + columns[0] * PIXEL_M
    frozen = centres >= 600.0
    return elevation, frozen


def _fold_pixels(elevation, grid: BlockGrid, fold: int) -> np.ndarray:
    _height, width = elevation.shape
    rows, columns = np.indices(elevation.shape)
    easting = 5.0 + columns * PIXEL_M
    northing = width * PIXEL_M - (rows + 0.5) * PIXEL_M
    column = np.floor(easting / grid.block_size_m).astype(int)
    row = np.floor(northing / grid.block_size_m).astype(int)
    frozen = np.isin(column, list(grid.frozen_columns))
    fold_id = (row * grid.n_columns + column) % grid.n_folds
    return (fold_id == fold) & ~frozen
