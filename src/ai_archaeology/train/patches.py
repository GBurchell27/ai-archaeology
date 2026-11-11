"""Cut relief patches. Training extraction checks the frozen split first."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import rasterio
from rasterio.transform import rowcol, xy

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.regions.blocks import (
    BlockGrid,
    assert_fold_eval_readable,
    assert_training_readable,
)


class PatchOutOfBounds(ValueError):
    pass


@dataclass(frozen=True)
class LabelledPatch:
    label: int
    feature_class: str
    block_id: str
    reason_code: str
    values: np.ndarray


def extract_training_patch(
    stack: np.ndarray,
    transform: rasterio.Affine,
    easting: float,
    northing: float,
    patch_size: int,
    grid: BlockGrid,
    held_out_fold: int | None = None,
    *,
    relief_radius_m: float,
) -> np.ndarray:
    pixel_m = _pixel_metres(transform)
    assert_training_readable(
        grid,
        easting,
        northing,
        patch_size=patch_size,
        pixel_m=pixel_m,
        relief_radius_m=relief_radius_m,
        held_out_fold=held_out_fold,
    )
    return crop_patch(stack, transform, easting, northing, patch_size)


def extract_fold_eval_patch(
    stack: np.ndarray,
    transform: rasterio.Affine,
    easting: float,
    northing: float,
    patch_size: int,
    grid: BlockGrid,
    fold: int,
    *,
    relief_radius_m: float,
) -> np.ndarray:
    pixel_m = _pixel_metres(transform)
    assert_fold_eval_readable(
        grid,
        easting,
        northing,
        fold,
        patch_size=patch_size,
        pixel_m=pixel_m,
        relief_radius_m=relief_radius_m,
    )
    return crop_patch(stack, transform, easting, northing, patch_size)


def crop_patch(
    stack: np.ndarray,
    transform: rasterio.Affine,
    easting: float,
    northing: float,
    patch_size: int,
) -> np.ndarray:
    row, column = rowcol(transform, easting, northing)
    return _window(stack, int(round(row)), int(round(column)), patch_size)


def patch_is_usable(patch: np.ndarray) -> bool:
    """Every band must be mostly finite. Nodata in one band rejects the patch."""
    for band in patch:
        invalid = ~np.isfinite(band) | (band == NODATA)
        if float(np.mean(invalid)) >= 0.25:
            return False
    return True


def _pixel_metres(transform: rasterio.Affine) -> float:
    return max(abs(float(transform.a)), abs(float(transform.e)))


def pixel_centre(transform: rasterio.Affine, row: int, column: int) -> tuple[float, float]:
    easting, northing = xy(transform, row, column, offset="center")
    return float(easting), float(northing)


def _window(stack: np.ndarray, row: int, column: int, patch_size: int) -> np.ndarray:
    half = patch_size // 2
    row0 = row - half
    column0 = column - half
    _, height, width = stack.shape
    if row0 < 0 or column0 < 0 or row0 + patch_size > height or column0 + patch_size > width:
        raise PatchOutOfBounds("patch does not fit inside the relief stack")
    return stack[:, row0 : row0 + patch_size, column0 : column0 + patch_size]
