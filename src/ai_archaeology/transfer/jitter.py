"""Move a shareable figure point by at least 5 km.

This is for drawings. It is not a way to store a candidate location.
"""

from __future__ import annotations

import hashlib
import math

MINIMUM_JITTER_M = 5000.0


def jitter_shareable_point(
    easting_m: float,
    northing_m: float,
    metres: float = MINIMUM_JITTER_M,
    salt: str = "share",
) -> tuple[float, float]:
    if metres < MINIMUM_JITTER_M:
        raise ValueError("shareable figures move a point by at least 5 km")
    digest = hashlib.sha256(f"{salt}:{easting_m:.3f}:{northing_m:.3f}".encode("utf-8")).digest()
    angle = int.from_bytes(digest[:4], "little") / 2**32 * 2.0 * math.pi
    return easting_m + metres * math.cos(angle), northing_m + metres * math.sin(angle)


def displacement_m(origin: tuple[float, float], moved: tuple[float, float]) -> float:
    return math.hypot(moved[0] - origin[0], moved[1] - origin[1])
