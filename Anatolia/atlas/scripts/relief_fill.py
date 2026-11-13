"""Fill masked GEM-15 cells from a second elevation grid.

GEM-15 stores water and other rejected cells as NaN. Copernicus GLO-30 is on
EGM2008; GEM-15 is on EGM96. A single offset, the median of their overlap,
puts the fill on the GEM-15 datum before the holes are written.
"""

from __future__ import annotations

import numpy as np

MIN_OVERLAP = 50


def fill_masked_cells(primary: np.ndarray, reference: np.ndarray) -> tuple[np.ndarray, float]:
    """Return ``primary`` with NaN cells replaced from ``reference``.

    The reference is shifted by ``median(reference - primary)`` on the overlap.
    Cells that are missing in both inputs stay NaN. ``primary`` is not mutated.
    """
    surface = np.array(primary, dtype=np.float32, copy=True)
    other = np.asarray(reference, dtype=np.float32)
    if surface.shape != other.shape:
        raise ValueError("elevation grids must share a shape")
    offset = _datum_offset(surface, other)
    holes = ~np.isfinite(surface) & np.isfinite(other)
    surface[holes] = other[holes] - np.float32(offset)
    return surface, offset


def _datum_offset(primary: np.ndarray, reference: np.ndarray) -> float:
    overlap = np.isfinite(primary) & np.isfinite(reference)
    if int(overlap.sum()) < MIN_OVERLAP:
        return 0.0
    delta = reference[overlap] - primary[overlap]
    return float(np.median(delta))
