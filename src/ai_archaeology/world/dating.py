"""Dating enrichment for merged world sites: radiocarbon spans, then curated featured dates.

Radiocarbon coordinates are fuzzed on purpose. They decide whether a name match
is plausible and nothing else: no function here writes a longitude or latitude
onto an existing site.
"""

from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

from ai_archaeology.sites.wikidata import _fold, _haversine_m
from ai_archaeology.world.records import WorldSite

RADIOCARBON_MATCH_M = 5000.0
# Licences as registered in docs/data-sources.md.
RADIOCARBON_CREDITS = {
    "xronos": ("XRONOS", "CC BY 4.0"),
    "p3k14c": ("p3k14c (Bird et al. 2022)", "CC0"),
}
# Only used for a featured monument that the Wikidata source did not return.
FEATURED_CATEGORY_SITE_TYPES = {
    "megalith": "megalith",
    "city": "city",
    "settlement": "settlement",
    "burial": "necropolis",
    "rock-art": "rock-art",
    "pyramid-or-platform": "monumental",
    "monumental-enclosure": "monumental",
    "earthwork": "enclosure",
    "rock-cut": "monumental",
    "tell": "tell",
    "geoglyph": "geoglyph",
}


def is_dated(site: WorldSite) -> bool:
    return site.startYear is not None or site.endYear is not None


def adopt_dating(
    site: WorldSite, start: int | None, end: int | None, dating_source: str, attribution: str, licence: str,
) -> WorldSite:
    """Copy a span from another dataset and credit that dataset on the record."""
    return replace(
        site,
        startYear=start,
        endYear=end,
        datingSource=dating_source,
        attribution=f"{site.attribution}; dating: {attribution}",
        licence=f"{site.licence}; dating: {licence}",
    )


def read_radiocarbon_sites(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def attach_radiocarbon(sites: list[WorldSite], radiocarbon_sites: list[dict]) -> list[WorldSite]:
    """Date undated sites from a radiocarbon site of the same folded name within 5 km."""
    spans_by_name: dict[str, list[dict]] = {}
    for span in radiocarbon_sites:
        folded = _fold(span.get("name") or "")
        usable = span.get("lon") is not None and span.get("lat") is not None
        if folded and usable and (span.get("startYear") is not None or span.get("endYear") is not None):
            spans_by_name.setdefault(folded, []).append(span)
    return [
        site if is_dated(site) else _with_radiocarbon(site, spans_by_name.get(_fold(site.name), []))
        for site in sites
    ]


def _with_radiocarbon(site: WorldSite, same_name_spans: list[dict]) -> WorldSite:
    nearest = None
    nearest_m = RADIOCARBON_MATCH_M
    for span in same_name_spans:
        distance = _haversine_m(site.lon, site.lat, span["lon"], span["lat"])
        if distance <= nearest_m and (nearest is None or distance < nearest_m):
            nearest, nearest_m = span, distance
    if nearest is None:
        return site
    attribution, licence = RADIOCARBON_CREDITS.get(nearest.get("source"), ("radiocarbon compilation", "see source"))
    return adopt_dating(site, nearest.get("startYear"), nearest.get("endYear"), "c14", attribution, licence)


def apply_featured(
    sites: list[WorldSite], featured_monuments: list[dict], featured_coordinates: dict[str, list[float]],
) -> tuple[list[WorldSite], list[str]]:
    """Put curated dates on featured sites and add the ones the Wikidata source lacks.

    Returns the sites and the featured QIDs that could not be placed (no record
    and no featured coordinate).
    """
    monuments = {monument["qid"]: monument for monument in featured_monuments}
    dated = [_with_featured_dates(site, monuments[site.id]) if site.id in monuments else site for site in sites]
    present = {site.id for site in sites}
    unplaced = []
    for qid, monument in monuments.items():
        if qid in present:
            continue
        if qid not in featured_coordinates:
            unplaced.append(qid)
            continue
        dated.append(_featured_site(monument, featured_coordinates[qid]))
    return dated, unplaced


def _with_featured_dates(site: WorldSite, monument: dict) -> WorldSite:
    start, end = monument.get("startYear"), monument.get("endYear")
    if start is None and end is None:
        return site
    return replace(site, startYear=start, endYear=end, datingSource="featured")


def _featured_site(monument: dict, lon_lat: list[float]) -> WorldSite:
    qid = monument["qid"]
    reference = monument.get("source") or ""
    dated = monument.get("startYear") is not None or monument.get("endYear") is not None
    return WorldSite(
        id=qid,
        name=monument["name"],
        lon=float(lon_lat[0]),
        lat=float(lon_lat[1]),
        source="wikidata",
        licence="CC0",
        attribution="Wikidata",
        sourceUrl=f"https://www.wikidata.org/wiki/{qid}",
        siteType=FEATURED_CATEGORY_SITE_TYPES.get(monument.get("category"), "other"),
        ids={"wikidata": qid},
        startYear=monument.get("startYear"),
        endYear=monument.get("endYear"),
        datingSource="featured" if dated else "none",
        wikipedia=reference if "wikipedia.org/" in reference else None,
    )
