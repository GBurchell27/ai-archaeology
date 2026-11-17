"""Merge the world source records and write the static web catalogue.

Reads data/world/ (gitignored) and rewrites Anatolia/atlas/public/world/ only.
Published sites only: no detector output is an input here.

    python scripts/build_world_catalogue.py [--generated YYYY-MM-DD] [--allow-missing osm]
"""

from __future__ import annotations

import argparse
import json
import shutil
from collections import Counter
from datetime import date
from pathlib import Path

from ai_archaeology.world.featured import load_featured_coordinates, with_coordinate_fixes
from ai_archaeology.world.dating import apply_featured, attach_radiocarbon, is_dated, read_radiocarbon_sites
from ai_archaeology.world.merge import merge_published
from ai_archaeology.world.records import WorldSite, read_jsonl
from ai_archaeology.world.web_pack import build_catalogue_files, write_catalogue

ROOT = Path(__file__).resolve().parents[1]
WORLD_DATA = ROOT / "data" / "world"
OUT_DIR = ROOT / "Anatolia" / "atlas" / "public" / "world"
FEATURED_MONUMENTS = ROOT / "src" / "ai_archaeology" / "world" / "featured_monuments.json"
SOURCE_PATHS = {
    "wikidata": WORLD_DATA / "sources" / "wikidata.jsonl",
    "pleiades": WORLD_DATA / "sources" / "pleiades.jsonl",
    "osm": WORLD_DATA / "sources" / "osm.jsonl",
    "xronos": WORLD_DATA / "dating" / "xronos_sites.jsonl",
    "featured-coordinates": WORLD_DATA / "featured_coordinates.json",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--generated", default=date.today().isoformat())
    parser.add_argument("--allow-missing", action="append", default=[], choices=sorted(SOURCE_PATHS))
    arguments = parser.parse_args()
    missing = [name for name, path in SOURCE_PATHS.items() if not path.exists() and name not in arguments.allow_missing]
    if missing:
        parser.error(f"missing source file(s): {', '.join(missing)}. Pass --allow-missing <source> to build without.")
    featured_monuments = json.loads(FEATURED_MONUMENTS.read_text(encoding="utf-8"))
    merged_sites = merge_and_date(featured_monuments)
    osm_sites = _sites("osm")
    print(f"osm (own layer, never merged): {len(osm_sites)}")
    report_sites(merged_sites)
    files = build_catalogue_files(merged_sites, osm_sites, featured_monuments, arguments.generated)
    # Built in memory first, so a failure above leaves the previous catalogue in place.
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    report_sizes(write_catalogue(OUT_DIR, files), files["index.json"])
    return 0


def merge_and_date(featured_monuments: list[dict]) -> list[WorldSite]:
    wikidata, pleiades = with_coordinate_fixes(_sites("wikidata")), _sites("pleiades")
    print(f"read: wikidata {len(wikidata)}, pleiades {len(pleiades)}")
    coordinates_path = SOURCE_PATHS["featured-coordinates"]
    coordinates = load_featured_coordinates(coordinates_path) if coordinates_path.exists() else {}
    # Featured first, so a featured monument Wikidata did not return is still de-duplicated
    # against Pleiades. Later stages only date undated sites, so curated dates still win.
    with_featured, unplaced = apply_featured(wikidata, featured_monuments, coordinates)
    added = len(with_featured) - len(wikidata)
    print(f"featured: {len(featured_monuments)} curated, {added} added from featured coordinates, {len(unplaced)} unplaced")
    if unplaced:
        print(f"  unplaced featured QIDs: {', '.join(unplaced)}")
    outcome = merge_published(with_featured, pleiades)
    print(
        f"merged: {len(outcome.sites)} sites "
        f"({outcome.linked_by_identifier} Pleiades places linked by identifier, {outcome.linked_spatially} spatially)"
    )
    print(f"dated after merge: {_dated_share(outcome.sites)}")
    radiocarbon_path = SOURCE_PATHS["xronos"]
    radiocarbon_sites = read_radiocarbon_sites(radiocarbon_path) if radiocarbon_path.exists() else []
    with_radiocarbon = attach_radiocarbon(outcome.sites, radiocarbon_sites)
    attached = sum(site.datingSource == "c14" for site in with_radiocarbon)
    print(f"radiocarbon: {len(radiocarbon_sites)} dated sites read, {attached} attached to undated pins")
    return with_radiocarbon


def report_sites(merged_sites: list[WorldSite]) -> None:
    print(f"catalogue: {len(merged_sites)} sites, dated {_dated_share(merged_sites)}")
    for title, counts in (
        ("source", Counter(site.source for site in merged_sites)),
        ("siteType", Counter(site.siteType for site in merged_sites)),
        ("datingSource", Counter(site.datingSource for site in merged_sites)),
    ):
        print(f"  per {title}: " + ", ".join(f"{key} {count}" for key, count in counts.most_common()))


def report_sizes(sizes: dict[str, int], index: dict) -> None:
    detail = [size for relative, size in sizes.items() if relative.startswith("detail/")]
    cells = [size for relative, size in sizes.items() if relative.startswith("cells/")]
    print(f"core: {index['coreCount']} sites, {sizes['core.json']:,} bytes")
    print(f"cells: {len(cells)} files, {sum(cells):,} bytes, largest {max(cells, default=0):,}")
    print(f"detail: {len(detail)} shards, {sum(detail):,} bytes, largest {max(detail, default=0):,}")
    print(f"osm layer: {sizes['osm-megaliths.json']:,} bytes")
    print(f"total: {len(sizes)} files, {sum(sizes.values()):,} bytes written to {OUT_DIR.relative_to(ROOT).as_posix()}")


def _sites(source: str) -> list[WorldSite]:
    path = SOURCE_PATHS[source]
    return list(read_jsonl(path)) if path.exists() else []


def _dated_share(sites: list[WorldSite]) -> str:
    dated = sum(is_dated(site) for site in sites)
    return f"{dated} of {len(sites)} ({100 * dated / max(1, len(sites)):.1f}%)"


if __name__ == "__main__":
    raise SystemExit(main())
