"""Run configuration. Paths for rasters stay under data/ and outputs/."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class RunConfig:
    work_dir: str
    output_dir: str
    patch_size: int
    epochs: int
    learning_rate: float
    negatives_per_positive: int
    negative_buffer_m: float
    seed: int
    train_resolution_m: float
    candidate_density_per_km2: float
    recall_radii_m: tuple[float, ...]
    random_draws: int
    relief_radius_m: float
    multi_directions: int
    svf_directions: int
    review_db: str | None


def load_run_config(path: Path) -> RunConfig:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    return RunConfig(
        work_dir=str(payload["work_dir"]),
        output_dir=str(payload["output_dir"]),
        patch_size=int(payload["patch_size"]),
        epochs=int(payload["epochs"]),
        learning_rate=float(payload["learning_rate"]),
        negatives_per_positive=int(payload["negatives_per_positive"]),
        negative_buffer_m=float(payload["negative_buffer_m"]),
        seed=int(payload["seed"]),
        train_resolution_m=float(payload["train_resolution_m"]),
        candidate_density_per_km2=float(payload["candidate_density_per_km2"]),
        recall_radii_m=tuple(float(value) for value in payload["recall_radii_m"]),
        random_draws=int(payload["random_draws"]),
        relief_radius_m=float(payload["relief_radius_m"]),
        multi_directions=int(payload["multi_directions"]),
        svf_directions=int(payload["svf_directions"]),
        review_db=payload.get("review_db"),
    )
