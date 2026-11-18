"""Fetch the photographs in Wikimedia Commons categories, with a credit and licence for each.

Published photographs of published sites only. Every Commons file carries a free licence, mostly
CC BY-SA: the photographs, and anything built from them, stay under data/ and public/splats/
(both gitignored). Categories are not followed into subcategories, so name each one you want.
A rerun skips files that are already on disk.

    python scripts/splat/fetch_commons_photos.py gobekli-tepe "Göbekli Tepe" \
        "Göbekli Tepe excavations in 2012"

Files outside a category come from --search (Commons search syntax), and --suffix keeps a second
batch apart: `--suffix extra` writes images_extra/ and credits_extra.json.

    python scripts/splat/fetch_commons_photos.py karahan-tepe --suffix extra --search "intitle:Karahantepe1"
"""

from __future__ import annotations

import argparse
import datetime
import html
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SPLAT_DIRECTORY = REPO_ROOT / "data" / "splat"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia throttles clients that give no contact. Set COMMONS_USER_AGENT to one that names a way to reach you.
USER_AGENT = os.environ.get("COMMONS_USER_AGENT", "ai-archaeology-atlas/0.1 (hobby research)")
# Wide enough for structure-from-motion, a fraction of the original's size.
PHOTO_WIDTH_PX = 2400
PAUSE_SECONDS = 1.5
ATTEMPTS = 5


def fetch(url: str) -> bytes:
    """One request at a time, with a growing pause when Commons says to slow down."""
    for attempt in range(ATTEMPTS):
        time.sleep(PAUSE_SECONDS)
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503):
                raise
            wait = int(error.headers.get("Retry-After") or 30 * (attempt + 1))
            print(f"  HTTP {error.code}, waiting {wait} s")
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError) as error:
            print(f"  {error}, retrying")
            time.sleep(30 * (attempt + 1))
    raise RuntimeError(f"gave up on {url}")


def category_photos(category: str) -> list[dict]:
    """Every JPEG directly in one category, as credit rows."""
    return listed_photos({"generator": "categorymembers", "gcmtitle": f"Category:{category}", "gcmtype": "file", "gcmlimit": "50"}, category)


def search_photos(query: str) -> list[dict]:
    """Every JPEG a Commons file search finds, as credit rows."""
    return listed_photos({"generator": "search", "gsrsearch": query, "gsrnamespace": "6", "gsrlimit": "50"}, f"search: {query}")


def listed_photos(generator: dict[str, str], label: str) -> list[dict]:
    rows: list[dict] = []
    continuation: dict[str, str] = {}
    while True:
        parameters = {
            "action": "query", "format": "json", "maxlag": "5",
            **generator,
            "prop": "imageinfo", "iiprop": "url|mime|extmetadata", "iiurlwidth": str(PHOTO_WIDTH_PX),
            **continuation,
        }
        reply = json.loads(fetch(COMMONS_API + "?" + urllib.parse.urlencode(parameters)))
        if "error" in reply:
            raise RuntimeError(reply["error"].get("info", "Commons API error"))
        for page in reply.get("query", {}).get("pages", {}).values():
            row = credit_row(page, label)
            if row:
                rows.append(row)
        if "continue" not in reply:
            print(f"{label}: {len(rows)} photographs")
            return rows
        continuation = reply["continue"]


def plain_text(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value)).strip()


def credit_row(page: dict, category: str) -> dict | None:
    image = (page.get("imageinfo") or [{}])[0]
    if image.get("mime") != "image/jpeg":
        return None
    metadata = {key: entry.get("value", "") for key, entry in image.get("extmetadata", {}).items()}
    return {
        "title": page["title"],
        "category": category,
        "author": plain_text(metadata.get("Artist", "")) or "unknown",
        "licence": metadata.get("LicenseShortName", "") or "see page",
        "licenceUrl": metadata.get("LicenseUrl", ""),
        "page": image.get("descriptionurl", ""),
        "download": image.get("thumburl") or image["url"],
    }


def photo_path(images_directory: Path, title: str) -> Path:
    stem = re.sub(r"[^A-Za-z0-9]+", "_", title.removeprefix("File:").rsplit(".", 1)[0]).strip("_")
    return images_directory / f"{stem[:120]}.jpg"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("site", help="site id, e.g. gobekli-tepe")
    parser.add_argument("categories", nargs="*", help='Commons category names without the "Category:" prefix')
    parser.add_argument("--search", action="append", default=[], help="a Commons file search; repeat for more")
    parser.add_argument("--suffix", default="", help="e.g. extra, to write images_extra/ and credits_extra.json")
    arguments = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", arguments.site):
        parser.error("site must be a lower-case id such as gobekli-tepe")
    if not re.fullmatch(r"[a-z0-9]*", arguments.suffix) or not (arguments.categories or arguments.search):
        parser.error("give a category or --search, and a lower-case --suffix")

    tail = f"_{arguments.suffix}" if arguments.suffix else ""
    site_directory = SPLAT_DIRECTORY / arguments.site
    images_directory = site_directory / f"images{tail}"
    images_directory.mkdir(parents=True, exist_ok=True)

    rows_by_title: dict[str, dict] = {}
    for category in arguments.categories:
        rows_by_title.update((row["title"], row) for row in category_photos(category))
    for query in arguments.search:
        rows_by_title.update((row["title"], row) for row in search_photos(query))

    for index, row in enumerate(rows_by_title.values(), start=1):
        target = photo_path(images_directory, row["title"])
        row["file"] = target.name
        if not target.exists():
            target.write_bytes(fetch(row.pop("download")))
            print(f"  {index}/{len(rows_by_title)} {target.name}")
        row.pop("download", None)

    credits = {
        "source": "Wikimedia Commons",
        "fetched": datetime.date.today().isoformat(),
        "categories": arguments.categories,
        "searches": arguments.search,
        "photographs": list(rows_by_title.values()),
    }
    (site_directory / f"credits{tail}.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(rows_by_title)} photographs in {images_directory}")


if __name__ == "__main__":
    main()
