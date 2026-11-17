"""Presence rasters per site class and period from published site records. One presence per cell."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np

from ai_archaeology.suitability.grid import SHAPE, cell_of
from ai_archaeology.world.records import WorldSite, read_jsonl

SITE_CLASSES = {
    "monument": {"megalith", "monumental", "geoglyph", "enclosure", "ritual"},
    "settlement": {"settlement", "tell", "city"},
    "funerary": {"tumulus", "necropolis"},
}
CLASS_NAMES = (*SITE_CLASSES, "any")
PERIODS = {
    "early-holocene": (-10000, -5000),
    "mid-holocene": (-5000, -2000),
    "late-holocene": (-2000, 500),
}
PERIOD_NAMES = (*PERIODS, "all")
# OSM is ODbL share-alike and is kept apart from the other sources everywhere else in the atlas.
LABEL_SOURCES = ("wikidata", "pleiades")
MIN_PRESENCE_CELLS = 200


def read_label_sites(sources_directory: Path) -> list[WorldSite]:
    sites = []
    for path in sorted(sources_directory.glob("*.jsonl")):
        sites.extend(site for site in read_jsonl(path) if site.source in LABEL_SOURCES)
    return sites


def in_class(site: WorldSite, site_class: str) -> bool:
    return site_class == "any" or site.siteType in SITE_CLASSES[site_class]


def in_period(site: WorldSite, period: str) -> bool:
    """True when the site's dated span overlaps the period. Undated sites only count for ``all``."""
    if period == "all":
        return True
    years = [year for year in (site.startYear, site.endYear) if year is not None]
    if not years:
        return False
    period_start, period_end = PERIODS[period]
    return min(years) <= period_end and max(years) >= period_start


def site_count_raster(sites: Iterable[WorldSite]) -> np.ndarray:
    sites = list(sites)
    counts = np.zeros(SHAPE, dtype=np.int32)
    if sites:
        np.add.at(counts, cell_of([site.lon for site in sites], [site.lat for site in sites]), 1)
    return counts


def presence_raster(sites: Iterable[WorldSite], site_class: str, period: str) -> np.ndarray:
    return site_count_raster(
        site for site in sites if in_class(site, site_class) and in_period(site, period)
    ) > 0


def presence_layers(sites: list[WorldSite], min_cells: int = MIN_PRESENCE_CELLS) -> dict[tuple[str, str], np.ndarray]:
    """Every class x period raster with enough presence cells to model."""
    layers = {}
    for period in PERIOD_NAMES:
        for site_class in CLASS_NAMES:
            raster = presence_raster(sites, site_class, period)
            if raster.sum() >= min_cells:
                layers[(site_class, period)] = raster
    return layers
