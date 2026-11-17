"""Harvest published archaeological sites from Wikidata into data/world/sources/wikidata.jsonl.

Dataset: Wikidata, CC0 1.0, via https://query.wikidata.org/sparql (see docs/data-sources.md).
Every raw response is cached under data/world/raw/wikidata/, so a rerun after a crash or a
rate limit only fetches what is missing. Delete that folder to take a fresh snapshot.

    .venv/Scripts/python scripts/fetch_world_wikidata.py --featured path/to/featured_monuments.json
"""

from __future__ import annotations

import argparse
import json
import logging
from collections import Counter
from pathlib import Path
from typing import Callable

from ai_archaeology.world import wikidata_world as wd
from ai_archaeology.world.records import write_jsonl
from ai_archaeology.world.sparql_client import QueryTimeout, SparqlClient

LOGGER = logging.getLogger("fetch_world_wikidata")
CLASS_BATCH = 25
ITEM_BATCH = 300
WORLD_BOX = (-180.0, -90.0, 180.0, 90.0)
MAX_TILE_DEPTH = 5


def main() -> None:
    args = _arguments()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
    client = SparqlClient(args.cache)
    failures: list[str] = []
    classes, megalithic, sitelinked = load_class_sets(client)
    featured = load_featured_qids(args.featured)

    rows = harvest_classes(client, "megalithic", megalithic, False, failures)
    rows += harvest_classes(client, "sitelinked", sitelinked, True, failures)
    rows += fetch_splitting(client, "items/featured", featured, wd.items_by_id_query, failures)
    locations = wd.first_locations(rows)
    LOGGER.info("%d located items (%d featured asked, %d found)", len(locations), len(featured),
                sum(qid in locations for qid in featured))

    details = harvest_details(client, sorted(locations, key=lambda qid: int(qid[1:])), failures)
    class_labels = harvest_class_labels(client, details, failures)
    sites, rejected = build_sites(locations, details, class_labels, classes, set(featured))
    count = write_jsonl(args.out, sites)
    LOGGER.info("wrote %d sites to %s; rejected %s; %d requests sent", count, args.out, dict(rejected), client.requests_sent)
    LOGGER.info("failed or truncated queries: %s", failures or "none")


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=Path("data/world/sources/wikidata.jsonl"))
    parser.add_argument("--cache", type=Path, default=Path("data/world/raw/wikidata"))
    parser.add_argument("--featured", type=Path, help="JSON array of objects with a 'qid'; always included")
    return parser.parse_args()


def load_featured_qids(path: Path | None) -> list[str]:
    if path is None:
        return []
    entries = json.loads(path.read_text(encoding="utf-8"))
    return sorted({entry["qid"] for entry in entries if entry.get("qid")})


def load_class_sets(client: SparqlClient) -> tuple[wd.ClassSets, list[str], list[str]]:
    """The class sets used to judge items, plus the two class lists to harvest."""
    roots = [*wd.MEGALITHIC_ROOTS, *wd.SITELINKED_ROOTS, *wd.EXCLUDED_ROOTS]
    trees: dict[str, set[str]] = {root: set() for root in roots}
    for row in client.bindings("classes/trees", wd.class_tree_query(roots)):
        trees[wd.qid_of(row["root"])].add(wd.qid_of(row["class"]))
    megalithic = set().union(*(trees[root] for root in wd.MEGALITHIC_ROOTS))
    excluded = set().union(*(trees[root] for root in wd.EXCLUDED_ROOTS))
    sitelinked = set().union(*(trees[root] for root in wd.SITELINKED_ROOTS)) - excluded
    LOGGER.info("%d megalithic classes, %d sitelinked classes", len(megalithic), len(sitelinked))
    return (
        wd.ClassSets(frozenset(megalithic), frozenset(sitelinked)),
        sorted(megalithic),
        sorted(sitelinked - megalithic),
    )


