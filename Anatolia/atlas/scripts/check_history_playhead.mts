// The history playhead: how far one tick moves, when the filter is told, and which sites that reveals.
import { register } from "node:module";
import type { SiteColumns } from "../lib/world/catalogueTypes.ts";

register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    return next(specifier.startsWith("@/") ? root + specifier.slice(2) + ".ts" : specifier, context);
  }
`)}`);

const { DEFAULT_SHOW_UNDATED } = await import("../lib/settings/settingsPresets.ts");
const {
  FULL_SWEEP_SECONDS,
  PLAYHEAD_YEAR_STEP,
  describePlayhead,
  displayedYear,
  filterYearChanged,
  quantizePlayYear,
  rangeWithRevealedEnd,
  revealedEnd,
  stepTrack,
} = await import("../lib/world/historyPlayhead.ts");
const { WORLD_RANGE_END, WORLD_RANGE_START, clampWorldYear, filterRangeFor, trackToWorldYear, worldYearToTrack } = await import("../lib/world/worldEras.ts");
const { siteMatches } = await import("../lib/world/siteFilter.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const milli = (track: number) => Math.round(track * 1000);

function runSweep(elapsedSeconds: number, speed: 1 | 2 | 4, reducedMotion: boolean, endTrack = 1) {
  let track = 0;
  let steps = 0;
  let backwards = false;
  while (steps < 500) {
    const next = stepTrack({ track, startTrack: 0, endTrack, elapsedSeconds, speed, reducedMotion });
    if (next.track + 0.0001 < track) backwards = true;
    track = next.track;
    steps += 1;
    if (next.done) return { track, steps, backwards };
  }
  return { track, steps, backwards };
}

const one = runSweep(0.16, 1, false);
const two = runSweep(0.16, 2, false);
check("1x reaches the end of the track", one.track === 1 && !one.backwards);
check("1x takes about one step per timer gap across 24 seconds", one.steps >= 140 && one.steps <= 170);
check("2x finishes in fewer steps than 1x", two.steps < one.steps && two.track === 1 && two.steps >= 70 && two.steps <= 90);

const second = stepTrack({ track: 0, startTrack: 0, endTrack: 1, elapsedSeconds: 1, speed: 1, reducedMotion: false });
check("one second at 1x is a fraction of a 24 second sweep", milli(second.track) === Math.round(1000 / FULL_SWEEP_SECONDS));
const doubled = stepTrack({ track: 0, startTrack: 0, endTrack: 1, elapsedSeconds: 1, speed: 2, reducedMotion: false });
check("2x covers twice the track of 1x in the same second", doubled.track / second.track > 1.95 && doubled.track / second.track < 2.05);

const band = stepTrack({ track: 0, startTrack: 0, endTrack: 1, elapsedSeconds: 0.01, speed: 1, reducedMotion: true });
const bandLater = stepTrack({ track: 0, startTrack: 0, endTrack: 1, elapsedSeconds: 5, speed: 1, reducedMotion: true });
check("reduced motion jumps about one date band", milli(band.track) === Math.round(1000 / 6) && milli(band.track) === milli(bandLater.track));
const fastBand = stepTrack({ track: 0, startTrack: 0, endTrack: 1, elapsedSeconds: 0.01, speed: 4, reducedMotion: true });
check("reduced motion at 4x jumps four bands", milli(fastBand.track) === Math.round(4000 / 6));
const capped = stepTrack({ track: 0.9, startTrack: 0, endTrack: 1, elapsedSeconds: 10, speed: 4, reducedMotion: false });
check("a long tick stops on the end of the range", capped.track === 1 && capped.done);
const short = runSweep(0.16, 1, false, 0.2);
check("a short chosen range finishes early and on its own end", short.track === 0.2 && short.steps < 40);

const start = worldYearToTrack(WORLD_RANGE_START);
const globeEnd = worldYearToTrack(WORLD_RANGE_END);
const globeStep = stepTrack({ track: start, startTrack: start, endTrack: globeEnd, elapsedSeconds: 1, speed: 1, reducedMotion: false });
const globeYear = trackToWorldYear(globeStep.track);
check("a globe second leaves the deep past and has not reached the present", globeYear > WORLD_RANGE_START && globeYear < WORLD_RANGE_END);

let track = start;
let committed: number | null = null;
let ticks = 0;
let commits = 0;
let retreated = false;
while (ticks < 500) {
  const next = stepTrack({ track, startTrack: start, endTrack: globeEnd, elapsedSeconds: 0.16, speed: 1, reducedMotion: false });
  track = next.track;
  const year = clampWorldYear(trackToWorldYear(track));
  if (filterYearChanged(committed, year, PLAYHEAD_YEAR_STEP)) {
    const bucket = quantizePlayYear(year, PLAYHEAD_YEAR_STEP);
    if (committed !== null && bucket < committed) retreated = true;
    committed = bucket;
    commits += 1;
  }
  ticks += 1;
  if (next.done) break;
}
check("committed years never move backwards", !retreated);
check("the filter is told less often than the playhead ticks", commits > 10 && commits < ticks);
check("the last commit is the present end of the globe range", committed === WORLD_RANGE_END);

check("years inside one step share a filter year", filterYearChanged(-9540, -9510, PLAYHEAD_YEAR_STEP) === false);
check("the next step is a new filter year", filterYearChanged(-9540, -9560, PLAYHEAD_YEAR_STEP));
check("there is no year 0 on the readout", displayedYear(0.2) === 1 && displayedYear(-0.4) === -1 && displayedYear(-9600.4) === -9600);
check("the readout names the year and the era", describePlayhead(-7500, "9000–5000 BCE") === "7500 BCE · 9000–5000 BCE");
check("the readout is the year alone when no era is named", describePlayhead(1100, null) === "1100 CE");

const bounds = { start: WORLD_RANGE_START, end: WORLD_RANGE_END };
const window = rangeWithRevealedEnd(bounds, -8000);
check("a sweep keeps the chosen start and reveals up to the playhead", revealedEnd(bounds, -8000) === -8000 && window.start === WORLD_RANGE_START && window.end === -8000);
check("arriving at the end shows the whole range again", revealedEnd({ start: -5000, end: -3000 }, -3000) === null);
check("undated sites start hidden", DEFAULT_SHOW_UNDATED === false);

const types = ["site"];
const row = (startYear: number | null, endYear: number | null): SiteColumns => ({
  id: ["s"], name: ["s"], lon: [30], lat: [37], type: [0], start: [startYear], end: [endYear], importance: [1], source: [0], featured: [0],
});
const hidden = { range: filterRangeFor([window.start, window.end], false), showUndated: false, types: null, featuredOnly: false };
const shown = { ...hidden, showUndated: true };
check("a site appears once the playhead reaches its date", siteMatches(row(-9000, -9000), 0, hidden, types) && !siteMatches(row(-7000, -7000), 0, hidden, types));
check("the year the playhead is on is in range", siteMatches(row(-8000, -8000), 0, hidden, types));
check("an undated site stays hidden until Include undated is on", !siteMatches(row(null, null), 0, hidden, types) && siteMatches(row(null, null), 0, shown, types));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, commits, ticks }));
