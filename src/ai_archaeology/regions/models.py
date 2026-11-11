"""Region registry records. Coordinates of known sites are not stored here."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FeatureClassSpec:
    class_id: str
    diameter_m: tuple[float, float]
    monument_classes: tuple[str, ...] = ()
    monument_class_prefix: str | None = None
    note: str = ""


@dataclass(frozen=True)
class FrozenRule:
    method: str
    columns: int
    buffer_m: float


@dataclass(frozen=True)
class ValidationPlan:
    block_size_m: float
    n_folds: int
    frozen: FrozenRule


@dataclass(frozen=True)
class RegionRecord:
    region_id: str
    role: str
    title: str
    aoi: dict
    dataset: dict
    inventory: dict
    validation: ValidationPlan
    feature_classes: tuple[FeatureClassSpec, ...] = field(default_factory=tuple)

    @property
    def is_transfer_target(self) -> bool:
        return self.role == "transfer_target"
