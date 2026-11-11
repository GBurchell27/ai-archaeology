"""Load ``regions/*.yaml`` into region records."""

from __future__ import annotations

from pathlib import Path

import yaml

from ai_archaeology.regions.models import (
    FeatureClassSpec,
    FrozenRule,
    RegionRecord,
    ValidationPlan,
)


def load_registry(regions_dir: Path) -> list[RegionRecord]:
    paths = sorted(regions_dir.glob("*.yaml"))
    if not paths:
        raise FileNotFoundError(f"no region files in {regions_dir}")
    return [load_region(path) for path in paths]


def load_region(path: Path) -> RegionRecord:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    validation = payload["validation"]
    frozen = validation["frozen"]
    classes = tuple(_feature_class(item) for item in payload["feature_classes"])
    return RegionRecord(
        region_id=str(payload["region_id"]),
        role=str(payload["role"]),
        title=str(payload["title"]),
        aoi=dict(payload["aoi"]),
        dataset=dict(payload["dataset"]),
        inventory=dict(payload["inventory"]),
        validation=ValidationPlan(
            block_size_m=float(validation["block_size_m"]),
            n_folds=int(validation["n_folds"]),
            frozen=FrozenRule(
                method=str(frozen["method"]),
                columns=int(frozen["columns"]),
                buffer_m=float(frozen["buffer_m"]),
            ),
        ),
        feature_classes=classes,
    )


def _feature_class(item: dict) -> FeatureClassSpec:
    low, high = item["diameter_m"]
    return FeatureClassSpec(
        class_id=str(item["id"]),
        diameter_m=(float(low), float(high)),
        monument_classes=tuple(item.get("monument_classes") or ()),
        monument_class_prefix=item.get("monument_class_prefix"),
        note=str(item.get("note") or ""),
    )
