"""Build the Wikidata site snapshot. Raw SPARQL JSON stays out of git."""

from __future__ import annotations

import argparse
from pathlib import Path

from ai_archaeology.sites.wikidata import build_snapshot, write_outputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument("--curated", type=Path, default=Path("Anatolia/atlas/public/sites.geojson"))
    parser.add_argument("--out", type=Path, default=Path("Anatolia/atlas/public/wikidata"))
    args = parser.parse_args()
    snapshot = build_snapshot(args.raw, args.curated)
    write_outputs(snapshot, args.out)
    print(
        f"snapshot {snapshot['snapshotDate']}: {snapshot['wikidataRows']} Wikidata items, "
        f"{len(snapshot['features'])} pins, {snapshot['droppedAsCurated']} already curated"
    )


if __name__ == "__main__":
    main()
