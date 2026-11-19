// The globe's year maths: no year 0, BCE/CE wording, open-ended and one-sided ranges.
import { register } from "node:module";

// The library files import each other through the "@/" alias; teach Node where that points.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    return next(specifier.startsWith("@/") ? root + specifier.slice(2) + ".ts" : specifier, context);
  }
`)}`);

const {
  WORLD_RANGE_END, WORLD_RANGE_START, clampWorldYear, describeSpan, eraOfYear, filterRangeFor, formatSiteDates, trackToWorldYear, worldYearToTrack,
} = await import("../lib/world/worldEras.ts");

let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  failed += 1;
  console.error("FAIL", label, JSON.stringify(actual), "expected", JSON.stringify(expected));
}

check("a BCE span", formatSiteDates(-9500, -8000), "9500–8000 BCE");
check("a span across the eras", formatSiteDates(-300, 400), "300 BCE – 400 CE");
check("a CE span", formatSiteDates(100, 400), "100–400 CE");
check("a raw year 0 at the start reads as 1 CE", formatSiteDates(0, 887), "1–887 CE");
check("a raw year 0 at the end reads as 1 CE", formatSiteDates(-100, 0), "100 BCE – 1 CE");
check("a raw year 0 on its own reads as 1 CE", formatSiteDates(0, 0), "about 1 CE");
check("only an end year", formatSiteDates(null, -1999), "about 1999 BCE");
check("only a start year", formatSiteDates(-2600, null), "about 2600 BCE");
check("undated", formatSiteDates(null, null), null);
check("deep time is grouped", formatSiteDates(-476000, -300000), "476,000–300,000 BCE");

check("the whole slider is all time", describeSpan([WORLD_RANGE_START, WORLD_RANGE_END]), "All time");
check("an open start", describeSpan([WORLD_RANGE_START, -9000]), "Before 9000 BCE");
check("an open end", describeSpan([500, WORLD_RANGE_END]), "After 500 CE");
check("the slider's year 0 stop reads as 1 CE", describeSpan([0, 500]), "1–500 CE");
const openStart = filterRangeFor([WORLD_RANGE_START, -9000], true);
check("an open start reaches every older date", openStart?.[0] === -Infinity && openStart[1] === -9000, true);
const datedOnly = filterRangeFor([WORLD_RANGE_START, WORLD_RANGE_END], false);
check("all time without undated still filters", datedOnly?.[0] === -Infinity && datedOnly[1] === Infinity, true);
check("all time with undated is no filter", filterRangeFor([WORLD_RANGE_START, WORLD_RANGE_END], true), null);

check("years clamp to the slider", [clampWorldYear(-99999), clampWorldYear(99999)], [WORLD_RANGE_START, WORLD_RANGE_END]);
for (const year of [WORLD_RANGE_START, -9000, -4200, -1000, 0, 500, WORLD_RANGE_END]) {
  check(`track position round-trips ${year}`, trackToWorldYear(worldYearToTrack(year)), year);
}
check("track positions outside 0–1 clamp", [trackToWorldYear(-3), trackToWorldYear(7)], [WORLD_RANGE_START, WORLD_RANGE_END]);
check("a year older than the slider still has an era", eraOfYear(-40000).id, "before-9000");
check("a year younger than the slider still has an era", eraOfYear(1900).id, "after-500");

// Named periods: which chips apply to a view, and that the table is well formed.
const {
  NAMED_PERIODS, PERIOD_REGIONS, REGIONAL_PERIODS_BELOW_ALTITUDE, YOUNGER_DRYAS,
  activeNamedPeriod, describeNamedPeriod, namedPeriodsAt, namedPeriodsForRegions, periodRegionKeyAt,
} = await import("../lib/world/namedPeriods.ts");

const LOW = 1_500_000;
const chipIds = (longitude: number, latitude: number, altitude: number) =>
  namedPeriodsAt(longitude, latitude, altitude).map((period) => period.id);
const GLOBAL_CHIPS = ["younger-dryas", "bronze-age-collapse"];
check("from high orbit only the global periods show", chipIds(38, 38, REGIONAL_PERIODS_BELOW_ALTITUDE), GLOBAL_CHIPS);
check("low over open ocean only the global periods show", chipIds(-30, 0, LOW), GLOBAL_CHIPS);
check(
  "low over Anatolia its periods join the global ones, oldest first",
  chipIds(38, 38, LOW),
  ["younger-dryas", "ppna", "ppnb", "hittite", "bronze-age-collapse", "phrygian"],
);
const overEgypt = chipIds(31, 26, LOW);
check("low over Egypt the Old Kingdom shows and the Hittites do not", [overEgypt.includes("egypt-old-kingdom"), overEgypt.includes("hittite")], [true, false]);
check("the region key is stable inside a region", periodRegionKeyAt(30, 39, LOW), periodRegionKeyAt(40, 37, LOW));
check("a region's edge is inside it", periodRegionKeyAt(45, 42.2, LOW), "anatolia");
check("an unknown region key adds nothing", namedPeriodsForRegions("atlantis").map((period) => period.id), GLOBAL_CHIPS);
check("a span that matches a period lights it", activeNamedPeriod(NAMED_PERIODS, -8800, -7000)?.id, "ppnb");
check("any other span lights none", activeNamedPeriod(NAMED_PERIODS, -8800, -7100), null);
check("the Younger Dryas band is the sourced interval", YOUNGER_DRYAS.span, [-10900, -9700]);
check("a tooltip names the region, the dates and the source", describeNamedPeriod(NAMED_PERIODS.find((period) => period.id === "ppnb")!),
  "Pre-Pottery Neolithic B (Anatolia), about 8800–7000 BCE. Source: Dietrich et al. 2019, “Cereal processing at Early Neolithic Göbekli Tepe”, PLOS ONE 14(5).");
const regionIds = new Set(["global", ...PERIOD_REGIONS.map((region) => region.id)]);
for (const period of NAMED_PERIODS) {
  const [start, end] = period.span;
  const wellFormed = start < end && start >= WORLD_RANGE_START && end <= WORLD_RANGE_END
    && regionIds.has(period.region) && period.source.citation.length > 0 && period.source.url.startsWith("https://");
  check(`period ${period.id} has a span on the slider, a known region and a source`, wellFormed, true);
}
check("period ids are unique", new Set(NAMED_PERIODS.map((period) => period.id)).size, NAMED_PERIODS.length);

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
