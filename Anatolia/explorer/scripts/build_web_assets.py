"""Build the explorer's web terrain from public DEM and Sentinel-2 COGs.

Run from the repository root, with the project virtualenv:

    .venv/bin/python Anatolia/explorer/scripts/build_web_assets.py

Intermediates stay in memory. Raw GeoTIFFs are not written. Outputs land in
Anatolia/explorer/public/terrain and are the only raster products meant for git,
and only when they stay small.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(REPO_ROOT / "src"))

from terrain_grids import (  # noqa: E402
    DST_CRS,
    REGION_PIXEL_M,
    SITE_PIXEL_M,
    SITE_SIZE_M,
    load_geographic_dem,
    read_reflectance,
    region_grid,
    search_sentinel_day,
    site_grid,
)
from web_export import (  # noqa: E402
    HILLSHADE_ALTITUDE,
    HILLSHADE_AZIMUTH,
    MULTI_DIRECTIONS,
    REGION_RELIEF_RADIUS_M,
    REGION_SVF_RADIUS_M,
    SITE_RELIEF_RADIUS_M,
    SITE_SVF_RADIUS_M,
    SVF_DIRECTIONS,
    layer_catalog,
    raster_names,
    write_terrain_textures,
)

SITES_PATH = REPO_ROOT / "Anatolia" / "explorer" / "public" / "sites.geojson"
OUT_DIR = REPO_ROOT / "Anatolia" / "explorer" / "public" / "terrain"
DEM_CREDIT = (
    "Contains modified Copernicus DEM data © DLR e.V. 2010-2014 and © Airbus Defence "
    "and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA"
)


def main() -> None:
    sites = json.loads(SITES_PATH.read_text())
    print("reading Copernicus DEM GLO-30 window", flush=True)
    dem_ll, transform_ll = load_geographic_dem()
    print(f"  geographic mosaic {dem_ll.shape[1]} x {dem_ll.shape[0]}", flush=True)
    overview = region_grid(dem_ll, transform_ll)
    print(
        f"  UTM overview {overview.width} x {overview.height} "
        f"at {overview.column_metres:.1f} m",
        flush=True,
    )
    day, scenes = search_sentinel_day()
    scene_ids = [feature["id"] for feature in scenes]
    print(f"Sentinel-2 day {day}: {', '.join(scene_ids)}", flush=True)
    optical = _reflectance(scenes, overview)
    region_range = write_terrain_textures(
        overview.values,
        overview.row_metres,
        overview.column_metres,
        optical["red"],
        optical["green"],
        optical["blue"],
        optical["nir"],
        OUT_DIR / "region",
        relief_radius_m=REGION_RELIEF_RADIUS_M,
        svf_radius_m=REGION_SVF_RADIUS_M,
    )
    site_records = [
        _export_site(feature, dem_ll, transform_ll, scenes) for feature in sites["features"]
    ]
    metadata = _metadata(overview, region_range, day, scene_ids, site_records)
    (OUT_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    total = _directory_bytes(OUT_DIR)
    print(f"wrote {OUT_DIR} ({total / 1_048_576:.1f} MB)", flush=True)


def _reflectance(scenes: list[dict], grid) -> dict[str, object]:
    bands = {}
    for name in ("red", "green", "blue", "nir"):
        print(f"  sentinel {name}", flush=True)
        bands[name] = read_reflectance(scenes, name, grid)
    return bands


def _export_site(feature: dict, dem_ll, transform_ll, scenes: list[dict]) -> dict:
    site_id = str(feature["id"])
    longitude, latitude = feature["geometry"]["coordinates"]
    print(f"site {site_id}", flush=True)
    grid, (easting, northing) = site_grid(dem_ll, transform_ll, longitude, latitude)
    nearby = _scenes_near(scenes, longitude, latitude)
    optical = _reflectance(nearby, grid)
    elevation_range = write_terrain_textures(
        grid.values,
        grid.row_metres,
        grid.column_metres,
        optical["red"],
        optical["green"],
        optical["blue"],
        optical["nir"],
        OUT_DIR / "sites" / site_id,
        relief_radius_m=SITE_RELIEF_RADIUS_M,
        svf_radius_m=SITE_SVF_RADIUS_M,
    )
    center_row = grid.height // 2
    center_column = grid.width // 2
    return {
        "id": site_id,
        "utm": [easting, northing],
        "groundElevation": float(grid.values[center_row, center_column]),
        "bounds": list(grid.bounds),
        "width": grid.width,
        "height": grid.height,
        "pixelSizeM": grid.column_metres,
        "neighbourhoodM": SITE_SIZE_M,
        "elevation": elevation_range,
        "rasters": {key: f"sites/{site_id}/{name}" for key, name in raster_names().items()},
    }


def _metadata(overview, region_range, day: str, scene_ids: list[str], site_records: list[dict]) -> dict:
    year = int(day[:4])
    return {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "crs": DST_CRS,
        "honestNote": "30 m terrain shows landscape, not individual enclosures.",
        "attribution": {
            "dem": DEM_CREDIT,
            "sentinel": f"Contains modified Copernicus Sentinel data {year}",
        },
        "parameters": {
            "geographicExtent": [38.55, 36.75, 39.55, 37.55],
            "regionPixelM": REGION_PIXEL_M,
            "sitePixelM": SITE_PIXEL_M,
            "siteNeighbourhoodM": SITE_SIZE_M,
            "hillshadeAzimuth": HILLSHADE_AZIMUTH,
            "hillshadeAltitude": HILLSHADE_ALTITUDE,
            "multiDirections": MULTI_DIRECTIONS,
            "svfDirections": SVF_DIRECTIONS,
            "regionReliefRadiusM": REGION_RELIEF_RADIUS_M,
            "regionSvfRadiusM": REGION_SVF_RADIUS_M,
            "siteReliefRadiusM": SITE_RELIEF_RADIUS_M,
            "siteSvfRadiusM": SITE_SVF_RADIUS_M,
        },
        "sentinel": {"day": day, "year": year, "sceneIds": scene_ids},
        "catalog": layer_catalog(),
        "region": {
            "bounds": list(overview.bounds),
            "width": overview.width,
            "height": overview.height,
            "pixelSizeM": overview.column_metres,
            "elevation": region_range,
            "rasters": {key: f"region/{name}" for key, name in raster_names().items()},
        },
        "sites": site_records,
    }


def _scenes_near(scenes: list[dict], longitude: float, latitude: float) -> list[dict]:
    """Granules that can touch a 5 km box around the published point."""
    margin = 0.06
    chosen = []
    for scene in scenes:
        west, south, east, north = scene["bbox"]
        overlaps = longitude + margin >= west and longitude - margin <= east
        overlaps = overlaps and latitude + margin >= south and latitude - margin <= north
        if overlaps:
            chosen.append(scene)
    if not chosen:
        raise RuntimeError(f"no Sentinel-2 scene covers {longitude:.4f}, {latitude:.4f}")
    return chosen


def _directory_bytes(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


if __name__ == "__main__":
    main()
