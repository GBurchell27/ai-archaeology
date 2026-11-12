"""Generate pleiades_periods.json from the Pleiades time-period vocabulary.

The source is the public Turtle dump, no account required:

    https://atlantides.org/downloads/pleiades/rdf/time-periods.ttl

The file used for the committed table is the 2026-11-08 export
(CC BY 3.0 US, https://creativecommons.org/licenses/by/3.0/us/).
The same figures are published at
https://pleiades.stoa.org/vocabularies/time-periods/.

Bounds come from the ``[[start, end]]`` bracket in ``skos:scopeNote``.
When that bracket is absent, the years are parsed from ``skos:prefLabel``:
a numeric range, or a century name such as "fifteenth century of the common era"
(1400–1499). The table is not typed by hand.

    python -m ai_archaeology.sites.build_pleiades_periods /tmp/time-periods.ttl
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CONCEPT = re.compile(r"<https://pleiades.stoa.org/vocabularies/([^/>][^>]*)>")
BRACKET = re.compile(r"\[\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]\]")
LABEL = re.compile(r'skos:prefLabel "([^"]+)"')
RANGE = re.compile(
    r"(?:(AD|CE|BC|BCE)\s+)?(?:ca\.?\s+)?(\d[\d,]*)\s*(AD|CE|BC|BCE)?"
    r"\s*[-–—]\s*(?:(?:AD|CE|BC|BCE)\s+)?(?:ca\.?\s+)?(\d[\d,]*)\s*(AD|CE|BC|BCE)?",
    re.IGNORECASE,
)
CENTURY = re.compile(
    r"(twenty-first|twentieth|nineteenth|eighteenth|seventeenth|sixteenth|"
    r"fifteenth|fourteenth|thirteenth|twelfth|eleventh|tenth|ninth|eighth|"
    r"seventh|sixth|fifth|fourth|third|second|first)\s+century\s+"
    r"(before|of)\s+the common era",
    re.IGNORECASE,
)
ORDINAL = {
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
    "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
    "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14,
    "fifteenth": 15, "sixteenth": 16, "seventeenth": 17, "eighteenth": 18,
    "nineteenth": 19, "twentieth": 20, "twenty-first": 21,
}
OUT = Path(__file__).with_name("pleiades_periods.json")


def parse_vocabulary(text: str) -> dict[str, list[int]]:
    periods: dict[str, list[int]] = {}
    for block in re.split(r"\n\s*\n", text):
        concept = CONCEPT.search(block)
        if concept is None:
            continue
        slug = concept.group(1)
        bounds = _bounds(block)
        if bounds is None:
            continue
        start, end = bounds
        if start > end:
            start, end = end, start
        periods[slug] = [start, end]
    return periods


def _bounds(block: str) -> tuple[int, int] | None:
    brackets = BRACKET.findall(block)
    if brackets:
        return int(brackets[-1][0]), int(brackets[-1][1])
    label = LABEL.search(block)
    if label is None:
        return None
    text = label.group(1)
    century = CENTURY.search(text)
    if century:
        number = ORDINAL[century.group(1).lower()]
        if century.group(2).lower() == "before":
            return -number * 100, -((number - 1) * 100 + 1)
        return (number - 1) * 100, number * 100 - 1
    found = RANGE.search(text)
    if found is None:
        return None
    era_before, raw_start, era_start, raw_end, era_end = found.groups()
    start_era = (era_start or era_before or era_end or "").upper()
    end_era = (era_end or era_start or era_before or "").upper()
    return _signed(raw_start, start_era), _signed(raw_end, end_era)


def _signed(raw: str, era: str) -> int:
    year = int(raw.replace(",", ""))
    if era in {"BC", "BCE"}:
        return -year
    return year


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/time-periods.ttl")
    periods = parse_vocabulary(source.read_text())
    OUT.write_text(json.dumps(periods, indent=2, sort_keys=True) + "\n")
    print(f"wrote {len(periods)} periods to {OUT}")


if __name__ == "__main__":
    main()
