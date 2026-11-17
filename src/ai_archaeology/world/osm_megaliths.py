"""OpenStreetMap megaliths: the Overpass query and the element -> WorldSite mapping.

ODbL share-alike: this layer stays on its own and is never merged with other sources.
"""

from __future__ import annotations

import re
from typing import Iterable, Iterator
from urllib.parse import quote

from ai_archaeology.world.records import WorldSite

OSM_LICENCE = "ODbL 1.0"
OSM_ATTRIBUTION = "© OpenStreetMap contributors"
OSM_ELEMENT_KINDS = {"node": "n", "way": "w"}

_WIKIDATA_ID = re.compile(r"^Q\d+$")
_WIKIPEDIA_TAG = re.compile(r"^([a-z][a-z-]{1,11}):(.+)$")
_CLEAN_YEAR = re.compile(r"^-?\d{1,4}$")


def overpass_megalith_query(west: float = -180, east: float = 180, timeout_seconds: int = 600) -> str:
    """Nodes and ways that are megaliths, limited to a longitude band."""
    bbox = f"(-90,{west},90,{east})"
    megalith_site = '["historic"="archaeological_site"]["archaeological_site"="megalith"]'
    statements = "".join(
        f"  {kind}{tag_filter}{bbox};\n"
        for kind in OSM_ELEMENT_KINDS
        for tag_filter in (megalith_site, '["megalith_type"]')
    )
    return f"[out:json][timeout:{timeout_seconds}];\n(\n{statements});\nout center tags;\n"


def megalith_types(tags: dict[str, str]) -> list[str]:
    values = tags.get("megalith_type", "").split(";")
    return [value.strip().replace("_", " ") for value in values if value.strip()]


def wikipedia_url(tag_value: str | None) -> str | None:
    match = _WIKIPEDIA_TAG.match(tag_value or "")
    if not match:
        return None
    language, title = match.groups()
    return f"https://{language}.wikipedia.org/wiki/{quote(title.strip().replace(' ', '_'))}"


def element_to_site(element: dict) -> WorldSite | None:
    """One Overpass element as a WorldSite, or None when it has no usable position."""
    kind = element.get("type")
    position = element if kind == "node" else element.get("center", {})
    if kind not in OSM_ELEMENT_KINDS or "lon" not in position or "lat" not in position:
        return None
    tags = element.get("tags", {})
    types = megalith_types(tags)
    fallback_name = types[0].capitalize() if types else "Megalith"
    wikidata = tags.get("wikidata", "")
    start_date = tags.get("start_date", "").strip()
    start_year = int(start_date) if _CLEAN_YEAR.match(start_date) else None
    return WorldSite(
        id=f"osm-{OSM_ELEMENT_KINDS[kind]}{element['id']}",
        name=(tags.get("name:en") or tags.get("name") or fallback_name).strip(),
        lon=position["lon"],
        lat=position["lat"],
        source="osm",
        licence=OSM_LICENCE,
        attribution=OSM_ATTRIBUTION,
        sourceUrl=f"https://www.openstreetmap.org/{kind}/{element['id']}",
        siteType="megalith",
        types=types,
        ids={
            "wikidata": wikidata if _WIKIDATA_ID.match(wikidata) else None,
            "pleiades": None,
            "osm": f"{kind}/{element['id']}",
            "whs": None,
            "xronos": None,
        },
        startYear=start_year,
        # "label" is the closest contract value for a year read off the object's own tag.
        datingSource="label" if start_year is not None else "none",
        wikipedia=wikipedia_url(tags.get("wikipedia")),
    )


def elements_to_sites(elements: Iterable[dict]) -> Iterator[WorldSite]:
    """Map elements, dropping repeats (longitude bands share their edges)."""
    seen_ids: set[str] = set()
    for element in elements:
        site = element_to_site(element)
        if site and site.id not in seen_ids:
            seen_ids.add(site.id)
            yield site
