"""Place-resource records for the atlas panels.

Built from the Pleiades dump and Wikidata, both free and account-free.
The browser never calls those services. OpenStreetMap and the close-up route
are derived when a panel opens, so this file does not store coordinates.
"""

from __future__ import annotations

import html
import re
from urllib.parse import unquote, urlsplit, urlunsplit

# Official sites confirmed from the catalogue and answering on HTTPS.
OFFICIAL_SITE_HOSTS = {
    "www.catalhoyuk.com",
    "catalhoyuk.com",
    "pataraexcavations.org",
    "www.pataraexcavations.org",
    "sardisexpedition.org",
    "www.sardisexpedition.org",
    "muze.gov.tr",
    "www.muze.gov.tr",
}
PRECISE_NUMBER = re.compile(r"-?\d{1,3}\.\d{4,}")
DECIMAL_PAIR = re.compile(r"-?\d{1,3}\.\d{4,}\s*[, ]\s*-?\d{1,3}\.\d{4,}")
SLASH_PAIR = re.compile(r"-?\d{1,3}\.\d{4,}\s*/\s*-?\d{1,3}\.\d{4,}")
DMS = re.compile(
    r"\d{1,3}°\s*\d{1,2}['′]\s*(?:\d{1,2}(?:\.\d+)?)?[\"″]?\s*[NSEW]",
    re.IGNORECASE,
)
GEOHACK_DMS = re.compile(r"\d{1,3}_\d{1,2}_\d{1,2}(?:\.\d+)?_[NSEW]", re.IGNORECASE)
GEOHACK_DECIMAL = re.compile(r"-?\d{1,3}\.\d{4,}_[NSEW]", re.IGNORECASE)
TAG = re.compile(r"<[^>]+>")
STRAY_BRACKET = re.compile(r"<[^>]*")
NAME_LIMIT = 8
REFERENCE_LIMIT = 6


def resource_bucket(place_id: str) -> str:
    """Shard key shared with the atlas client. Not the whole catalogue."""
    if place_id.startswith("Q") and len(place_id) >= 3 and place_id[1].isdigit():
        return place_id[:3]
    if place_id[:1].isdigit():
        return place_id[:3] if len(place_id) >= 3 else place_id
    return place_id[:2] or place_id


def contains_precise_coordinate(value: str) -> bool:
    """True when text still carries a precise point: decimal pair, slash pair, or DMS."""
    text = unquote(value)
    return any(pattern.search(text) for pattern in (DECIMAL_PAIR, SLASH_PAIR, DMS, GEOHACK_DMS, GEOHACK_DECIMAL))


def clean_text(value: str) -> str:
    text = html.unescape(value)
    text = TAG.sub("", text)
    text = STRAY_BRACKET.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    for pattern in (DECIMAL_PAIR, SLASH_PAIR, DMS, GEOHACK_DMS, GEOHACK_DECIMAL, PRECISE_NUMBER):
        text = pattern.sub("…", text)
    return text


def strip_userinfo(url: str) -> str | None:
    """Drop user:pass@ and any URL whose path is a precise coordinate."""
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    if not host:
        return None
    scheme = parts.scheme.lower()
    if scheme == "http" and host in OFFICIAL_SITE_HOSTS:
        scheme = "https"
    if scheme != "https":
        return None
    netloc = host
    if parts.port:
        netloc = f"{host}:{parts.port}"
    cleaned = urlunsplit((scheme, netloc, parts.path, parts.query, parts.fragment))
    if contains_precise_coordinate(cleaned):
        return None
    return cleaned


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
    raw_url = reference.get("accessURI") or reference.get("bibliographicURI") or ""
    url = strip_userinfo(raw_url) if isinstance(raw_url, str) and raw_url else None
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
        record["names"] = sorted(names[:NAME_LIMIT], key=str.casefold)
    if references:
        record["references"] = sorted(references, key=lambda item: (item["citation"].casefold(), item.get("url") or ""))
    return record


def unesco_url(identifier: str) -> str:
    number = identifier.split("-", 1)[0].strip()
    return f"https://whc.unesco.org/en/list/{number}"


def commons_url(category: str) -> str:
    slug = category.strip().replace(" ", "_")
    return f"https://commons.wikimedia.org/wiki/Category:{slug}"


def stable_record(record: dict) -> dict:
    """Fixed key and list order so a rebuild is byte-identical."""
    ordered: dict = {}
    for key in ("commons", "directors", "heritage", "id", "names", "pleiadesUrl", "references", "website", "wikipedia"):
        if key not in record:
            continue
        value = record[key]
        if key == "names" and isinstance(value, list):
            value = sorted(value, key=str.casefold)
        elif key == "references" and isinstance(value, list):
            value = sorted(value, key=lambda item: ((item.get("citation") or "").casefold(), item.get("url") or ""))
        elif key == "wikipedia" and isinstance(value, list):
            value = sorted(value, key=lambda item: item.get("lang") or "")
        elif key == "heritage" and isinstance(value, list):
            value = sorted(value, key=lambda item: (item.get("label") or "", item.get("url") or ""))
        elif key == "directors" and isinstance(value, list):
            value = sorted(value, key=lambda item: item.get("name") or "")
        ordered[key] = value
    return ordered
