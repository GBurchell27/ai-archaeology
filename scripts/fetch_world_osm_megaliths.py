"""Fetch OpenStreetMap megaliths from Overpass and write data/world/sources/osm.jsonl.

Published, already-mapped objects only. ODbL: kept as its own layer. Raw responses are
cached under data/world/raw/osm/ (gitignored), so a rerun does not refetch.

    python scripts/fetch_world_osm_megaliths.py
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from ai_archaeology.world.osm_megaliths import elements_to_sites, overpass_megalith_query
from ai_archaeology.world.records import write_jsonl

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_DIRECTORY = REPO_ROOT / "data" / "world" / "raw" / "osm"
OUTPUT_PATH = REPO_ROOT / "data" / "world" / "sources" / "osm.jsonl"
USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"
OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
WHOLE_WORLD = [(-180, 180)]
LONGITUDE_BANDS = [(-180, -30), (-30, -5), (-5, 5), (5, 15), (15, 60), (60, 180)]
# Rough boxes for the run report only: (name, west, south, east, north), first match wins.
CONTINENT_BOXES = (
    ("Europe", -25, 35, 45, 72),
    ("Africa", -20, -36, 52, 37),
    ("Asia", 45, -11, 180, 78),
    ("North America", -170, 7, -50, 84),
    ("South America", -93, -57, -30, 13),
    ("Oceania", 110, -50, 180, -11),
)


def post_overpass(query: str) -> dict:
    """Try each mirror in turn, twice, one request at a time."""
    body = urllib.parse.urlencode({"data": query}).encode()
    last_error: Exception | None = None
    for attempt in range(2):
        for endpoint in OVERPASS_ENDPOINTS:
            request = urllib.request.Request(endpoint, data=body, headers={"User-Agent": USER_AGENT})
            try:
                with urllib.request.urlopen(request, timeout=900) as response:
                    payload = json.load(response)
                # Overpass reports a server-side timeout inside a 200 response.
                if "remark" in payload and "error" in payload["remark"].lower():
                    raise RuntimeError(payload["remark"])
                return payload
            except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError) as error:
                last_error = error
                print(f"  {endpoint} failed: {error}")
                time.sleep(20 * (attempt + 1))
    raise RuntimeError(f"all Overpass mirrors failed: {last_error}")


def fetch_band(west: float, east: float) -> list[dict]:
    cache_path = RAW_DIRECTORY / f"megaliths_{west}_{east}.json"
    if not cache_path.exists():
        print(f"querying Overpass for longitudes {west}..{east}")
        payload = post_overpass(overpass_megalith_query(west, east))
        RAW_DIRECTORY.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(payload), encoding="utf-8")
    return json.loads(cache_path.read_text(encoding="utf-8"))["elements"]


def fetch_all_elements() -> list[dict]:
    try:
        return fetch_band(*WHOLE_WORLD[0])
    except RuntimeError as error:
        print(f"global query failed ({error}); splitting into longitude bands")
    return [element for west, east in LONGITUDE_BANDS for element in fetch_band(west, east)]


def continent_of(lon: float, lat: float) -> str:
    for name, west, south, east, north in CONTINENT_BOXES:
        if west <= lon <= east and south <= lat <= north:
            return name
    return "Other"


def main() -> int:
    sites = list(elements_to_sites(fetch_all_elements()))
    written = write_jsonl(OUTPUT_PATH, sites)
    print(f"wrote {written} sites to {OUTPUT_PATH}")
    by_type = Counter(site.types[0] if site.types else "(none)" for site in sites)
    by_continent = Counter(continent_of(site.lon, site.lat) for site in sites)
    print("by megalith_type:", by_type.most_common(15))
    print("by continent box:", by_continent.most_common())
    print("with wikidata id:", sum(1 for site in sites if site.ids["wikidata"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
