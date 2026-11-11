"""Spatial blocks, CV folds, and the frozen test set.

Training calls ``assert_training_readable`` before it touches a patch. A
location in a frozen block, or inside the frozen buffer, raises
``FrozenSplitError``. There is no training flag that turns the check off.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

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

    def is_frozen(self, easting: float, northing: float) -> bool:
        frozen_min_x = self.origin_x + min(self.frozen_columns) * self.block_size_m
        return easting >= frozen_min_x - self.buffer_m

    def fold_index(self, easting: float, northing: float) -> int | None:
        if self.is_frozen(easting, northing):
            return None
        column, row = self.column_row(easting, northing)
        return (row * self.n_columns + column) % self.n_folds


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


def assert_training_readable(
    grid: BlockGrid,
    easting: float,
    northing: float,
    held_out_fold: int | None = None,
) -> None:
    if grid.is_frozen(easting, northing):
        raise FrozenSplitError(grid.block_id(easting, northing))
    if held_out_fold is None:
        return
    if grid.fold_index(easting, northing) == held_out_fold:
        raise HeldOutFoldError(grid.block_id(easting, northing))


def assert_fold_eval_readable(grid: BlockGrid, easting: float, northing: float, fold: int) -> None:
    if grid.is_frozen(easting, northing):
        raise FrozenSplitError(grid.block_id(easting, northing))
    if grid.fold_index(easting, northing) != fold:
        raise HeldOutFoldError(grid.block_id(easting, northing))
