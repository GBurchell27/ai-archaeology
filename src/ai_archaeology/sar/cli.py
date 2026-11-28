"""Command-line entry point for offline planning and ASF catalogue discovery."""

import argparse
import json
import sys
from datetime import date

from .acquisition import (
    DIRECTIONS,
    MODES,
    POLARIZATIONS,
    PRODUCT,
    PUBLISHED_SITES,
    catalogue_plan,
    search_catalogue,
)


def _iso_date(text: str) -> date:
    try:
        value = date.fromisoformat(text)
        if value.isoformat() == text:
            return value
    except ValueError:
        pass
    raise argparse.ArgumentTypeError("use a date in YYYY-MM-DD format")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    search = commands.add_parser("search", help="plan or run a metadata-only search")
    search.add_argument("--site", required=True, choices=sorted(PUBLISHED_SITES))
    search.add_argument("--start", required=True, type=_iso_date, help="first UTC acquisition date")
    search.add_argument("--end", required=True, type=_iso_date, help="last UTC acquisition date")
    search.add_argument("--product", choices=[PRODUCT], default=PRODUCT)
    search.add_argument("--mode", choices=MODES, default="IW")
    search.add_argument("--polarization", choices=POLARIZATIONS, type=str.upper)
    search.add_argument("--orbit-direction", choices=DIRECTIONS, type=str.upper)
    search.add_argument(
        "--incidence", nargs=2, type=float, metavar=("MIN_DEG", "MAX_DEG"),
        help="screen by reported catalogue incidence angle (inclusive)",
    )
    search.add_argument("--limit", type=int, default=50, help="catalogue records to inspect (1–250)")
    search.add_argument("--live", action="store_true", help="send the query to ASF for metadata")
    args = parser.parse_args(argv)

    if args.start > args.end:
        search.error("--start must be on or before --end")
    if not 1 <= args.limit <= 250:
        search.error("--limit must be between 1 and 250")
    incidence = None
    if args.incidence is not None:
        lower, upper = args.incidence
        if not 0 < lower <= upper < 90:
            search.error("--incidence requires 0 < MIN_DEG <= MAX_DEG < 90")
        incidence = lower, upper

    plan = catalogue_plan(
        args.site, args.start, args.end, args.mode, args.polarization,
        args.orbit_direction, incidence, args.limit,
    )
    output = {"dry_run": not args.live, **plan}
    if args.live:
        try:
            output.update(search_catalogue(plan))
        except (OSError, ValueError) as error:
            print(f"ASF catalogue search failed: {error}", file=sys.stderr)
            return 1
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
