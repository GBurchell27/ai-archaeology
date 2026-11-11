"""Score a lattice of transfer-evaluation patches. This is not a training read."""

from __future__ import annotations

import numpy as np

from ai_archaeology.ingest.constants import NODATA
from ai_archaeology.train.features import relief_feature_vector
from ai_archaeology.train.fit import FittedModels, combined_probability, replace_nodata_for_model
from ai_archaeology.train.patches import crop_patch, patch_is_usable, pixel_centre


def stride_pixels(resolution_m: float, stride_m: float = 120.0) -> int:
    return max(1, int(round(stride_m / resolution_m)))


def valid_area_km2(elevation: np.ndarray, resolution_m: float) -> float:
    valid = int(np.sum(np.isfinite(elevation) & (elevation != NODATA)))
    return valid * resolution_m * resolution_m / 1_000_000.0


def score_lattice(stack, elevation, transform, patch_size: int, stride: int, models: FittedModels | None):
    images, coordinates = _lattice_patches(stack, elevation, transform, patch_size, stride)
    if coordinates.size == 0:
        return np.zeros(0, dtype=np.float64), coordinates
    if models is None or (models.boosting is None and models.cnn is None):
        return np.zeros(coordinates.shape[0], dtype=np.float64), coordinates
    features = np.stack([relief_feature_vector(image) for image in images])
    model_images = replace_nodata_for_model(images)
    return combined_probability(models, model_images, features), coordinates


def _lattice_patches(stack, elevation, transform, patch_size: int, stride: int):
    half = patch_size // 2
    height, width = elevation.shape
    images = []
    coordinates = []
    for row in range(half, height - half, stride):
        for column in range(half, width - half, stride):
            if elevation[row, column] == NODATA:
                continue
            easting, northing = pixel_centre(transform, row, column)
            patch = crop_patch(stack, transform, easting, northing, patch_size)
            if not patch_is_usable(patch):
                continue
            images.append(patch)
            coordinates.append((easting, northing))
    if not coordinates:
        return np.zeros((0, stack.shape[0], patch_size, patch_size), np.float32), np.zeros((0, 2))
    return np.stack(images).astype(np.float32), np.asarray(coordinates, dtype=np.float64)
