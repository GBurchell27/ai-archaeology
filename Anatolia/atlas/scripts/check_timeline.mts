import { readFileSync } from "node:fs";
import { clusterByScreen, type ScreenPin } from "../lib/pinCluster.ts";
import { PERIODS, formatYear } from "../lib/periods.ts";
import {
  PAGE_STEP,
  RANGE_END,
  RANGE_START,
  activeChip,
  isDroppedAdministrativeSpan,
  nextPlayRange,
  pinsInRange,
  rangeForChip,
  stepYear,
  yearToTrack,
  type YearRange,
} from "../lib/timeline.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

interface CatalogueFeature {
  id: string;
  properties: {
    name: string;
    startYear: number | null;
    endYear: number | null;
    periods?: string[];
    source?: string;
    types?: string[];
    periodLabels?: string[];
    pleiadesId?: string;
  };
}

const collection = JSON.parse(readFileSync(new URL("../public/wikidata/sites.geojson", import.meta.url), "utf8")) as {
  features: CatalogueFeature[];
};
const features = collection.features;
const miletus = features.find((feature) => feature.id === "Q169460");
check("the catalogue still has Miletus", miletus?.properties.name === "Miletus" && miletus.properties.startYear != null);

const in1100 = pinsInRange(features, { start: 1100, end: 1100 }, false);
const in3000 = pinsInRange(features, { start: -3000, end: -3000 }, false);
check("Miletus overlaps 1100 CE", in1100.some((feature) => feature.id === "Q169460"));
check("Miletus is outside 3000 BCE", !in3000.some((feature) => feature.id === "Q169460"));
const edge = pinsInRange(
  [{ id: "edge", properties: { name: "edge", startYear: 1000, endYear: 1100 } }],
  { start: 1100, end: 1200 },
  false,
);
check("a span ending on the range start still overlaps", edge.length === 1);

check("there is no year 0 between 1 BCE and 1 CE", stepYear(-1, 1) === 1 && stepYear(1, -1) === -1);
check("a label never reads 0 CE", formatYear(0) !== "0 CE" && formatYear(-1) === "1 BCE" && formatYear(1) === "1 CE");
check("page step is larger than one year", PAGE_STEP > 1 && stepYear(1000, PAGE_STEP) === 1000 + PAGE_STEP);

const wall = features.find((feature) => feature.id === "Q487013");
check("the Anastasian Wall has a start and no end", wall?.properties.name === "Anastasian Wall" && wall.properties.startYear === 460 && wall.properties.endYear == null);
check("a missing end uses the latest named period", wall != null && pinsInRange([wall], { start: 1100, end: 1100 }, false).length === 1);
check("that period end is not open-ended", wall != null && pinsInRange([wall], { start: 1600, end: 1600 }, false).length === 0);
const classicalOnly = { id: "classical-only", properties: { name: "classical only", startYear: 460, endYear: null, periods: ["classical"] } };
check("a classical pin with no end stops at 1095", pinsInRange([classicalOnly], { start: 1095, end: 1095 }, false).length === 1);
check("a classical pin with no end is out of 1096", pinsInRange([classicalOnly], { start: 1096, end: 1096 }, false).length === 0);
const hosap = features.find((feature) => feature.id === "Q1420248");
check("Hoşap Castle keeps a single year when no period is known", hosap?.properties.startYear === 1643 && hosap.properties.endYear == null && (hosap.properties.periods ?? []).length === 0);
check("that single year does not spill into the next", hosap != null && pinsInRange([hosap], { start: 1643, end: 1643 }, false).length === 1 && pinsInRange([hosap], { start: 1644, end: 1644 }, false).length === 0);

const dios = features.find((feature) => feature.id === "Q3708109");
const bektash = features.find((feature) => feature.id === "Q20474091");
const cave = features.find((feature) => feature.id === "Q30625593");
check(
  "Dios Hieron uses the Pleiades span instead of the 1933 titular see",
  dios?.properties.pleiadesId === "550515"
  && dios.properties.startYear === -30
  && dios.properties.endYear === 300
  && pinsInRange([dios], { start: 100, end: 100 }, false).length === 1
  && pinsInRange([dios], { start: 1923, end: 1923 }, false).length === 0,
);
check(
  "the Haji Bektash complex is undated without the 1964 museum opening",
  bektash != null
  && bektash.properties.startYear == null
  && bektash.properties.endYear == null
  && pinsInRange([bektash], { start: 1923, end: 1923 }, false).length === 0
  && pinsInRange([bektash], { start: 1923, end: 1923 }, true).length === 1,
);
check(
  "İncirliin Cave is undated without the 2008 heritage listing",
  cave != null
  && cave.properties.startYear == null
  && cave.properties.endYear == null
  && pinsInRange([cave], { start: 1923, end: 1923 }, false).length === 0
  && pinsInRange([cave], { start: 1923, end: 1923 }, true).length === 1,
);
const stillAdministrative = features.filter((feature) => isDroppedAdministrativeSpan(feature.properties));
check("no Wikidata administrative span remains on an ancient or historical place", stillAdministrative.length === 0);
const titularSee = {
  id: "titular",
  properties: {
    name: "Titular see",
    source: "Wikidata",
    startYear: 1933,
    endYear: 1933,
    types: ["archaeological site", "polis", "titular see"],
    periods: [],
  },
};
check("a Wikidata span after 1900 on an ancient place is undated", pinsInRange([titularSee], { start: 1933, end: 1933 }, false).length === 0);
check("that dropped span still shows when undated pins are on", pinsInRange([titularSee], { start: 1933, end: 1933 }, true).length === 1);
const modernMuseum = {
  id: "museum",
  properties: { name: "New museum", source: "Wikidata", startYear: 1964, endYear: 1964, types: ["museum"], periods: [] },
};
check("a modern museum keeps a post-1900 Wikidata span", pinsInRange([modernMuseum], { start: 1964, end: 1964 }, false).length === 1);
const pleiadesLate = {
  id: "pleiades-late",
  properties: { name: "Pleiades place", source: "Pleiades", startYear: 1918, endYear: 1918, types: ["settlement"], periods: [] },
};
check("a Pleiades span is not dropped as a Wikidata inception", pinsInRange([pleiadesLate], { start: 1918, end: 1918 }, false).length === 1);

