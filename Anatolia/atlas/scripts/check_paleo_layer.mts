// The ice and sea level layer: the shipped index, which step a timeline range means, and the wording.
import { readFileSync } from "node:fs";
import { register } from "node:module";

// The library files import each other through the "@/" alias; teach Node where that points.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    return next(specifier.startsWith("@/") ? root + specifier.slice(2) + ".ts" : specifier, context);
  }
`)}`);

const { PALEO_CLASS, nearestPaleoStep, paleoYearForSpan, parsePaleoIndex } = await import("../lib/world/paleoIndex.ts");
const { ALL_TIME, WORLD_ERAS } = await import("../lib/world/worldEras.ts");
const { YOUNGER_DRYAS } = await import("../lib/world/namedPeriods.ts");
const { GLOBE_PRESETS } = await import("../lib/settings/settingsPresets.ts");
const { RASTER_COLUMNS, RASTER_ROWS } = await import("../components/globe/model/modelRaster.ts");
const { MODEL_RAMP } = await import("../components/globe/model/modelRamp.ts");
const wording = await import("../components/globe/paleo/paleoWording.ts");

let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  failed += 1;
  console.error("FAIL", label, JSON.stringify(actual), "expected", JSON.stringify(expected));
}

function throws(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch {
    return true;
  }
}

// The shipped index.
const raw = JSON.parse(readFileSync(new URL("../public/paleo/index.json", import.meta.url), "utf8"));
const index = parsePaleoIndex(raw);
const present = index.steps[index.steps.length - 1];
check("the cells match the class-raster shader's grid", [360 / index.cellDegrees, 180 / index.cellDegrees], [RASTER_COLUMNS, RASTER_ROWS]);
check("the steps run from 20,000 BCE to the present, 500 years apart", [index.steps[0].year, present.year, index.steps[1].year - index.steps[0].year], [-20000, 2000, 500]);
check("no step states a sea level: the source publishes none", raw.steps.every((step: object) => Object.keys(step).sort().join() === "file,year"), true);
check("the source is credited with an open licence and a link", [index.source.licence, index.source.url.startsWith("https://doi.org/")], ["CC0 1.0", true]);
check("the drawn classes are colours of the class-raster shader", [PALEO_CLASS.exposedLand, PALEO_CLASS.ice].every((value) => value >= 1 && value <= MODEL_RAMP.length), true);
check("the index names every drawn class", [PALEO_CLASS.exposedLand, PALEO_CLASS.ice].every((value) => typeof raw.classes[String(value)] === "string"), true);

// A malformed index is refused.
const sample = { generated: "2026-01-01", cellDegrees: 0.25, northLimitDegrees: 84, source: index.source, steps: [{ year: -1000, file: "-1000.png" }, { year: 2000, file: "2000.png" }] };
check("a well-formed index parses", parsePaleoIndex(sample).steps.length, 2);
check("an index without a credit is refused", throws(() => parsePaleoIndex({ ...sample, source: { ...index.source, citation: "" } })), true);
check("a file name that leaves the folder is refused", throws(() => parsePaleoIndex({ ...sample, steps: [{ year: 1, file: "../world/core.json" }] })), true);
check("steps out of order are refused", throws(() => parsePaleoIndex({ ...sample, steps: [...sample.steps].reverse() })), true);
check("no steps is refused", throws(() => parsePaleoIndex({ ...sample, steps: [] })), true);

// Which step a timeline range means.
check("all time is the present day", [paleoYearForSpan(ALL_TIME), nearestPaleoStep(index.steps, null).year], [null, present.year]);
check("a range means its middle year", paleoYearForSpan([-9000, -5000]), -7000);
const dryasStep = nearestPaleoStep(index.steps, paleoYearForSpan(YOUNGER_DRYAS.span));
check("the Younger Dryas chip shows a step inside the Younger Dryas", dryasStep.year >= YOUNGER_DRYAS.span[0] && dryasStep.year <= YOUNGER_DRYAS.span[1], true);
check("the first date band shows a step before 9000 BCE", nearestPaleoStep(index.steps, paleoYearForSpan(WORLD_ERAS[0].span)).year < -9000, true);
check("the deep past preset shows a step before 5000 BCE", nearestPaleoStep(index.steps, paleoYearForSpan(GLOBE_PRESETS["deep-past"].yearSpan)).year < -5000, true);
check("the last date band is the present day's step or the one before", nearestPaleoStep(index.steps, paleoYearForSpan(WORLD_ERAS[5].span)).year >= 1000, true);
check("a year before the first step shows the first step", nearestPaleoStep(index.steps, -40000).year, -20000);
check("a year between two steps takes the later", nearestPaleoStep(index.steps, -10250).year, -10000);
check("a year after the last step shows the present", nearestPaleoStep(index.steps, 2500).year, present.year);

// Wording: level, and never a claim about a real coastline.
check("the oldest step's label", wording.paleoStepLabel(index.steps[0], present), "20,000 BCE");
check("its age", wording.paleoYearsAgo(index.steps[0], present), "about 22,000 years ago");
check("the present day's label and age", [wording.paleoStepLabel(present, present), wording.paleoYearsAgo(present, present)], ["the present day", ""]);
check("the statement says what it is not", /modelled reconstruction/.test(wording.PALEO_STATEMENT) && /Not a map of any coastline/.test(wording.PALEO_STATEMENT) && /cannot show the shore near a site/.test(wording.PALEO_STATEMENT), true);
check("the panel says how the year is picked", /middle of the years picked on the timeline/.test(wording.PALEO_TIMELINE_NOTE) && /present day and draws nothing/.test(wording.PALEO_TIMELINE_NOTE), true);
check("the present day's readout says nothing is drawn", /nothing is drawn/.test(wording.paleoReadout(present, present)), true);
check("the statement says what the ice class leaves out", /only what differs from today/.test(wording.PALEO_STATEMENT), true);
check("the readout speaks of the model and names the step", wording.paleoReadout(dryasStep, present), "The model at 10,500 BCE, about 12,500 years ago.");
const everyWord = Object.values(wording).filter((value) => typeof value === "string").join(" ") + index.steps.map((step) => wording.paleoReadout(step, present)).join(" ");
check("no wording gives a sea level in metres", /\d\s*m (below|lower)|−\d+ m|-\d+ m/.test(everyWord), false);
check("the statement says why there is no sea level figure", /no sea level figure, because the source publishes none/.test(wording.PALEO_STATEMENT), true);

console.log(JSON.stringify({ ok: failed === 0, failed, youngerDryasStep: dryasStep.year }));
process.exit(failed === 0 ? 0 : 1);
