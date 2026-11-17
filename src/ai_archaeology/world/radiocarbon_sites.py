"""Radiocarbon dates aggregated to one dated record per site.

Dating enrichment only: these records give dates to pins that already exist.
Their coordinates never create or move a pin (p3k14c locations are deliberately fuzzed).
"""

from __future__ import annotations

from bisect import bisect_right
from collections import Counter, defaultdict
from typing import Iterable, Iterator

# Approximate IntCal20 curve as (14C years BP, calibrated years BP). Anchors checked against
# the published curve file https://intcal.org/curves/intcal20.14c (Reimer et al. 2020,
# Radiocarbon 62(4), doi:10.1017/RDC.2020.41); where the curve wiggles, the anchor is the
# midpoint of the calendar range that maps to that 14C age.
# shortcut: piecewise-linear lookup. Measured against the curve every 100 14C years: within
# 280 years (mean 40) to 15,000 BP and within 700 years (mean 150) from there to 50,000 BP
# (plateaus and wiggles are flattened). Good for binning into millennia only; use a real
# calibration library if finer dating is ever needed.
INTCAL20_ANCHORS = (
    (0, 0), (500, 530), (1000, 920), (1500, 1380), (2000, 1950), (2500, 2580),
    (3000, 3190), (3500, 3770), (4000, 4480), (4500, 5150), (5000, 5730),
    (5500, 6300), (6000, 6840), (6500, 7420), (7000, 7840), (7500, 8330),
    (8000, 8990), (8500, 9500), (9000, 10190), (9500, 10750), (10000, 11480),
    (10500, 12540), (11000, 12920), (12000, 13880), (12500, 14870), (13000, 15560),
    (14000, 17020), (15000, 18280), (17000, 20520), (20000, 23950), (22500, 26950),
    (25000, 29230), (30000, 34450), (35000, 40090), (37500, 42100), (40000, 43050),
    (42500, 45000), (45000, 47290), (47500, 49980), (50000, 53830),
)
MAXIMUM_RADIOCARBON_AGE = INTCAL20_ANCHORS[-1][0]
TRIM_MINIMUM_DATES = 20
MAXIMUM_PERIODS = 5

DateRow = dict  # {"siteKey", "name", "lon", "lat", "age", "period"}


def calendar_year_from_radiocarbon_age(radiocarbon_age: float) -> int:
    """Uncalibrated 14C years BP -> approximate calendar year (negative = BCE, and there is no year 0)."""
    ages = [anchor[0] for anchor in INTCAL20_ANCHORS]
    upper = min(max(bisect_right(ages, radiocarbon_age), 1), len(ages) - 1)
    (age_low, calibrated_low), (age_high, calibrated_high) = INTCAL20_ANCHORS[upper - 1], INTCAL20_ANCHORS[upper]
    fraction = (radiocarbon_age - age_low) / (age_high - age_low)
    year = round(1950 - (calibrated_low + fraction * (calibrated_high - calibrated_low)))
    return year if year > 0 else year - 1  # 1950 cal BP is 1 BCE


def _number(text: object) -> float | None:
    try:
        return float(text)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _is_usable(row: DateRow) -> bool:
    lon, lat, age = row["lon"], row["lat"], row["age"]
    if lon is None or lat is None or age is None or not row["name"]:
        return False
    if (lon == 0 and lat == 0) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return False
    return 0 < age <= MAXIMUM_RADIOCARBON_AGE


def _year_span(calendar_years: list[int]) -> tuple[int, int]:
    """Oldest and youngest year; 5th-95th percentile once a site has many dates."""
    ordered = sorted(calendar_years)
    if len(ordered) < TRIM_MINIMUM_DATES:
        return ordered[0], ordered[-1]
    last = len(ordered) - 1
    return ordered[round(0.05 * last)], ordered[round(0.95 * last)]


def aggregate_site_dates(date_rows: Iterable[DateRow], source: str) -> list[dict]:
    """Group date rows by siteKey into the dating-enrichment records of Contract 1."""
    rows_by_site: dict[object, list[DateRow]] = defaultdict(list)
    for row in date_rows:
        if _is_usable(row):
            rows_by_site[row["siteKey"]].append(row)
    records = []
    for rows in rows_by_site.values():
        start_year, end_year = _year_span([calendar_year_from_radiocarbon_age(row["age"]) for row in rows])
        periods = Counter(row["period"] for row in rows if row.get("period"))
        records.append({
            "name": rows[0]["name"],
            "lon": round(rows[0]["lon"], 5),
            "lat": round(rows[0]["lat"], 5),
            "startYear": start_year,
            "endYear": end_year,
            "nDates": len(rows),
            "periods": [period for period, _ in periods.most_common(MAXIMUM_PERIODS)],
            "source": source,
        })
    return records


def p3k14c_date_rows(csv_rows: Iterable[dict]) -> Iterator[DateRow]:
    """Rows of p3k14c_scrubbed_fuzzed.csv as date rows."""
    for row in csv_rows:
        name = (row.get("SiteName") or "").strip()
        yield {
            "siteKey": (row.get("SiteID") or "").strip() or (name.lower(), row.get("Country")),
            "name": name,
            "lon": _number(row.get("Long")),
            "lat": _number(row.get("Lat")),
            "age": _number(row.get("Age")),
            "period": (row.get("Period") or "").strip(),
        }


def xronos_date_rows(
    sites: Iterable[dict], contexts: Iterable[dict], samples: Iterable[dict], c14s: Iterable[dict]
) -> Iterator[DateRow]:
    """Join XRONOS's c14s -> samples -> contexts -> sites CSV tables into date rows."""
    site_by_id = {row["id"]: row for row in sites}
    site_id_by_context = {row["id"]: row["site_id"] for row in contexts}
    context_by_sample = {row["id"]: row["context_id"] for row in samples}
    for measurement in c14s:
        site = site_by_id.get(site_id_by_context.get(context_by_sample.get(measurement["sample_id"])))
        if site:
            yield {
                "siteKey": site["id"],
                "name": (site.get("name") or "").strip(),
                "lon": _number(site.get("lng")),
                "lat": _number(site.get("lat")),
                "age": _number(measurement.get("c14_age")),
                "period": "",
            }
