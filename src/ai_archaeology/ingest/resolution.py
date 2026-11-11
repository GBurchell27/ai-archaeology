"""Target-resolution ladder. Finer rungs than the sensor are refused."""

from __future__ import annotations

from ai_archaeology.ingest.constants import RESOLUTION_LADDER_M


class UpsampleRefused(ValueError):
    """A finer target would invent detail the source raster did not measure."""


# A rung may be at most 5% finer than the delivered pixel. That absorbs export
# rounding. It does not turn a 30 m DEM into a 10 m DEM.
_RUNG_TOLERANCE = 1.05


def selectable_resolutions(native_resolution_m: float) -> tuple[float, ...]:
    if native_resolution_m <= 0 or native_resolution_m != native_resolution_m:
        raise ValueError("native resolution must be a positive finite number of metres")
    chosen = tuple(
        resolution
        for resolution in RESOLUTION_LADDER_M
        if resolution * _RUNG_TOLERANCE + 1e-6 >= native_resolution_m
    )
    if not chosen:
        raise ValueError(f"no ladder rung is coarser than native {native_resolution_m} m")
    return chosen


def assert_not_upsampling(native_resolution_m: float, target_resolution_m: float) -> None:
    if target_resolution_m * _RUNG_TOLERANCE + 1e-6 < native_resolution_m:
        raise UpsampleRefused(
            f"target {target_resolution_m} m is finer than native {native_resolution_m} m"
        )
