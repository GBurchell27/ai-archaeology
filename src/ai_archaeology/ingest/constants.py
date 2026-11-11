"""Shared numeric constants for the standardised terrain products."""

from __future__ import annotations

NODATA = -9999.0
VOID_AT_OR_BELOW = -1000.0
RESOLUTION_LADDER_M = (1.0, 5.0, 10.0, 30.0)
RELIEF_BANDS = (
    "hillshade",
    "multidirectional_hillshade",
    "slope",
    "local_relief",
    "sky_view_factor",
)
VERTICAL_UNIT = "metres"
