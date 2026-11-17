"""Per-cell covariate stack from the pre-aggregated 0.25 degree grids."""

from __future__ import annotations

from pathlib import Path

import numpy as np

from ai_archaeology.suitability.distance import distance_km
from ai_archaeology.suitability.grid import land_mask, latitude_grid

COVARIATE_NAMES = (
    "elevation", "slope", "relief", "river_distance", "coast_distance",
    "abs_latitude", "temperature", "precipitation",
)
CLIMATE_PERIODS = ("early-holocene", "mid-holocene", "late-holocene")


def load_grids(directory: Path) -> dict[str, np.ndarray]:
    grids = {path.stem: np.load(path) for path in sorted(directory.glob("*.npy"))}
    if "land_fraction" not in grids:
        raise FileNotFoundError(f"no covariate grids in {directory}; run scripts/fetch_global_covariates.py")
    return grids


def climate_grid(grids: dict[str, np.ndarray], variable: str, period: str) -> np.ndarray:
    """The period's own climate slice; the undated ``all`` period gets the mean of the three."""
    if period in CLIMATE_PERIODS:
        return grids[f"{variable}_{period}"]
    return np.mean([grids[f"{variable}_{name}"] for name in CLIMATE_PERIODS], axis=0)


def build_stack(grids: dict[str, np.ndarray], period: str) -> tuple[np.ndarray, np.ndarray]:
    """Covariates as (n_covariates, rows, cols) and the land mask. Unknown values stay NaN."""
    land = land_mask(grids["land_fraction"])
    layers = {
        "elevation": grids["elevation_mean"],
        "slope": grids["slope_mean"],
        "relief": grids["relief_std"],
        "river_distance": distance_km(grids["large_river"], land),
        "coast_distance": distance_km(~land, land),
        "abs_latitude": np.abs(latitude_grid()),
        "temperature": climate_grid(grids, "temperature", period),
        "precipitation": climate_grid(grids, "precipitation", period),
    }
    stack = np.stack([layers[name] for name in COVARIATE_NAMES]).astype(np.float32)
    return stack, land
