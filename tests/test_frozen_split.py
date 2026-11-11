"""The training extractor refuses frozen blocks and their buffer."""

import numpy as np
import pytest
from rasterio.transform import from_origin

from ai_archaeology.regions.blocks import (
    BlockGrid,
    FrozenSplitError,
    HeldOutFoldError,
    grid_from_bounds,
)
from ai_archaeology.regions.models import FrozenRule, ValidationPlan
from ai_archaeology.train.patches import extract_training_patch

GRID = BlockGrid(
    origin_x=0.0,
    origin_y=0.0,
    block_size_m=100.0,
    n_columns=4,
    n_rows=4,
    frozen_columns=frozenset({3}),
    buffer_m=10.0,
    n_folds=3,
)
STACK = np.ones((5, 40, 40), dtype=np.float32)
TRANSFORM = from_origin(0.0, 400.0, 10.0, 10.0)


def test_training_can_read_a_western_block():
    patch = extract_training_patch(
        STACK, TRANSFORM, 50.0, 50.0, 8, GRID, relief_radius_m=0.0
    )
    assert patch.shape == (5, 8, 8)


def test_training_refuses_the_frozen_column():
    with pytest.raises(FrozenSplitError):
        extract_training_patch(STACK, TRANSFORM, 350.0, 50.0, 8, GRID, relief_radius_m=0.0)


def test_training_refuses_the_frozen_buffer():
    with pytest.raises(FrozenSplitError):
        extract_training_patch(STACK, TRANSFORM, 295.0, 50.0, 8, GRID, relief_radius_m=0.0)


def test_training_refuses_the_held_out_fold():
    with pytest.raises(HeldOutFoldError):
        extract_training_patch(
            STACK, TRANSFORM, 50.0, 50.0, 8, GRID, held_out_fold=0, relief_radius_m=0.0
        )


def test_grid_from_bounds_freezes_the_eastern_column():
    plan = ValidationPlan(100.0, 3, FrozenRule("eastern_columns", 1, 10.0))
    grid = grid_from_bounds((0.0, 0.0, 400.0, 400.0), plan)
    assert grid.is_frozen(350.0, 10.0)
    assert not grid.is_frozen(50.0, 10.0)
    assert grid.fold_index(350.0, 10.0) is None
