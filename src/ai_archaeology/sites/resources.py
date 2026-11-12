"""Place-resource records for the atlas panels.

Built from the Pleiades dump and Wikidata, both free and account-free.
The browser never calls those services. OpenStreetMap and the close-up route
are derived when a panel opens, so this file does not store coordinates.
"""

from __future__ import annotations

import html
import re

ADMINISTRATIVE_HOSTS = {
    "muze.gov.tr",
    "www.muze.gov.tr",
}
PRECISE_NUMBER = re.compile(r"-?\d{1,3}\.\d{4,}")
TAG = re.compile(r"<[^>]+>")
NAME_LIMIT = 8
REFERENCE_LIMIT = 6


def resource_bucket(place_id: str) -> str:
    """Shard key shared with the atlas client. Not the whole catalogue."""
    if place_id.startswith("Q") and len(place_id) >= 3 and place_id[1].isdigit():
        return place_id[:3]
    if place_id[:1].isdigit():
        return place_id[:3] if len(place_id) >= 3 else place_id
    return place_id[:2] or place_id


def clean_text(value: str) -> str:
    text = TAG.sub("", html.unescape(value))
    text = re.sub(r"\s+", " ", text).strip()
    return PRECISE_NUMBER.sub("…", text)


def citation_from_reference(reference: dict) -> dict | None:
    """A short bibliography line. Only an https URL is kept, and OSM ways are skipped."""
    citation = reference.get("formattedCitation") or reference.get("shortTitle") or ""
    detail = reference.get("citationDetail") or ""
    if not isinstance(citation, str):
        citation = ""
    if not isinstance(detail, str):
        detail = ""
    citation = citation.strip()
    detail = detail.strip()
    if detail and detail not in citation:
        citation = f"{citation} {detail}".strip() if citation else detail
    citation = clean_text(citation)
    if not citation or citation.lower().startswith("osm:"):
        return None
    url = reference.get("accessURI") or reference.get("bibliographicURI") or ""
    if not isinstance(url, str) or not url.startswith("https://"):
        url = None
    return {"citation": citation[:180], "url": url}


def pleiades_record(raw: dict) -> dict:
    names: list[str] = []
    seen: set[str] = set()

    def add(value: str | None) -> None:
        if not value or not isinstance(value, str):
            return
        text = clean_text(value)
        if len(text) < 2 or text.casefold() in seen:
            return
        seen.add(text.casefold())
        names.append(text)

    title = raw.get("title")
    if isinstance(title, str):
        add(title)
        for piece in title.split("/"):
            add(piece)
    for name in raw.get("names") or []:
        if not isinstance(name, dict):
            continue
        if name.get("associationCertainty") in {"uncertain", "doubtful", "false"}:
            continue
        for part in (name.get("romanized"), name.get("attested")):
            if isinstance(part, str):
                for piece in part.split(","):
                    add(piece)
        if len(names) >= NAME_LIMIT:
            break
    references: list[dict] = []
    seen_citations: set[str] = set()
    pools = list(raw.get("references") or [])
    for name in raw.get("names") or []:
        if isinstance(name, dict):
            pools.extend(name.get("references") or [])
    for location in raw.get("locations") or []:
        if isinstance(location, dict):
            pools.extend(location.get("references") or [])
    for reference in pools:
        if not isinstance(reference, dict):
            continue
        cited = citation_from_reference(reference)
        if cited is None or cited["citation"].casefold() in seen_citations:
            continue
        seen_citations.add(cited["citation"].casefold())
        references.append(cited)
        if len(references) >= REFERENCE_LIMIT:
            break
    record: dict = {}
    if names:
        record["names"] = names[:NAME_LIMIT]
    if references:
        record["references"] = references
    return record


def unesco_url(identifier: str) -> str:
    number = identifier.split("-", 1)[0].strip()
    return f"https://whc.unesco.org/en/list/{number}"


def commons_url(category: str) -> str:
    slug = category.strip().replace(" ", "_")
    return f"https://commons.wikimedia.org/wiki/Category:{slug}"
