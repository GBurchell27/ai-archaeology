"""Turn one source raster into COGs on the resolution ladder, plus relief."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import transform

from ai_archaeology.ingest.cog import write_elevation_cog
from ai_archaeology.ingest.crs_utm import epsg_code, utm_epsg
from ai_archaeology.ingest.nodata import mask_voids
from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.ingest.relief_stack import relief_radius_m, write_relief_stack
from ai_archaeology.ingest.resample import resample_elevation
from ai_archaeology.ingest.resolution import selectable_resolutions
from ai_archaeology.ingest.schema import (
    ProcessingStep,
    TerrainMetadata,
    file_sha256,
    library_versions,
    utc_now,
    write_metadata,
)
from ai_archaeology.ingest.source import SourceTerrain, StandardisedRung

PIPELINE_VERSION = "1"


def standardise_terrain(
    source: SourceTerrain,
    destination_dir: Path,
    repo_root: Path,
    *,
    multi_directions: int = 4,
    svf_directions: int = 8,
    relief_radius: float | None = None,
) -> list[StandardisedRung]:
    assert_untracked_product(destination_dir, repo_root)
    destination_dir.mkdir(parents=True, exist_ok=True)
    with rasterio.open(source.path) as dataset:
        declared = dataset.nodata
        elevation = mask_voids(dataset.read(1), declared)
        source_crs = dataset.crs
        source_transform = dataset.transform
        destination_bounds = _bounds_in_utm(dataset.bounds, source_crs)
        destination_epsg = _utm_for_bounds(dataset.bounds, source_crs)
    created_at = utc_now()
    versions = library_versions()
    rungs: list[StandardisedRung] = []
    for resolution in selectable_resolutions(source.native_resolution_m):
        rungs.append(
            _write_rung(
                source,
                elevation,
                source_transform,
                source_crs,
                destination_bounds,
                destination_epsg,
                resolution,
                destination_dir,
                created_at,
                versions,
                multi_directions,
                svf_directions,
                relief_radius,
            )
        )
    return rungs


def _write_rung(
    source: SourceTerrain,
    elevation: np.ndarray,
    source_transform,
    source_crs,
    destination_bounds,
    destination_epsg: int,
    resolution: float,
    destination_dir: Path,
    created_at: str,
    versions: dict[str, str],
    multi_directions: int,
    svf_directions: int,
    relief_radius: float | None,
) -> StandardisedRung:
    crs_name = epsg_code(destination_epsg)
    resampled, transform_out = resample_elevation(
        elevation,
        source_transform,
        source_crs,
        crs_name,
        destination_bounds,
        source.native_resolution_m,
        resolution,
    )
    elevation_path, relief_path, metadata_path = _rung_paths(destination_dir, source.adapter, resolution)
    radius = relief_radius_m(resolution, relief_radius)
    _write_rung_files(
        source, resampled, transform_out, crs_name, resolution, elevation_path, relief_path,
        metadata_path, created_at, versions, radius, multi_directions, svf_directions,
    )
    return StandardisedRung(resolution, elevation_path, relief_path, metadata_path, crs_name)


def _rung_paths(destination_dir: Path, adapter: str, resolution: float) -> tuple[Path, Path, Path]:
    stem = f"{adapter}_{int(resolution)}m"
    return (
        destination_dir / f"{stem}_elevation.tif",
        destination_dir / f"{stem}_relief.tif",
        destination_dir / f"{stem}_elevation.json",
    )


def _write_rung_files(
    source, resampled, transform_out, crs_name, resolution, elevation_path, relief_path,
    metadata_path, created_at, versions, radius, multi_directions, svf_directions,
) -> None:
    write_elevation_cog(elevation_path, resampled, transform_out, crs_name)
    write_relief_stack(
        relief_path,
        resampled,
        transform_out,
        crs_name,
        resolution,
        radius_m=radius,
        multi_directions=multi_directions,
        svf_directions=svf_directions,
    )
    write_metadata(
        metadata_path,
        _metadata(source, resolution, crs_name, elevation_path, created_at, versions, radius, multi_directions, svf_directions),
    )


def _metadata(
    source: SourceTerrain,
    resolution: float,
    crs_name: str,
    elevation_path: Path,
    created_at: str,
    versions: dict[str, str],
    radius: float,
    multi_directions: int,
    svf_directions: int,
) -> TerrainMetadata:
    return TerrainMetadata(
        source=source.source,
        licence=source.licence,
        attribution=source.attribution,
        acquisition_date=source.acquisition_date,
        native_resolution_m=source.native_resolution_m,
        target_resolution_m=resolution,
        vertical_datum=source.vertical_datum,
        crs=crs_name,
        nodata=-9999.0,
        bare_earth=source.bare_earth,
        checksum_sha256=file_sha256(elevation_path),
        adapter=source.adapter,
        source_url=source.source_url,
        created_at=created_at,
        library_versions=versions,
        processing_steps=_processing_steps(resolution, crs_name, radius, multi_directions, svf_directions),
    )


def _processing_steps(resolution, crs_name, radius, multi_directions, svf_directions) -> list[ProcessingStep]:
    return [
        ProcessingStep("mask_voids", PIPELINE_VERSION, {"nodata": -9999.0, "void_at_or_below": -1000.0}),
        ProcessingStep(
            "resample",
            PIPELINE_VERSION,
            {
                "method": "average_when_coarser_else_bilinear",
                "target_resolution_m": resolution,
                "target_crs": crs_name,
            },
        ),
        ProcessingStep(
            "relief",
            PIPELINE_VERSION,
            {
                "radius_m": radius,
                "multi_directions": multi_directions,
                "svf_directions": svf_directions,
                "implementation": "ai_archaeology.relief",
            },
        ),
    ]


def _utm_for_bounds(bounds, crs) -> int:
    longitude, latitude = _centroid_lonlat(bounds, crs)
    return utm_epsg(longitude, latitude)


def _centroid_lonlat(bounds, crs) -> tuple[float, float]:
    centre_x = (bounds.left + bounds.right) / 2.0
    centre_y = (bounds.bottom + bounds.top) / 2.0
    if getattr(crs, "is_geographic", False):
        return centre_x, centre_y
    longitude, latitude = transform(crs, "EPSG:4326", [centre_x], [centre_y])
    return float(longitude[0]), float(latitude[0])


def _bounds_in_utm(bounds, crs) -> tuple[float, float, float, float]:
    epsg = _utm_for_bounds(bounds, crs)
    corners_x = [bounds.left, bounds.left, bounds.right, bounds.right]
    corners_y = [bounds.bottom, bounds.top, bounds.bottom, bounds.top]
    projected_x, projected_y = transform(crs, epsg_code(epsg), corners_x, corners_y)
    return min(projected_x), min(projected_y), max(projected_x), max(projected_y)