def harvest_classes(client: SparqlClient, name: str, classes: list[str], require_sitelink: bool, failures: list[str]) -> list[dict]:
    rows: list[dict] = []
    for start in range(0, len(classes), CLASS_BATCH):
        batch = classes[start:start + CLASS_BATCH]
        found = fetch_splitting(
            client, f"items/{name}-{start:04d}", batch,
            lambda members: wd.items_query(members, require_sitelink), failures,
            lambda single: harvest_tiles(client, name, single[0], require_sitelink, WORLD_BOX, 0, failures),
        )
        rows += found
        LOGGER.info("%s classes %d/%d: %d rows so far", name, min(start + CLASS_BATCH, len(classes)), len(classes), len(rows))
    return rows


def fetch_splitting(client: SparqlClient, label: str, members: list[str], make_query: Callable[[list[str]], str],
                    failures: list[str], on_single_timeout: Callable[[list[str]], list[dict]] | None = None) -> list[dict]:
    """Run one query for the members; when the server times out, halve the list and retry."""
    if not members:
        return []
    try:
        return client.bindings(label, make_query(members))
    except QueryTimeout:
        if len(members) == 1:
            if on_single_timeout is not None:
                return on_single_timeout(members)
            failures.append(f"{label} ({members[0]})")
            return []
    middle = len(members) // 2
    return (
        fetch_splitting(client, f"{label}a", members[:middle], make_query, failures, on_single_timeout)
        + fetch_splitting(client, f"{label}b", members[middle:], make_query, failures, on_single_timeout)
    )


def harvest_tiles(client: SparqlClient, name: str, class_qid: str, require_sitelink: bool,
                  box: tuple[float, float, float, float], depth: int, failures: list[str]) -> list[dict]:
    """One class too big for a single query: quarter the lon/lat box until each tile answers."""
    west, south, east, north = box
    label = f"tiles/{name}-{class_qid}-{west:g}_{south:g}_{east:g}_{north:g}"
    if depth > 0:
        try:
            return client.bindings(label, wd.items_query([class_qid], require_sitelink, box))
        except QueryTimeout:
            if depth >= MAX_TILE_DEPTH:
                failures.append(label)
                return []
    middle_lon, middle_lat = (west + east) / 2, (south + north) / 2
    quarters = (
        (west, south, middle_lon, middle_lat), (middle_lon, south, east, middle_lat),
        (west, middle_lat, middle_lon, north), (middle_lon, middle_lat, east, north),
    )
    return [row for quarter in quarters
            for row in harvest_tiles(client, name, class_qid, require_sitelink, quarter, depth + 1, failures)]


def harvest_details(client: SparqlClient, qids: list[str], failures: list[str]) -> dict[str, wd.ItemDetails]:
    details: dict[str, wd.ItemDetails] = {}
    for start in range(0, len(qids), ITEM_BATCH):
        batch = qids[start:start + ITEM_BATCH]
        wd.group_details(fetch_splitting(client, f"details/{start:06d}", batch, wd.details_query, failures), details)
        if start % (ITEM_BATCH * 20) == 0:
            LOGGER.info("details %d/%d (%d requests sent)", start, len(qids), client.requests_sent)
    return details


def harvest_class_labels(client: SparqlClient, details: dict[str, wd.ItemDetails], failures: list[str]) -> dict[str, str]:
    wanted = sorted({qid for item in details.values() for qid in item.types | item.heritage})
    labels: dict[str, str] = {}
    for start in range(0, len(wanted), ITEM_BATCH):
        batch = wanted[start:start + ITEM_BATCH]
        for row in fetch_splitting(client, f"labels/{start:06d}", batch, wd.class_labels_query, failures):
            labels[wd.qid_of(row["item"])] = row["itemLabel"]["value"]
    LOGGER.info("%d class labels", len(labels))
    return labels


def build_sites(locations: dict, details: dict[str, wd.ItemDetails], class_labels: dict[str, str],
                classes: wd.ClassSets, featured: set[str]) -> tuple[list, Counter]:
    sites = []
    rejected: Counter = Counter()
    for qid, location in locations.items():
        item = details.get(qid)
        if item is None:
            rejected["no-details"] += 1
            continue
        reason = wd.rejection_reason(item, wd.labels_for(item.types, class_labels), classes, qid in featured)
        if reason:
            rejected[reason] += 1
            continue
        sites.append(wd.build_site(qid, location, item, class_labels))
    sites.sort(key=lambda site: (-site.importance, int(site.id[1:])))
    return sites, rejected


if __name__ == "__main__":
    main()
