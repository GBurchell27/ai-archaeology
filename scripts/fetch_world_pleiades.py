"""Download the Pleiades gazetteer and write its world-catalogue source records.

Pleiades: A Gazetteer of Past Places, CC BY 3.0, no account. The dump is cached
under data/world/raw/ (gitignored), so a rerun does not refetch.

    python scripts/fetch_world_pleiades.py
"""

from __future__ import annotations

import shutil
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

from ai_archaeology.sites.pleiades import SOURCE_URL
from ai_archaeology.world.pleiades_world import world_sites_from_dump
from ai_archaeology.world.records import write_jsonl

REPO_ROOT = Path(__file__).resolve().parents[1]
DUMP_PATH = REPO_ROOT / "data" / "world" / "raw" / "pleiades-places-latest.json.gz"
OUTPUT_PATH = REPO_ROOT / "data" / "world" / "sources" / "pleiades.jsonl"
USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"


def download_dump() -> Path:
    if DUMP_PATH.exists():
        return DUMP_PATH
    DUMP_PATH.parent.mkdir(parents=True, exist_ok=True)
    partial = DUMP_PATH.with_suffix(".part")
    for attempt in range(4):
        request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=600) as response, partial.open("wb") as handle:
                shutil.copyfileobj(response, handle)
            partial.replace(DUMP_PATH)
            return DUMP_PATH
        except (urllib.error.URLError, TimeoutError) as error:
            print(f"  download failed: {error}")
            time.sleep(30 * (attempt + 1))
    raise RuntimeError(f"could not download {SOURCE_URL}")


def main() -> int:
    by_type: Counter[str] = Counter()
    by_precision: Counter[str] = Counter()
    dated = 0

    def counted(sites):
        nonlocal dated
        for site in sites:
            by_type[site.siteType] += 1
            by_precision[site.locationPrecision] += 1
            dated += site.startYear is not None
            yield site

    total = write_jsonl(OUTPUT_PATH, counted(world_sites_from_dump(download_dump())))
    print(f"wrote {total} sites to {OUTPUT_PATH}")
    print("by siteType:", dict(by_type.most_common()))
    print("by locationPrecision:", dict(by_precision))
    print(f"dated: {dated} ({dated / max(total, 1):.1%})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
