"""Fetch the published coordinates (Wikidata P625, CC0) of the featured monuments.

Raw API responses are cached under data/world/raw/featured/ (gitignored), so a
rerun does not refetch. The output stays under data/ too.

    python scripts/fetch_featured_coordinates.py
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from ai_archaeology.world.featured import coordinates_from_entities, load_featured

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_DIRECTORY = REPO_ROOT / "data" / "world" / "raw" / "featured"
OUTPUT_PATH = REPO_ROOT / "data" / "world" / "featured_coordinates.json"
API_URL = "https://www.wikidata.org/w/api.php"
USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"
BATCH_SIZE = 50


def entities_for(qids: list[str], batch_number: int) -> dict:
    """One wbgetentities batch, read from the cache when it is already there."""
    cached = RAW_DIRECTORY / f"entities_{batch_number:02d}.json"
    if not cached.exists():
        query = urllib.parse.urlencode({"action": "wbgetentities", "ids": "|".join(qids), "props": "claims", "format": "json"})
        request = urllib.request.Request(f"{API_URL}?{query}", headers={"User-Agent": USER_AGENT})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(request, timeout=120) as response:
                    payload = response.read()
                break
            except (urllib.error.URLError, TimeoutError) as error:
                print(f"  batch {batch_number} failed: {error}")
                time.sleep(10 * (attempt + 1))
        else:
            raise RuntimeError(f"could not fetch batch {batch_number}")
        if "entities" not in json.loads(payload):
            raise RuntimeError(f"batch {batch_number}: {payload[:300]!r}")
        RAW_DIRECTORY.mkdir(parents=True, exist_ok=True)
        partial = cached.with_suffix(".part")
        partial.write_bytes(payload)
        partial.replace(cached)  # a crash mid-write must not leave a half file in the cache
        time.sleep(1)
    return json.loads(cached.read_text(encoding="utf-8"))["entities"]


def main() -> int:
    qids = [monument["qid"] for monument in load_featured()]
    coordinates: dict[str, tuple[float, float]] = {}
    for start in range(0, len(qids), BATCH_SIZE):
        coordinates.update(coordinates_from_entities(entities_for(qids[start:start + BATCH_SIZE], start // BATCH_SIZE)))
    OUTPUT_PATH.write_text(json.dumps({qid: list(coordinates[qid]) for qid in qids if qid in coordinates}, indent=1) + "\n", encoding="utf-8")
    unresolved = [qid for qid in qids if qid not in coordinates]
    print(f"resolved {len(qids) - len(unresolved)} of {len(qids)} to {OUTPUT_PATH}")
    if unresolved:
        print("no P625:", ", ".join(unresolved))
    return 1 if unresolved else 0


if __name__ == "__main__":
    raise SystemExit(main())
