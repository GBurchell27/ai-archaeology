"""Spatial blocks, CV folds, and the frozen test set.

A training patch is readable only when its whole footprint, widened by the
relief-kernel radius, stays outside the frozen column and its buffer. The
same footprint rule applies to a held-out cross-validation fold. There is no
flag that turns the check off.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from rasterio.transform import xy

from ai_archaeology.regions.models import ValidationPlan


class FrozenSplitError(RuntimeError):
    def __init__(self, block_id: str):
        super().__init__(f"training code refuses to read frozen block {block_id}")
        self.block_id = block_id


class HeldOutFoldError(RuntimeError):
    def __init__(self, block_id: str):
        super().__init__(f"training fold refuses to read held-out block {block_id}")
        self.block_id = block_id


@dataclass(frozen=True)
class BlockGrid:
    origin_x: float
    origin_y: float
    block_size_m: float
    n_columns: int
    n_rows: int
    frozen_columns: frozenset[int]
    buffer_m: float
    n_folds: int

    def column_row(self, easting: float, northing: float) -> tuple[int, int]:
        column = math.floor((easting - self.origin_x) / self.block_size_m)
        row = math.floor((northing - self.origin_y) / self.block_size_m)
        return int(column), int(row)

    def block_id(self, easting: float, northing: float) -> str:
        column, row = self.column_row(easting, northing)
        return f"c{column}_r{row}"

    def exclusion_easting(self) -> float:
        """Western edge of the frozen column after the buffer is applied."""
        frozen_min_x = self.origin_x + min(self.frozen_columns) * self.block_size_m
        return frozen_min_x - self.buffer_m

    def is_frozen(self, easting: float, northing: float) -> bool:
        del northing
        return easting >= self.exclusion_easting()

    def block_fold(self, column: int, row: int) -> int | None:
        if column in self.frozen_columns:
            return None
        if column < 0 or row < 0 or column >= self.n_columns or row >= self.n_rows:
            return None
        return (row * self.n_columns + column) % self.n_folds

    def fold_index(self, easting: float, northing: float) -> int | None:
        if self.is_frozen(easting, northing):
            return None
        column, row = self.column_row(easting, northing)
        return self.block_fold(column, row)

    def reaches_frozen(self, min_x: float, max_x: float) -> bool:
        return max_x >= self.exclusion_easting()

    def overlaps_fold(self, min_x: float, max_x: float, min_y: float, max_y: float, fold: int) -> bool:
        for column, row in self._overlapped_blocks(min_x, max_x, min_y, max_y):
            if self.block_fold(column, row) == fold:
                return True
        return False

    def inside_fold(self, min_x: float, max_x: float, min_y: float, max_y: float, fold: int) -> bool:
        blocks = self._overlapped_blocks(min_x, max_x, min_y, max_y)
        return bool(blocks) and all(self.block_fold(column, row) == fold for column, row in blocks)

    def excluded_pixel_mask(self, shape: tuple[int, int], transform, held_out_fold: int | None) -> np.ndarray:
        """True where a pixel centre is frozen or, for CV, in the held-out fold."""
        height, width = shape
        rows, columns = np.indices((height, width))
        easting, northing = xy(transform, rows, columns, offset="center")
        easting = np.asarray(easting, dtype=np.float64).reshape(shape)
        northing = np.asarray(northing, dtype=np.float64).reshape(shape)
        excluded = easting >= self.exclusion_easting()
        if held_out_fold is None:
            return excluded
        return excluded | self._held_out_centres(easting, northing, held_out_fold)

    def _held_out_centres(self, easting: np.ndarray, northing: np.ndarray, fold: int) -> np.ndarray:
        column = np.floor((easting - self.origin_x) / self.block_size_m).astype(np.int64)
        row = np.floor((northing - self.origin_y) / self.block_size_m).astype(np.int64)
        inside = (column >= 0) & (row >= 0) & (column < self.n_columns) & (row < self.n_rows)
        frozen = np.isin(column, np.fromiter(self.frozen_columns, dtype=np.int64))
        fold_id = (row * self.n_columns + column) % self.n_folds
        return inside & ~frozen & (fold_id == fold)

    def _overlapped_blocks(self, min_x: float, max_x: float, min_y: float, max_y: float) -> list[tuple[int, int]]:
        if max_x <= min_x or max_y <= min_y:
            return []
        column0, row0 = self.column_row(min_x, min_y)
        column1, row1 = self.column_row(max_x - 1e-6, max_y - 1e-6)
        return [
            (column, row)
            for column in range(column0, column1 + 1)
            for row in range(row0, row1 + 1)
        ]


def grid_from_bounds(
    bounds: tuple[float, float, float, float],
    plan: ValidationPlan,
) -> BlockGrid:
    if plan.frozen.method != "eastern_columns":
        raise ValueError(f"unsupported frozen rule {plan.frozen.method}")
    min_x, min_y, max_x, max_y = bounds
    n_columns = max(1, math.ceil((max_x - min_x) / plan.block_size_m))
    n_rows = max(1, math.ceil((max_y - min_y) / plan.block_size_m))
    frozen_count = min(plan.frozen.columns, n_columns)
    frozen_columns = frozenset(range(n_columns - frozen_count, n_columns))
    return BlockGrid(
        origin_x=min_x,
        origin_y=min_y,
        block_size_m=plan.block_size_m,
        n_columns=n_columns,
        n_rows=n_rows,
        frozen_columns=frozen_columns,
        buffer_m=plan.frozen.buffer_m,
        n_folds=plan.n_folds,
    )


def footprint_bounds(
    easting: float,
    northing: float,
    patch_size: int,
    pixel_m: float,
    relief_radius_m: float,
) -> tuple[float, float, float, float]:
    """Map rectangle of the patch window plus the relief kernel.

    The extra half pixel covers rounding the requested centre onto a pixel.
    """
    if patch_size < 1 or pixel_m <= 0 or relief_radius_m < 0:
        raise ValueError("patch footprint needs a positive pixel and a non-negative radius")
    pad = (patch_size / 2.0 + 0.5) * pixel_m + relief_radius_m
    return easting - pad, easting + pad, northing - pad, northing + pad


def assert_training_readable(
    grid: BlockGrid,
    easting: float,
    northing: float,
    *,
    patch_size: int,
    pixel_m: float,
    relief_radius_m: float,
    held_out_fold: int | None = None,
) -> None:
    min_x, max_x, min_y, max_y = footprint_bounds(
        easting, northing, patch_size, pixel_m, relief_radius_m
    )
    if grid.reaches_frozen(min_x, max_x):
        raise FrozenSplitError(grid.block_id(easting, northing))
    if held_out_fold is None:
        return
    if grid.overlaps_fold(min_x, max_x, min_y, max_y, held_out_fold):
        raise HeldOutFoldError(grid.block_id(easting, northing))


def assert_fold_eval_readable(
    grid: BlockGrid,
    easting: float,
    northing: float,
    fold: int,
    *,
    patch_size: int,
    pixel_m: float,
    relief_radius_m: float,
) -> None:
    min_x, max_x, min_y, max_y = footprint_bounds(
        easting, northing, patch_size, pixel_m, relief_radius_m
    )
    if grid.reaches_frozen(min_x, max_x):
        raise FrozenSplitError(grid.block_id(easting, northing))
    if not grid.inside_fold(min_x, max_x, min_y, max_y, fold):
        raise HeldOutFoldError(grid.block_id(easting, northing))
