"""Positive patches on published monuments and background patches with a buffer."""

from __future__ import annotations

import numpy as np

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.regions.blocks import (
    BlockGrid,
    FrozenSplitError,
    HeldOutFoldError,
    assert_fold_eval_readable,
    assert_training_readable,
)
from ai_archaeology.regions.sites import KnownSite
from ai_archaeology.train.masked_relief import training_relief_stack
from ai_archaeology.train.patches import (
    LabelledPatch,
    PatchOutOfBounds,
    extract_fold_eval_patch,
    extract_training_patch,
    patch_is_usable,
    pixel_centre,
)
from ai_archaeology.train.reviews import HardNegative


def site_coordinates(sites: list[KnownSite], crs: str) -> np.ndarray:
    if not sites:
        return np.zeros((0, 2), dtype=np.float64)
    return np.asarray([site.projected(crs) for site in sites], dtype=np.float64)


def collect_training_patches(
    elevation: np.ndarray,
    transform,
    crs: str,
    sites: list[KnownSite],
    grid: BlockGrid,
    *,
    resolution_m: float,
    relief_radius_m: float,
    patch_size: int,
    negatives_per_positive: int,
    buffer_m: float,
    seed: int,
    held_out_fold: int | None,
    hard_negatives: list[HardNegative],
    multi_directions: int = 4,
    svf_directions: int = 8,
) -> list[LabelledPatch]:
    stack = _training_stack(
        elevation, transform, resolution_m, grid, held_out_fold,
        relief_radius_m, multi_directions, svf_directions,
    )
    positives = _labelled_sites(
        stack, transform, crs, sites, grid, patch_size, relief_radius_m, held_out_fold, None
    )
    background = _background_samples(
        stack, elevation, transform, site_coordinates(sites, crs), grid, positives,
        negatives_per_positive, buffer_m, patch_size, relief_radius_m, seed, held_out_fold, None,
    )
    rejected = _hard_negatives(
        stack, transform, grid, patch_size, relief_radius_m, held_out_fold, hard_negatives
    )
    return positives + background + rejected


def _background_samples(
    stack, elevation, transform, site_xy, grid, positives, negatives_per_positive, buffer_m,
    patch_size, relief_radius_m, seed, held_out_fold, for_eval_fold,
):
    generator = np.random.default_rng(seed if held_out_fold is None else seed + held_out_fold)
    count = max(len(positives), 1) * negatives_per_positive
    return _background(
        stack, elevation, transform, site_xy, grid, count, buffer_m, patch_size,
        relief_radius_m, generator, held_out_fold, for_eval_fold,
    )


def collect_fold_patches(
    elevation: np.ndarray,
    transform,
    crs: str,
    sites: list[KnownSite],
    grid: BlockGrid,
    *,
    resolution_m: float,
    relief_radius_m: float,
    patch_size: int,
    negatives_per_positive: int,
    buffer_m: float,
    seed: int,
    fold: int,
    multi_directions: int = 4,
    svf_directions: int = 8,
) -> list[LabelledPatch]:
    stack = _training_stack(
        elevation, transform, resolution_m, grid, None,
        relief_radius_m, multi_directions, svf_directions,
    )
    positives = _labelled_sites(
        stack, transform, crs, sites, grid, patch_size, relief_radius_m, None, for_eval_fold=fold
    )
    background = _background(
        stack,
        elevation,
        transform,
        site_coordinates(sites, crs),
        grid,
        max(len(positives), 1) * negatives_per_positive,
        buffer_m,
        patch_size,
        relief_radius_m,
        np.random.default_rng(seed + 100 + fold),
        None,
        for_eval_fold=fold,
    )
    return positives + background


def _training_stack(
    elevation, transform, resolution_m, grid, held_out_fold, relief_radius_m,
    multi_directions, svf_directions,
):
    return training_relief_stack(
        elevation,
        transform,
        resolution_m,
        grid,
        held_out_fold,
        radius_m=relief_radius_m,
        multi_directions=multi_directions,
        svf_directions=svf_directions,
    )


def _labelled_sites(
    stack, transform, crs, sites, grid, patch_size, relief_radius_m, held_out_fold, for_eval_fold
):
    patches: list[LabelledPatch] = []
    for site in sites:
        easting, northing = site.projected(crs)
        values = _read_site_patch(
            stack, transform, easting, northing, patch_size, relief_radius_m,
            grid, held_out_fold, for_eval_fold,
        )
        if values is None or not patch_is_usable(values):
            continue
        patches.append(
            LabelledPatch(1, site.feature_class, grid.block_id(easting, northing), "", values)
        )
    return patches


