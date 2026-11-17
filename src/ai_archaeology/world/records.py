"""The record every world-catalogue source ingester writes, one JSON object per line."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable, Iterator

SITE_TYPES = (
    "settlement", "tell", "megalith", "tumulus", "enclosure", "monumental", "geoglyph",
    "rock-art", "cave", "necropolis", "ritual", "city", "other",
)
SOURCES = ("wikidata", "pleiades", "osm")
SITE_ID = re.compile(r"^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$")


@dataclass
class WorldSite:
    id: str
    name: str
    lon: float
    lat: float
    source: str
    licence: str
    attribution: str
    sourceUrl: str
    siteType: str = "other"
    types: list[str] = field(default_factory=list)
    ids: dict[str, str | None] = field(default_factory=dict)
    startYear: int | None = None
    endYear: int | None = None
    datingSource: str = "none"
    importance: int = 0
    wikipedia: str | None = None
    image: str | None = None
    heritage: list[str] = field(default_factory=list)
    locationPrecision: str = "exact"

    def __post_init__(self) -> None:
        if not SITE_ID.match(self.id):
            raise ValueError(f"bad site id: {self.id!r}")
        if self.siteType not in SITE_TYPES or self.source not in SOURCES:
            raise ValueError(f"{self.id}: unknown siteType {self.siteType!r} or source {self.source!r}")
        if not (-180 <= self.lon <= 180 and -90 <= self.lat <= 90):
            raise ValueError(f"{self.id}: coordinates out of range")


def write_jsonl(path: Path, sites: Iterable[WorldSite]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for site in sites:
            handle.write(json.dumps(asdict(site), ensure_ascii=False) + "\n")
            count += 1
    return count


def read_jsonl(path: Path) -> Iterator[WorldSite]:
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield WorldSite(**json.loads(line))
