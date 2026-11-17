"""The curated featured tier: remarkable early monuments keyed by Wikidata QID.

The committed list carries no coordinates. They are fetched from Wikidata (P625,
CC0) and joined here when the web file is packed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

FEATURED_PATH = Path(__file__).with_name("featured_monuments.json")
FIELDS = (
    "qid", "name", "country", "category", "period", "startYear", "endYear",
    "datingConfidence", "status", "why", "source",
)
CATEGORIES = frozenset({
    "megalith", "city", "settlement", "burial", "rock-art", "other", "pyramid-or-platform",
    "monumental-enclosure", "earthwork", "rock-cut", "tell", "geoglyph",
})
STATUSES = frozenset({"accepted", "contested", "natural-or-pseudo"})
DATING_CONFIDENCES = frozenset({"high", "medium", "low"})
QID = re.compile(r"^Q\d+$")
MAX_WHY_WORDS = 40
EARTH_GLOBE = "http://www.wikidata.org/entity/Q2"


def load_featured(path: Path = FEATURED_PATH) -> list[dict]:
    monuments = json.loads(path.read_text(encoding="utf-8"))
    problems = featured_problems(monuments)
    if problems:
        raise ValueError("featured list is invalid: " + "; ".join(problems[:10]))
    return monuments


def featured_problems(monuments: list[dict]) -> list[str]:
    """Every rule the curated list breaks, as readable lines. Empty means valid."""
    problems = []
    seen: set[str] = set()
    for monument in monuments:
        qid = str(monument.get("qid"))
        if set(monument) != set(FIELDS):
            problems.append(f"{qid}: fields differ from the curated schema")
        if not QID.match(qid) or qid in seen:
            problems.append(f"{qid}: missing, malformed or repeated QID")
        seen.add(qid)
        if monument.get("category") not in CATEGORIES:
            problems.append(f"{qid}: unknown category {monument.get('category')!r}")
        if monument.get("status") not in STATUSES:
            problems.append(f"{qid}: unknown status {monument.get('status')!r}")
        if monument.get("datingConfidence") not in DATING_CONFIDENCES:
            problems.append(f"{qid}: unknown datingConfidence")
        start, end = monument.get("startYear"), monument.get("endYear")
        if start is not None and end is not None and start > end:
            problems.append(f"{qid}: startYear is after endYear")
        if len(str(monument.get("why") or "").split()) > MAX_WHY_WORDS:
            problems.append(f"{qid}: why is over {MAX_WHY_WORDS} words")
    return problems


def coordinates_from_entities(entities: dict) -> dict[str, tuple[float, float]]:
    """{qid: (lon, lat)} from a wbgetentities ``entities`` object, Earth P625 only."""
    coordinates = {}
    for entity_id, entity in entities.items():
        # A merged item comes back under its new id; keep the QID that was asked for.
        qid = (entity.get("redirects") or {}).get("from", entity_id)
        statements = [
            statement for statement in (entity.get("claims") or {}).get("P625", [])
            if statement.get("rank") != "deprecated"
            and statement["mainsnak"].get("snaktype") == "value"
            and statement["mainsnak"]["datavalue"]["value"].get("globe") == EARTH_GLOBE
        ]
        statements.sort(key=lambda statement: statement.get("rank") != "preferred")
        if statements:
            value = statements[0]["mainsnak"]["datavalue"]["value"]
            coordinates[qid] = (float(value["longitude"]), float(value["latitude"]))
    return coordinates


def featured_sites(coordinates: dict[str, tuple[float, float]], monuments: list[dict] | None = None) -> list[dict]:
    """The Contract-2 ``featured.json`` array. Every monument must have a point."""
    monuments = load_featured() if monuments is None else monuments
    missing = [monument["qid"] for monument in monuments if monument["qid"] not in coordinates]
    if missing:
        raise ValueError(f"featured monuments without coordinates: {', '.join(missing)}")
    sites = []
    for monument in monuments:
        lon, lat = coordinates[monument["qid"]]
        rest = {key: value for key, value in monument.items() if key != "qid"}
        sites.append({"id": monument["qid"], "name": rest.pop("name"), "lon": round(lon, 5), "lat": round(lat, 5), **rest})
    return sites
