"""Geological Survey Ireland Phase 2 bare-earth LiDAR tiles.

Tiles are 2 km products in ITM (EPSG:2157), Malin Head heights, CC BY 4.0.
The tile name ``P_EEEENNN`` is the south-west corner in kilometres.
"""

from __future__ import annotations

import re
from pathlib import Path

import py7zr

from ai_archaeology.ingest.http_fetch import download_file, request_json
from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.ingest.source import SourceTerrain

COVERAGE_QUERY = (
    "https://gsi.geodata.gov.ie/server/rest/services/Lidar/"
    "IE_GSI_LiDAR_Coverage_GSI_Phase2_IE26_ITM/MapServer/12/query"
)
TILE_NAME = re.compile(r"^P_(\d{3})(\d{3})$")
ATTRIBUTION = (
    "Contains Irish Public Sector Data (Geological Survey Ireland) licensed "
    "under a Creative Commons Attribution 4.0 International (CC BY 4.0) licence."
)


class IrelandGsiAdapter:
    adapter_id = "ireland_gsi"

    def fetch(self, tile_name: str, destination_dir: Path, repo_root: Path) -> SourceTerrain:
        assert_untracked_product(destination_dir, repo_root)
        record = _coverage_record(tile_name)
        archive_path = destination_dir / f"{tile_name}.7z"
        download_file(record["DATA_URL"], archive_path)
        elevation_path = _extract_geotiff(archive_path, destination_dir, tile_name)
        return SourceTerrain(
            path=elevation_path,
            source="Geological Survey Ireland Phase 2 LiDAR DTM",
            licence="CC-BY-4.0",
            attribution=ATTRIBUTION,
            acquisition_date=record.get("DATECAPTUR"),
            native_resolution_m=float(record.get("RESOLUTION") or 1.0),
            vertical_datum="Malin Head",
            bare_earth=True,
            source_url=record["DATA_URL"],
            adapter=self.adapter_id,
        )


def itm_bounds_from_tile_name(tile_name: str) -> tuple[float, float, float, float]:
    match = TILE_NAME.fullmatch(tile_name)
    if match is None:
        raise ValueError(f"{tile_name!r} is not a GSI tile name like P_582760")
    west = int(match.group(1)) * 1000.0
    south = int(match.group(2)) * 1000.0
    return west, south, west + 2000.0, south + 2000.0


def _coverage_record(tile_name: str) -> dict:
    payload = request_json(
        COVERAGE_QUERY,
        {
            "where": f"DATA_NAME = '{tile_name}'",
            "outFields": "DATA_NAME,DATA_URL,RESOLUTION,DATECAPTUR,COUNTY,LICENCE",
            "returnGeometry": "false",
            "f": "pjson",
        },
    )
    features = payload.get("features") or []
    if not features:
        raise FileNotFoundError(f"GSI coverage has no tile {tile_name}")
    return features[0]["attributes"]


def _extract_geotiff(archive_path: Path, destination_dir: Path, tile_name: str) -> Path:
    extract_dir = destination_dir / f"{tile_name}_archive"
    extract_dir.mkdir(parents=True, exist_ok=True)
    with py7zr.SevenZipFile(archive_path, mode="r") as archive:
        archive.extractall(path=extract_dir)
    matches = list(extract_dir.rglob("*.tif"))
    if len(matches) != 1:
        raise FileNotFoundError(f"{tile_name} archive did not contain one GeoTIFF")
    return matches[0]
