"""Which feature classes can exist as a shape at a given pixel size.

A class is present when even its small examples span at least 2.5 pixels.
It is marginal when only the large examples do. Otherwise the monument is
unresolved: a 30 m pixel cannot hold a 25–60 m ringfort as a distinct shape.
"""

from __future__ import annotations

PRESENT_PIXELS = 2.5
PHYSICS_NOTE = (
    "Ringforts are about 25–60 m across and barrows are smaller, so at 30 m "
    "they are unresolved: the monument is one or two pixels, or none. Large "
    "enclosures and a platform-mound complex can remain as broad relief. The "
    "atlas sites in the Turkey window are published Taş Tepeler places. Their "
    "enclosures are mostly 10–30 m. They are not classic höyüks, and a 30 m "
    "DSM does not show buildings, ditches, or anything under sediment. "
    "Transfer trained on source terrain degraded to 30 m is expected to be weak."
)


def visibility(diameter_low_m: float, diameter_high_m: float, resolution_m: float) -> str:
    limit = PRESENT_PIXELS * resolution_m
    if diameter_low_m >= limit:
        return "present"
    if diameter_high_m >= limit:
        return "marginal"
    return "unresolved"


def scale_rows(regions, resolution_m: float = 30.0) -> list[dict]:
    rows = []
    for region in regions:
        for spec in region.feature_classes:
            rows.append(
                {
                    "region_id": region.region_id,
                    "feature_class": spec.class_id,
                    "diameter_low_m": spec.diameter_m[0],
                    "diameter_high_m": spec.diameter_m[1],
                    "resolution_m": resolution_m,
                    "visibility": visibility(spec.diameter_m[0], spec.diameter_m[1], resolution_m),
                    "note": spec.note,
                }
            )
    return rows
