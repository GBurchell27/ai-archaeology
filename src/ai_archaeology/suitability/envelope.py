"""Where the model has training cells to stand on: in covariate space and on the map."""

from __future__ import annotations

import numpy as np
from scipy import ndimage

ENVELOPE_PERCENTILES = (1.0, 99.0)
SUPPORT_WINDOW_CELLS = 21  # about 5 degrees across
MIN_DOCUMENTED_NEARBY = 10


def covariate_range(training_features: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-covariate 1st and 99th percentile of the presence and background cells."""
    low, high = np.percentile(training_features, ENVELOPE_PERCENTILES, axis=0)
    return low, high


def inside_envelope(features: np.ndarray, low: np.ndarray, high: np.ndarray) -> np.ndarray:
    """False where any covariate is outside its training range: the model has no basis there."""
    return ((features >= low) & (features <= high)).all(axis=1)


def locally_documented(background: np.ndarray) -> np.ndarray:
    """True where enough documented cells lie within about 2.5 degrees.

    The fitted pattern does not transfer between continents, so matching conditions far from
    any documented cell are not a basis for a score.
    """
    share = ndimage.uniform_filter(background.astype(np.float32), SUPPORT_WINDOW_CELLS, mode=("constant", "wrap"))
    return share * SUPPORT_WINDOW_CELLS**2 >= MIN_DOCUMENTED_NEARBY - 0.5
