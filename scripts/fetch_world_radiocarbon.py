"""Download p3k14c and XRONOS radiocarbon dates and write one dated record per site.

Dating enrichment only: the output gives dates to pins that already exist and its
coordinates never create or move a pin. Raw CSVs are cached under
data/world/raw/radiocarbon/ (gitignored), so a rerun does not refetch.

    python scripts/fetch_world_radiocarbon.py
"""

from __future__ import annotations

import csv
import json
import shutil
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Iterator

from ai_archaeology.world.radiocarbon_sites import (
    aggregate_site_dates,
    p3k14c_date_rows,
    xronos_date_rows,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_DIRECTORY = REPO_ROOT / "data" / "world" / "raw" / "radiocarbon"
OUTPUT_PATH = REPO_ROOT / "data" / "world" / "dating" / "xronos_sites.jsonl"
USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"
P3K14C_URL = "https://raw.githubusercontent.com/people3k/p3k14c/master/inst/p3k14c_scrubbed_fuzzed.csv"
# XRONOS publishes each table as one CSV; four requests cover the whole database.
XRONOS_TABLES = ("sites", "contexts", "samples", "c14s")
XRONOS_PAUSE_SECONDS = 15
SPAN_BINS = ((0, "single year"), (500, "<=500"), (1000, "<=1000"), (2000, "<=2000"), (5000, "<=5000"))


def download_once(url: str, file_name: str, pause_seconds: int = 0) -> Path:
    """Fetch a file unless it is already cached; back off when the host says 429."""
    destination = RAW_DIRECTORY / file_name
    if destination.exists():
        return destination
    RAW_DIRECTORY.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(".part")
    for attempt in range(4):
        time.sleep(pause_seconds * (attempt + 1))
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=600) as response, partial.open("wb") as handle:
                shutil.copyfileobj(response, handle)
            partial.replace(destination)
            print(f"downloaded {url} ({destination.stat().st_size:,} bytes)")
            return destination
        except (urllib.error.URLError, TimeoutError) as error:
            print(f"  {url} failed: {error}")
            time.sleep(30 * (attempt + 1))
    raise RuntimeError(f"could not download {url}")


def csv_rows(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def p3k14c_sites() -> list[dict]:
    path = download_once(P3K14C_URL, "p3k14c_scrubbed_fuzzed.csv")
    return aggregate_site_dates(p3k14c_date_rows(csv_rows(path)), "p3k14c")


def xronos_sites() -> list[dict]:
    tables = [
        csv_rows(download_once(f"https://xronos.ch/{table}.csv", f"xronos_{table}.csv", XRONOS_PAUSE_SECONDS))
        for table in XRONOS_TABLES
    ]
    return aggregate_site_dates(xronos_date_rows(*tables), "xronos")


def span_label(record: dict) -> str:
    span = record["endYear"] - record["startYear"]
    return next((label for limit, label in SPAN_BINS if span <= limit), ">5000")


def print_report(records: list[dict]) -> None:
    print("sites by source:", dict(Counter(record["source"] for record in records)))
    print("date span (years):", dict(Counter(span_label(record) for record in records)))
    millennia = Counter(record["startYear"] // 1000 * 1000 for record in records)
    print("oldest date by millennium:", sorted(millennia.items()))
    print("dates per site:", dict(Counter(min(record["nDates"], 20) // 5 * 5 for record in records)))


def main() -> int:
    records = p3k14c_sites() + xronos_sites()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(f"wrote {len(records)} sites to {OUTPUT_PATH}")
    print_report(records)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
