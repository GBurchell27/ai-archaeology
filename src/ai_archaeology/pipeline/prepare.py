"""Fetch one region, standardise it, and keep the training-resolution stack."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio

from ai_archaeology.ingest.adapters import get_adapter
from ai_archaeology.ingest.source import SourceTerrain, StandardisedRung
from ai_archaeology.ingest.standardise import standardise_terrain
from ai_archaeology.regions.blocks import BlockGrid, grid_from_bounds
from ai_archaeology.regions.models import RegionRecord
from ai_archaeology.regions.sites import KnownSite, cache_sites, count_by_class
from ai_archaeology.regions.windows import StudyWindow, locate_window
from ai_archaeology.train.config import RunConfig


@dataclass
class PreparedRegion:
    region: RegionRecord
    window: StudyWindow
    rungs: list[StandardisedRung]
    rung: StandardisedRung
    stack: np.ndarray
    elevation: np.ndarray
    transform: rasterio.Affine
    crs: str
    grid: BlockGrid
    sites: list[KnownSite]
    class_counts: dict[str, int]


def prepare_region(region: RegionRecord, repo_root: Path, work_dir: Path, config: RunConfig) -> PreparedRegion:
    window = locate_window(region, repo_root)
    cache_sites(work_dir / "inventories" / f"{region.region_id}.geojson", list(window.sites), repo_root)
    source = _fetch(region, window, work_dir / "raw" / region.region_id, repo_root)
    rungs = standardise_terrain(
        source,
        work_dir / "standard" / region.region_id,
        repo_root,
        multi_directions=config.multi_directions,
        svf_directions=config.svf_directions,
        relief_radius=config.relief_radius_m,
    )
    rung = select_rung(rungs, config.train_resolution_m)
    stack, elevation, transform, crs, bounds = _read_pair(rung)
    return PreparedRegion(
        region=region,
        window=window,
        rungs=rungs,
        rung=rung,
        stack=stack,
        elevation=elevation,
        transform=transform,
        crs=crs,
        grid=grid_from_bounds(bounds, region.validation),
        sites=list(window.sites),
        class_counts=count_by_class(list(window.sites)),
    )


def select_rung(rungs: list[StandardisedRung], resolution_m: float) -> StandardisedRung:
    eligible = [rung for rung in rungs if rung.resolution_m + 1e-6 >= resolution_m]
    pool = eligible or rungs
    return min(pool, key=lambda rung: abs(rung.resolution_m - resolution_m))


def _fetch(region: RegionRecord, window: StudyWindow, destination_dir: Path, repo_root: Path) -> SourceTerrain:
    adapter = get_adapter(str(region.dataset["adapter"]))
    destination_dir.mkdir(parents=True, exist_ok=True)
    if adapter.adapter_id == "ireland_gsi":
        return adapter.fetch(str(region.dataset["tile_name"]), destination_dir, repo_root)
    if adapter.adapter_id == "usgs_3dep":
        return adapter.fetch(
            window.wgs84_bounds,
            destination_dir / "3dep.tif",
            repo_root,
            target_resolution_m=float(region.dataset.get("requested_resolution_m", 1.0)),
        )
    if adapter.adapter_id == "copernicus_glo30":
        return adapter.fetch(window.wgs84_bounds, destination_dir / "glo30.tif", repo_root)
    raise RuntimeError(f"{adapter.adapter_id} is not enabled for this run")


def _read_pair(rung: StandardisedRung):
    with rasterio.open(rung.relief_path) as dataset:
        stack = dataset.read().astype(np.float32)
        transform = dataset.transform
        epsg = dataset.crs.to_epsg()
        if epsg is None:
            raise ValueError("standardised relief has no EPSG code")
        crs = f"EPSG:{epsg}"
        bounds = (dataset.bounds.left, dataset.bounds.bottom, dataset.bounds.right, dataset.bounds.top)
    with rasterio.open(rung.elevation_path) as dataset:
        elevation = dataset.read(1).astype(np.float32)
    return stack, elevation, transform, crs, bounds
