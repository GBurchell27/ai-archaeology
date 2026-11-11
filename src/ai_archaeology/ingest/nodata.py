"""Turn declared nodata and void sentinels into one explicit nodata value."""

from __future__ import annotations

import numpy as np

from ai_archaeology.ingest.constants import NODATA, VOID_AT_OR_BELOW


def mask_voids(values: np.ndarray, declared_nodata: float | None) -> np.ndarray:
    """Return float32 elevations with ``NODATA`` in void cells.

    Cells at or below ``VOID_AT_OR_BELOW`` metres are treated as sentinels.
    That threshold is below the terrain in the registered study windows. It is
    not a general rule for basins such as the Dead Sea.
    """
    masked = np.array(values, dtype=np.float32, copy=True)
    invalid = ~np.isfinite(masked) | (masked <= VOID_AT_OR_BELOW)
    if declared_nodata is not None and np.isfinite(declared_nodata):
        invalid |= masked == np.float32(declared_nodata)
    masked[invalid] = np.float32(NODATA)
    return masked
