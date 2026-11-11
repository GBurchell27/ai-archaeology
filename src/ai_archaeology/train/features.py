"""Hand-crafted summaries of a relief patch for the gradient-boosting baseline."""

from __future__ import annotations

import numpy as np

from ai_archaeology.ingest.constants import NODATA


def relief_feature_vector(patch: np.ndarray) -> np.ndarray:
    values: list[float] = []
    for band in patch:
        finite = band[np.isfinite(band) & (band != NODATA)]
        if finite.size == 0:
            values.extend((0.0, 0.0))
        else:
            values.extend((float(np.mean(finite)), float(np.std(finite))))
    centre_row = patch.shape[1] // 2
    centre_column = patch.shape[2] // 2
    for band_value in patch[:, centre_row, centre_column]:
        values.append(0.0 if band_value == NODATA or not np.isfinite(band_value) else float(band_value))
    return np.asarray(values, dtype=np.float64)
