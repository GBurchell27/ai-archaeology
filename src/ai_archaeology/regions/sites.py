"""Known published monuments. These are labels, not candidates.

Point files are written only under ``data/`` or the home directory.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from rasterio.warp import transform

from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.regions.models import FeatureClassSpec, RegionRecord


@dataclass(frozen=True)
class KnownSite:
    region_id: str
    source_id: str
    feature_class: str
    longitude: float
    latitude: float
    diameter_m: tuple[float, float]

    def __repr__(self) -> str:
        return (
            f"KnownSite(region_id={self.region_id!r}, source_id={self.source_id!r}, "
            f"feature_class={self.feature_class!r})"
        )

    def projected(self, crs: str) -> tuple[float, float]:
        easting, northing = transform("EPSG:4326", crs, [self.longitude], [self.latitude])
        return float(easting[0]), float(northing[0])


def cache_sites(path: Path, sites: list[KnownSite], repo_root: Path) -> None:
    assert_untracked_product(path, repo_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    features = [_feature(site) for site in sites]
    payload = {"type": "FeatureCollection", "features": features}
    path.write_text(json.dumps(payload), encoding="utf-8")


def count_by_class(sites: list[KnownSite]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for site in sites:
        counts[site.feature_class] = counts.get(site.feature_class, 0) + 1
    return counts


def class_for_monument(name: str, classes: tuple[FeatureClassSpec, ...]) -> FeatureClassSpec | None:
    for spec in classes:
        if name in spec.monument_classes:
            return spec
    prefixed = [
        spec
        for spec in classes
        if spec.monument_class_prefix and name.startswith(spec.monument_class_prefix)
    ]
    if not prefixed:
        return None
    return max(prefixed, key=lambda spec: len(spec.monument_class_prefix or ""))


def _feature(site: KnownSite) -> dict:
    return {
        "type": "Feature",
        "id": site.source_id,
        "properties": {
            "region_id": site.region_id,
            "feature_class": site.feature_class,
            "source_id": site.source_id,
        },
        "geometry": {"type": "Point", "coordinates": [site.longitude, site.latitude]},
    }


def require_region(region: RegionRecord, expected_role: str) -> None:
    if region.role != expected_role:
        raise ValueError(f"{region.region_id} has role {region.role}, expected {expected_role}")
