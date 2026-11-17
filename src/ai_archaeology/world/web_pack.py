"""Pack merged world sites into the static columnar files the globe reads.

The shapes, cell keys and detail buckets mirror Anatolia/atlas/lib/world/catalogueTypes.ts.
OpenStreetMap megaliths get their own column file. They also appear in the per-id detail shards,
unmerged and under their own ODbL credit.
"""

from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path

from ai_archaeology.world.records import SITE_TYPES, SOURCES, WorldSite

# Monument classes count double when ranking for the core, so a known dolmen beats an equally
# known findspot. A register stub with no sitelink still scores nothing and goes to its cell.
CORE_BOOSTED_SITE_TYPES = frozenset({"megalith", "monumental", "geoglyph"})
CORE_TYPE_BOOST = 2
CORE_TARGET = 40_000
CELL_DEGREES = 10
OSM_FILE = "osm-megaliths.json"
# Licences as registered in docs/data-sources.md.
SOURCE_CREDITS = {
    "wikidata": ("Wikidata", "CC0 1.0", "Wikidata", "https://www.wikidata.org/"),
    "pleiades": ("Pleiades", "CC BY 3.0", "Pleiades contributors", "https://pleiades.stoa.org/"),
    "osm": ("OpenStreetMap", "ODbL 1.0", "© OpenStreetMap contributors", "https://www.openstreetmap.org/copyright"),
}
FEATURED_FIELDS = ("country", "category", "period", "startYear", "endYear", "datingConfidence", "status", "why", "source")


def cell_key_for(lon: float, lat: float) -> str:
    lon_index = min(35, math.floor((lon + 180) / CELL_DEGREES))
    lat_index = min(17, math.floor((lat + 90) / CELL_DEGREES))
    return f"{lon_index}_{lat_index}"


def detail_bucket(site_id: str) -> str:
    return site_id[-2:].lower()


def split_core(
    sites: list[WorldSite], featured_ids: set[str], core_target: int = CORE_TARGET,
) -> tuple[list[WorldSite], list[WorldSite]]:
    """Core = every featured site, topped up to about ``core_target`` by boosted importance.

    Sites tied with the last one admitted come in too, so the cut is never an accident of id
    order. Ties at a score of zero (no known importance) are the exception: those stop at the target.
    """
    featured = [site for site in sites if site.id in featured_ids]
    ranked = sorted((site for site in sites if site.id not in featured_ids), key=_core_rank)
    room = min(len(ranked), max(0, core_target - len(featured)))
    cutoff_score = _core_score(ranked[room - 1]) if room else 0
    while cutoff_score > 0 and room < len(ranked) and _core_score(ranked[room]) == cutoff_score:
        room += 1
    return sorted(featured + ranked[:room], key=_label_rank), ranked[room:]


def column_block(sites: list[WorldSite], featured_ids: set[str]) -> dict[str, list]:
    ranked = sorted(sites, key=_label_rank)
    return {
        "id": [site.id for site in ranked],
        "name": [site.name for site in ranked],
        "lon": [round(site.lon, 5) for site in ranked],
        "lat": [round(site.lat, 5) for site in ranked],
        "type": [SITE_TYPES.index(site.siteType) for site in ranked],
        "start": [site.startYear for site in ranked],
        "end": [site.endYear for site in ranked],
        "importance": [site.importance for site in ranked],
        "source": [SOURCES.index(site.source) for site in ranked],
        "featured": [int(site.id in featured_ids) for site in ranked],
    }


