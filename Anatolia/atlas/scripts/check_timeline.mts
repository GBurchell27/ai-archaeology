import { readFileSync } from "node:fs";
import { clusterByScreen, type ScreenPin } from "../lib/pinCluster.ts";
import { PERIODS } from "../lib/periods.ts";
import {
  RANGE_END,
  RANGE_START,
  activeChip,
  nextPlayRange,
  pinsInRange,
  rangeForChip,
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
