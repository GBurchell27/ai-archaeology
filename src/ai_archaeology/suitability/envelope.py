"""Covariate envelope: where the model has training cells to stand on."""

from __future__ import annotations

import numpy as np

ENVELOPE_PERCENTILES = (1.0, 99.0)


def covariate_range(training_features: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-covariate 1st and 99th percentile of the presence and background cells."""
    low, high = np.percentile(training_features, ENVELOPE_PERCENTILES, axis=0)
    return low, high


def inside_envelope(features: np.ndarray, low: np.ndarray, high: np.ndarray) -> np.ndarray:
    """False where any covariate is outside its training range: the model has no basis there."""
    return ((features >= low) & (features <= high)).all(axis=1)