def build_catalogue_files(
    merged_sites: list[WorldSite],
    osm_sites: list[WorldSite],
    featured_monuments: list[dict],
    generated: str,
    core_target: int = CORE_TARGET,
) -> dict[str, object]:
    """Every file of the web catalogue, keyed by its path under public/world/."""
    if any(site.source == "osm" for site in merged_sites) or any(site.source != "osm" for site in osm_sites):
        raise ValueError("OpenStreetMap records belong only in the OSM layer")
    featured_ids = {monument["qid"] for monument in featured_monuments}
    core, rest = split_core(merged_sites, featured_ids, core_target)
    cells: dict[str, list[WorldSite]] = {}
    for site in rest:
        cells.setdefault(cell_key_for(round(site.lon, 5), round(site.lat, 5)), []).append(site)
    files: dict[str, object] = {
        "index.json": _index(merged_sites, osm_sites, core, cells, generated),
        "core.json": column_block(core, featured_ids),
        "featured.json": _featured_rows(merged_sites, featured_monuments),
        OSM_FILE: column_block(osm_sites, set()),
    }
    for cell_key, cell_sites in cells.items():
        files[f"cells/{cell_key}.json"] = column_block(cell_sites, featured_ids)
    # Per-id lookup only: an OSM record sits beside the others, carrying its own ODbL credit, never merged with them.
    for bucket, details in _detail_shards([*merged_sites, *osm_sites]).items():
        files[f"detail/{bucket}.json"] = details
    return files


def write_catalogue(out_dir: Path, files: dict[str, object]) -> dict[str, int]:
    """Write compact JSON. Returns the byte size of each file."""
    sizes = {}
    for relative, payload in sorted(files.items()):
        encoded = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        path = out_dir / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encoded)
        sizes[relative] = len(encoded)
    return sizes


def _label_rank(site: WorldSite) -> tuple[int, str]:
    # The id breaks ties so the output does not depend on input order.
    return (-site.importance, site.id)


def _core_score(site: WorldSite) -> int:
    return site.importance * (CORE_TYPE_BOOST if site.siteType in CORE_BOOSTED_SITE_TYPES else 1)


def _core_rank(site: WorldSite) -> tuple[int, str]:
    return (-_core_score(site), site.id)


def _index(
    merged_sites: list[WorldSite],
    osm_sites: list[WorldSite],
    core: list[WorldSite],
    cells: dict[str, list[WorldSite]],
    generated: str,
) -> dict:
    per_source = Counter(site.source for site in (*merged_sites, *osm_sites))
    sources = []
    for source in SOURCES:
        name, licence, attribution, url = SOURCE_CREDITS[source]
        sources.append({
            "id": source, "name": name, "licence": licence, "attribution": attribution, "url": url,
            "count": per_source[source],
        })
    return {
        "generated": generated,
        "count": len(merged_sites),
        "coreCount": len(core),
        "siteTypes": list(SITE_TYPES),
        "sources": sources,
        "cellDegrees": CELL_DEGREES,
        "cells": {cell_key: len(cells[cell_key]) for cell_key in sorted(cells)},
        "osmMegaliths": {"count": len(osm_sites), "file": OSM_FILE},
    }


def _featured_rows(merged_sites: list[WorldSite], featured_monuments: list[dict]) -> list[dict]:
    """Curated order and wording; the point is the published record's."""
    by_id = {site.id: site for site in merged_sites}
    rows = []
    for monument in featured_monuments:
        site = by_id.get(monument["qid"])
        if site is None:
            continue
        row = {"id": site.id, "name": monument["name"], "lon": round(site.lon, 5), "lat": round(site.lat, 5)}
        row.update({field: monument.get(field) for field in FEATURED_FIELDS})
        rows.append(row)
    return rows


def _detail_shards(sites: list[WorldSite]) -> dict[str, dict[str, dict]]:
    shards: dict[str, dict[str, dict]] = {}
    for site in sorted(sites, key=lambda site: site.id):
        shards.setdefault(detail_bucket(site.id), {})[site.id] = _detail_record(site)
    return shards


def _detail_record(site: WorldSite) -> dict:
    """StoredSiteDetail in catalogueTypes.ts: null and empty optional fields are left out for size."""
    record = {
        "lon": round(site.lon, 5),
        "lat": round(site.lat, 5),
        "name": site.name,
        "sourceUrl": site.sourceUrl,
        "licence": site.licence,
        "attribution": site.attribution,
        "datingSource": site.datingSource,
        # The record's own id is the shard key already.
        "ids": {key: value for key, value in site.ids.items() if value is not None and value != site.id},
    }
    optional = {"wikipedia": site.wikipedia, "image": site.image, "types": site.types, "heritage": site.heritage}
    record.update({key: value for key, value in optional.items() if value})
    return record
