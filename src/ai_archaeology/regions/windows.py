"""Resolve a small study window from a region file.

Inventory coordinates stay in memory and under ``data/``. The region YAML
names a public tile, a public National Register name, or atlas feature ids.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

from rasterio.warp import transform

from ai_archaeology.ingest.adapters.ireland_gsi import itm_bounds_from_tile_name
from ai_archaeology.ingest.http_fetch import request_json
from ai_archaeology.regions.models import RegionRecord
from ai_archaeology.regions.sites import KnownSite, class_for_monument

SMR_QUERY = (
    "https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/arcgis/rest/services/"
    "SMROpenData/FeatureServer/0/query"
)
NRHP_POLYGON_QUERY = (
    "https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/"
    "nrhp_locations/MapServer/1/query"
)
METRES_PER_DEGREE = 111_320.0


@dataclass(frozen=True)
class StudyWindow:
    west: float
    south: float
    east: float
    north: float
    sites: tuple[KnownSite, ...]
    tile_name: str | None = None

    @property
    def wgs84_bounds(self) -> tuple[float, float, float, float]:
        return self.west, self.south, self.east, self.north

    def __repr__(self) -> str:
        return f"StudyWindow(tile_name={self.tile_name!r}, n_sites={len(self.sites)})"


def locate_window(region: RegionRecord, repo_root: Path) -> StudyWindow:
    kind = region.aoi["kind"]
    if kind == "gsi_tile":
        return _gsi_window(region)
    if kind == "nrhp_polygon_buffer":
        return _nrhp_window(region)
    if kind == "atlas_sites_buffer":
        return _atlas_window(region, repo_root)
    raise ValueError(f"unsupported AOI kind {kind}")


def _gsi_window(region: RegionRecord) -> StudyWindow:
    tile_name = str(region.aoi["tile_name"])
    west, south, east, north = itm_bounds_from_tile_name(tile_name)
    longitudes, latitudes = transform("EPSG:2157", "EPSG:4326", [west, east], [south, north])
    sites = _smr_sites(region, west, south, east, north)
    return StudyWindow(
        west=min(longitudes),
        south=min(latitudes),
        east=max(longitudes),
        north=max(latitudes),
        sites=tuple(sites),
        tile_name=tile_name,
    )


def _smr_sites(region: RegionRecord, west: float, south: float, east: float, north: float) -> list[KnownSite]:
    where = (
        f"ITM_E >= {west} AND ITM_E < {east} AND ITM_N >= {south} AND ITM_N < {north}"
    )
    payload = request_json(
        SMR_QUERY,
        {
            "where": where,
            "outFields": "ENTITY_ID,SMRS,MONUMENT_CLASS,LONGITUDE,LATITUDE",
            "returnGeometry": "false",
            "resultRecordCount": 2000,
            "f": "pjson",
        },
        timeout=90,
    )
    sites: list[KnownSite] = []
    for feature in payload.get("features") or []:
        site = _smr_site(region, feature.get("attributes") or {})
        if site is not None:
            sites.append(site)
    return sites


def _smr_site(region: RegionRecord, attributes: dict) -> KnownSite | None:
    monument_class = str(attributes.get("MONUMENT_CLASS") or "")
    spec = class_for_monument(monument_class, region.feature_classes)
    if spec is None:
        return None
    longitude = attributes.get("LONGITUDE")
    latitude = attributes.get("LATITUDE")
    if longitude is None or latitude is None:
        return None
    source_id = str(attributes.get("SMRS") or attributes.get("ENTITY_ID"))
    return KnownSite(
        region_id=region.region_id,
        source_id=source_id,
        feature_class=spec.class_id,
        longitude=float(longitude),
        latitude=float(latitude),
        diameter_m=spec.diameter_m,
    )


def _nrhp_window(region: RegionRecord) -> StudyWindow:
    name = str(region.aoi["name"]).replace("'", "''")
    payload = request_json(
        NRHP_POLYGON_QUERY,
        {
            "where": f"RESNAME = '{name}' AND STATUS = 'Listed'",
            "outFields": "RESNAME,Is_NHL,STATUS,ResType",
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "pjson",
        },
    )
    features = payload.get("features") or []
    if len(features) != 1:
        raise FileNotFoundError(f"public NRHP polygon {name!r} returned {len(features)} features")
    longitude, latitude = _ring_centroid(features[0]["geometry"]["rings"][0])
    spec = region.feature_classes[0]
    site = KnownSite(
        region_id=region.region_id,
        source_id=name,
        feature_class=spec.class_id,
        longitude=longitude,
        latitude=latitude,
        diameter_m=spec.diameter_m,
    )
    west, south, east, north = _buffer_point(longitude, latitude, float(region.aoi["buffer_m"]))
    return StudyWindow(west, south, east, north, (site,))


def _atlas_window(region: RegionRecord, repo_root: Path) -> StudyWindow:
    path = repo_root / str(region.aoi["sites_path"])
    wanted = set(region.aoi["site_ids"])
    collection = json.loads(path.read_text(encoding="utf-8"))
    spec = region.feature_classes[0]
    sites = []
    for feature in collection["features"]:
        if feature.get("id") not in wanted:
            continue
        if feature["properties"].get("layer") != "neolithic":
            continue
        longitude, latitude = feature["geometry"]["coordinates"]
        sites.append(
            KnownSite(
                region_id=region.region_id,
                source_id=str(feature["id"]),
                feature_class=spec.class_id,
                longitude=float(longitude),
                latitude=float(latitude),
                diameter_m=spec.diameter_m,
            )
        )
    if len(sites) != len(wanted):
        found = sorted(site.source_id for site in sites)
        raise FileNotFoundError(f"atlas ids {sorted(wanted)} resolved to {found}")
    return _union_buffer(sites, float(region.aoi["buffer_m"]))


def _union_buffer(sites: list[KnownSite], buffer_m: float) -> StudyWindow:
    boxes = [_buffer_point(site.longitude, site.latitude, buffer_m) for site in sites]
    return StudyWindow(
        west=min(box[0] for box in boxes),
        south=min(box[1] for box in boxes),
        east=max(box[2] for box in boxes),
        north=max(box[3] for box in boxes),
        sites=tuple(sites),
    )


def _buffer_point(longitude: float, latitude: float, buffer_m: float) -> tuple[float, float, float, float]:
    latitude_delta = buffer_m / METRES_PER_DEGREE
    cosine = max(0.2, math.cos(math.radians(latitude)))
    longitude_delta = buffer_m / (METRES_PER_DEGREE * cosine)
    return (
        longitude - longitude_delta,
        latitude - latitude_delta,
        longitude + longitude_delta,
        latitude + latitude_delta,
    )


def _ring_centroid(ring: list) -> tuple[float, float]:
    longitudes = [float(point[0]) for point in ring]
    latitudes = [float(point[1]) for point in ring]
    return sum(longitudes) / len(longitudes), sum(latitudes) / len(latitudes)
