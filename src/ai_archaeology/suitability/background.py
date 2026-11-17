"""Target-group background: the cells where anyone has published any site.

Comparing presences against these cells, instead of against all land, holds survey effort
roughly constant: both sides of the comparison were looked at by someone.
"""

from __future__ import annotations

import numpy as np


def target_group_background(site_counts: np.ndarray) -> np.ndarray:
    return site_counts > 0


def contrast_cells(presence: np.ndarray, background: np.ndarray) -> np.ndarray:
    """Documented cells without a presence of the modelled class: the model's zeros."""
    return background & ~presence