const undated = features.find((feature) => feature.properties.startYear == null && feature.properties.endYear == null);
check("the catalogue has an undated pin", undated != null);
check("an undated pin stays visible by default", undated != null && pinsInRange([undated], { start: 1100, end: 1100 }, true).length === 1);
check("an undated pin hides when the toggle is off", undated != null && pinsInRange([undated], { start: 1100, end: 1100 }, false).length === 0);
if (miletus && undated) {
  const mixed = pinsInRange([miletus, undated], { start: -3000, end: -3000 }, true);
  check("hiding a dated pin does not hide undated ones", mixed.length === 1 && mixed[0].id === undated.id);
}

for (const chip of PERIODS) {
  const preset = rangeForChip(chip);
  check(`${chip.id} chip sets that range`, activeChip(preset, PERIODS) === chip.id);
}
const all = rangeForChip(PERIODS[0]);
check("all periods runs from 12000 BCE to 1923 CE", all.start === RANGE_START && all.end === RANGE_END && all.start === -12000 && all.end === 1923);
const neolithic = rangeForChip(PERIODS.find((chip) => chip.id === "neolithic") ?? PERIODS[0]);
const crusader = rangeForChip(PERIODS.find((chip) => chip.id === "crusader") ?? PERIODS[0]);
check("the neolithic chip leaves Miletus out", miletus != null && pinsInRange([miletus], neolithic, false).length === 0);
check("the crusader chip includes Miletus", miletus != null && pinsInRange([miletus], crusader, false).length === 1);
check("a single year inside the band is not a chip preset", activeChip({ start: -3000, end: -3000 }, PERIODS) === "");

const prehistoric = yearToTrack(-3200) - yearToTrack(RANGE_START);
const neolithicWidth = yearToTrack(-6000) - yearToTrack(-9600);
const crusaderWidth = yearToTrack(1522) - yearToTrack(1096);
check("prehistory keeps at least half the track", prehistoric >= 0.5);
check("the neolithic stretch is wider than the crusader era", neolithicWidth > crusaderWidth);

function screenOf(list: readonly CatalogueFeature[]): ScreenPin[] {
  return list.map((feature, index) => ({
    id: feature.id,
    name: feature.properties.name,
    x: index,
    y: 0,
    z: 0,
    longitude: 0,
    latitude: 0,
    screenX: index * 4,
    screenY: 0,
    visible: true,
    muted: feature.properties.startYear == null && feature.properties.endYear == null,
  }));
}

const clustered = clusterByScreen(screenOf(in3000), 108);
const clusteredIds = clustered.flatMap((group) => group.ids);
check(
  "clusters are built from the filtered list",
  clusteredIds.length === in3000.length && !clusteredIds.includes("Q169460"),
);
if (undated && miletus) {
  const shown = pinsInRange([miletus, undated], { start: -3000, end: -3000 }, true);
  const groups = clusterByScreen(screenOf(shown), 108);
  check(
    "an out-of-range pin is not clustered",
    groups.length === 1 && groups[0].ids.length === 1 && groups[0].ids[0] === undated.id,
  );
}

let cursor: YearRange = { start: 1100, end: 1100 };
let moved = false;
for (let step = 0; step < 80; step += 1) {
  const next = nextPlayRange(cursor);
  if (!next) break;
  if (next.end < cursor.end || (next.end === cursor.end && next.start <= cursor.start)) {
    check("play steps the range forward", false);
    break;
  }
  moved = true;
  cursor = next;
}
check("play steps the range forward", moved);
check("play reaches 1923 CE", cursor.end === RANGE_END);
check("play stops at 1923 CE", nextPlayRange({ start: RANGE_END, end: RANGE_END }) == null);

const app = readFileSync(new URL("../components/AtlasApp.tsx", import.meta.url), "utf8");
check(
  "the atlas filters pins before they are drawn",
  app.includes("pinsInRange(") && app.includes("wikiSites={wikiVisible}"),
);
check("period chips set the range", app.includes("rangeForChip("));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
