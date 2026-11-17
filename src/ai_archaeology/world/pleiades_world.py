"""Map the whole Pleiades gazetteer to world-catalogue source records.

Pleiades is CC BY 3.0. Only published places with a representative point and an
archaeological place kind become records; rivers, mountains, regions and
peoples are left out.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterator

from ai_archaeology.sites.pleiades import (
    _accepted_spans,
    _unnamed,
    iter_places,
    place_from_dump,
    published_periods,
)
from ai_archaeology.world.records import WorldSite

# First matching row wins, so a tell that is also a settlement stays a tell.
SITE_TYPE_RULES: tuple[tuple[str, frozenset[str]], ...] = (
    ("tell", frozenset({"tell"})),
    ("tumulus", frozenset({"tumulus", "cairn"})),
    ("megalith", frozenset({"nuraghe"})),
    ("cave", frozenset({"cave"})),
    ("monumental", frozenset({
        "pyramid", "ziggurat", "monument", "palace", "palace-complex", "amphitheatre",
        "theatre", "arch", "circus", "stadion", "odeon", "platform",
    })),
    ("necropolis", frozenset({"cemetery", "tomb", "tower-tomb", "cenotaph"})),
    ("ritual", frozenset({
        "temple", "temple-2", "sanctuary", "shrine", "altar", "church", "church-2",
        "monastery", "abbey", "abbey-church", "priory", "mosque", "synagogue", "stupa",
        "fortified-church", "cahartaq-pre-islamic",
    })),
    ("enclosure", frozenset({
        "fort", "fort-2", "fortlet", "fort-group", "hillfort", "castle", "castellum",
        "citadel", "military-base", "military-installation-or-camp-temporary",
        "earthwork", "earthworks",
    })),
    ("city", frozenset({"urban", "polis"})),
    ("settlement", frozenset({
        "settlement", "fortified-settlement", "villa", "vicus", "station", "port",
        "harbor", "estate", "farm", "townhouse", "acropolis",
    })),
)

# Not archaeological place kinds: nature, administration, peoples, modern places
# and Pleiades' own placeholders. A place with only these kinds is not a record.
SKIPPED_PLACE_TYPES = frozenset({
    "river", "island", "mountain", "cape", "water-open", "lake", "archipelago", "hill",
    "spring", "pass", "plain", "bay", "peninsula", "marsh-wetland", "mouth", "forest",
    "valley", "coast", "estuary", "lagoon", "volcano", "coastal-change", "strait",
    "water", "rapid", "water-inland", "plateau", "reef", "desert", "meadow",
    "salt-marsh", "delta", "whirlpool", "isthmus", "gulf", "gorge", "rock-landform",
    "island-group", "escarpment", "watercourse", "water-feature", "oasis", "grove",
    "field", "anchorage",
    "people", "tribus", "league", "region", "province", "province-2", "district",
    "state", "kingdom", "nome-gr", "nome-egyptian", "diocese-roman", "diocese-church",
    "regio-augusti", "satrapy", "territory", "admin-place", "meris", "pagus", "grama",
    "deme-attic", "settlement-modern", "protected-area-modern", "cultural-landscape",
    "unlocated", "unlocated-group", "unknown", "label", "unlabeled", "feature",
    "numbered feature", "labeled feature", "false toponym", "false", "fiction",
    "place", "site", "landmark",
})

EMPTY_IDS = {"wikidata": None, "pleiades": None, "osm": None, "whs": None, "xronos": None}


def site_type_for(place_types: tuple[str, ...]) -> str | None:
    """The controlled siteType, or None when no kind is archaeological."""
    kinds = set(place_types) - SKIPPED_PLACE_TYPES
    if not kinds:
        return None
    for site_type, matching in SITE_TYPE_RULES:
        if kinds & matching:
            return site_type
    return "other"


def location_precision(raw: dict) -> str:
    """"exact" only when Pleiades marks at least one location as precise."""
    marks = {(feature.get("properties") or {}).get("location_precision") for feature in raw.get("features") or []}
    return "exact" if "precise" in marks else "rough"


def world_site_from_place(raw: dict, vocabulary: dict[str, tuple[int, int]]) -> WorldSite | None:
    place = place_from_dump(raw, bounds=None)
    if place is None or _unnamed(place.title):
        return None
    site_type = site_type_for(place.types)
    if site_type is None:
        return None
    spans, _filled = _accepted_spans(place, vocabulary)
    return WorldSite(
        id=place.id,
        name=place.title,
        lon=round(place.longitude, 5),
        lat=round(place.latitude, 5),
        source="pleiades",
        licence="CC BY 3.0",
        attribution="Pleiades contributors",
        sourceUrl=f"https://pleiades.stoa.org/places/{place.id}",
        siteType=site_type,
        types=list(place.types),
        ids={**EMPTY_IDS, "pleiades": place.id},
        startYear=min(span[0] for span in spans) if spans else None,
        endYear=max(span[1] for span in spans) if spans else None,
        datingSource="pleiades" if spans else "none",
        locationPrecision=location_precision(raw),
    )


def world_sites_from_dump(dump_path: Path) -> Iterator[WorldSite]:
    vocabulary = published_periods()
    for raw in iter_places(dump_path):
        site = world_site_from_place(raw, vocabulary)
        if site is not None:
            yield site