def _read_site_patch(
    stack, transform, easting, northing, patch_size, relief_radius_m, grid, held_out_fold, for_eval_fold
):
    try:
        if for_eval_fold is None:
            return extract_training_patch(
                stack, transform, easting, northing, patch_size, grid, held_out_fold,
                relief_radius_m=relief_radius_m,
            )
        return extract_fold_eval_patch(
            stack, transform, easting, northing, patch_size, grid, for_eval_fold,
            relief_radius_m=relief_radius_m,
        )
    except (FrozenSplitError, HeldOutFoldError, PatchOutOfBounds):
        return None


def _background(
    stack,
    elevation,
    transform,
    site_xy,
    grid,
    count,
    buffer_m,
    patch_size,
    relief_radius_m,
    generator,
    held_out_fold,
    for_eval_fold,
):
    found: list[LabelledPatch] = []
    height, width = elevation.shape
    half = patch_size // 2
    attempts = 0
    while len(found) < count and attempts < max(count * 400, 400):
        attempts += 1
        row = int(generator.integers(half, max(half + 1, height - half)))
        column = int(generator.integers(half, max(half + 1, width - half)))
        patch = _background_patch(
            stack, elevation, transform, site_xy, grid, row, column, buffer_m, patch_size,
            relief_radius_m, held_out_fold, for_eval_fold,
        )
        if patch is not None:
            found.append(patch)
    return found


def _background_patch(
    stack, elevation, transform, site_xy, grid, row, column, buffer_m, patch_size,
    relief_radius_m, held_out_fold, for_eval_fold,
):
    easting, northing = pixel_centre(transform, row, column)
    if not _footprint_allowed(
        grid, easting, northing, patch_size, transform, relief_radius_m, held_out_fold, for_eval_fold
    ):
        return None
    if not _far_from_sites(easting, northing, site_xy, buffer_m):
        return None
    if _cell_is_nodata(elevation, row, column):
        return None
    values = _read_site_patch(
        stack, transform, easting, northing, patch_size, relief_radius_m,
        grid, held_out_fold, for_eval_fold,
    )
    if values is None or not patch_is_usable(values):
        return None
    return LabelledPatch(0, "background", grid.block_id(easting, northing), "", values)


def _footprint_allowed(
    grid, easting, northing, patch_size, transform, relief_radius_m, held_out_fold, for_eval_fold
) -> bool:
    pixel_m = max(abs(float(transform.a)), abs(float(transform.e)))
    try:
        if for_eval_fold is None:
            assert_training_readable(
                grid, easting, northing, patch_size=patch_size, pixel_m=pixel_m,
                relief_radius_m=relief_radius_m, held_out_fold=held_out_fold,
            )
        else:
            assert_fold_eval_readable(
                grid, easting, northing, for_eval_fold, patch_size=patch_size,
                pixel_m=pixel_m, relief_radius_m=relief_radius_m,
            )
    except (FrozenSplitError, HeldOutFoldError):
        return False
    return True


def _cell_is_nodata(elevation: np.ndarray, row: int, column: int) -> bool:
    value = elevation[row, column]
    return (not np.isfinite(value)) or value == NODATA


def _hard_negatives(stack, transform, grid, patch_size, relief_radius_m, held_out_fold, hard_negatives):
    patches: list[LabelledPatch] = []
    for review in hard_negatives:
        values = _read_site_patch(
            stack, transform, review.easting_m, review.northing_m, patch_size, relief_radius_m,
            grid, held_out_fold, None,
        )
        if values is None or not patch_is_usable(values):
            continue
        patches.append(
            LabelledPatch(
                0,
                "hard_negative",
                grid.block_id(review.easting_m, review.northing_m),
                review.reason_code,
                values,
            )
        )
    return patches


def _far_from_sites(easting: float, northing: float, site_xy: np.ndarray, buffer_m: float) -> bool:
    if site_xy.size == 0:
        return True
    distance = np.hypot(site_xy[:, 0] - easting, site_xy[:, 1] - northing)
    return bool(np.min(distance) >= buffer_m)
