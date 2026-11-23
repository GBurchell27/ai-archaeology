// The settings panel's pure part: the fixed section list and what each preset sets.
import { readFileSync } from "node:fs";
import { register } from "node:module";

// The library files import each other through the "@/" alias; teach Node where that points.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    return next(specifier.startsWith("@/") ? root + specifier.slice(2) + ".ts" : specifier, context);
  }
`)}`);

const { SETTINGS_SECTIONS } = await import("../lib/settings/settingsSections.ts");
const {
  ATLAS_DEEP_PAST_END, ATLAS_PRESETS, DEFAULT_SHOW_UNDATED, GLOBE_DEEP_PAST_END, GLOBE_PRESETS, SETTINGS_PRESETS, activeAtlasPreset, activeGlobePreset, hiddenTypesFor,
} = await import("../lib/settings/settingsPresets.ts");
const { ALL_TIME, WORLD_ERAS, activeWorldEra, describeSpan, filterRangeFor } = await import("../lib/world/worldEras.ts");
const { YOUNGER_DRYAS } = await import("../lib/world/namedPeriods.ts");
const { SITE_TYPE_STYLE } = await import("../lib/world/siteTypeStyle.ts");
const { RANGE_END, RANGE_START, TIMELINE_STOPS } = await import("../lib/timeline.ts");
const { PERIODS } = await import("../lib/periods.ts");

let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  failed += 1;
  console.error("FAIL", label, JSON.stringify(actual), "expected", JSON.stringify(expected));
}

const siteTypes: string[] = JSON.parse(readFileSync(new URL("../public/world/index.json", import.meta.url), "utf8")).siteTypes;
const NONE: ReadonlySet<string> = new Set();
const everythingState = { yearSpan: ALL_TIME, showUndated: true, featuredOnly: false, hiddenTypes: NONE, osmMegaliths: false };
const startingState = { ...everythingState, showUndated: DEFAULT_SHOW_UNDATED };

check("the sections, in the order every view shows them", SETTINGS_SECTIONS.map((section) => section.id), ["layers", "timeline", "base-map", "theme", "labels", "walk"]);
check("every section has a title and a line for a view without it", SETTINGS_SECTIONS.every((section) => section.title.length > 0 && section.elsewhere.endsWith(".")), true);
check("the walk line says where walk options apply", SETTINGS_SECTIONS.find((section) => section.id === "walk")?.elsewhere, "Walk options apply inside a site walk.");
check("the presets, reset first", SETTINGS_PRESETS.map((preset) => preset.id), ["everything", "deep-past", "megaliths-only"]);
check("the globe has every preset", Object.keys(GLOBE_PRESETS).sort(), SETTINGS_PRESETS.map((preset) => preset.id).sort());

check("a new visit leaves undated sites out", DEFAULT_SHOW_UNDATED, false);
check("that visit lights no globe preset", activeGlobePreset(startingState, siteTypes), null);
check("Everything is all time with undated sites included", activeGlobePreset(everythingState, siteTypes), "everything");
check("Everything filters nothing", filterRangeFor(GLOBE_PRESETS.everything.yearSpan, GLOBE_PRESETS.everything.showUndated), null);
const datedDefault = filterRangeFor(ALL_TIME, DEFAULT_SHOW_UNDATED);
check("all time with undated left out still reaches every dated year", datedDefault?.[0] === -Infinity && datedDefault?.[1] === Infinity, true);
check("that range is still called All time", describeSpan(ALL_TIME), "All time");

const deepPast = GLOBE_PRESETS["deep-past"];
check("the deep past ends where a date band ends", WORLD_ERAS.some((era) => era.span[1] === GLOBE_DEEP_PAST_END), true);
check("the deep past is the first two date bands", deepPast.yearSpan, [WORLD_ERAS[0].span[0], WORLD_ERAS[1].span[1]]);
check("the deep past is open towards the past", filterRangeFor(deepPast.yearSpan, deepPast.showUndated), [null, -5000]);
check("the deep past holds the Younger Dryas", deepPast.yearSpan[0] <= YOUNGER_DRYAS.span[0] && deepPast.yearSpan[1] >= YOUNGER_DRYAS.span[1], true);
check("the deep past is not one band, so no band chip lights", activeWorldEra(deepPast.yearSpan), null);
check("the deep past changes no layer or type", [deepPast.onlyTypes, deepPast.osmMegaliths, deepPast.featuredOnly], [null, false, false]);

const megaliths = GLOBE_PRESETS["megaliths-only"];
check("megaliths only names catalogue site types", megaliths.onlyTypes?.every((siteType) => siteTypes.includes(siteType) && siteType in SITE_TYPE_STYLE), true);
check("megaliths only hides every other type", hiddenTypesFor(megaliths.onlyTypes, siteTypes).length, siteTypes.length - 1);
check("megaliths only keeps all time and the undated", [megaliths.yearSpan, megaliths.showUndated], [ALL_TIME, true]);
check("megaliths only turns the OpenStreetMap megaliths on", megaliths.osmMegaliths, true);
check("every type showing hides none", hiddenTypesFor(null, siteTypes), []);

for (const preset of SETTINGS_PRESETS) {
  const state = GLOBE_PRESETS[preset.id];
  const applied = { ...state, hiddenTypes: new Set(hiddenTypesFor(state.onlyTypes, siteTypes)) };
  check(`applying ${preset.id} on the globe lights it`, activeGlobePreset(applied, siteTypes), preset.id);
  check(`${preset.id} says what it does`, state.summary.endsWith(".") && preset.elsewhere.endsWith("."), true);
}
check("one more hidden type lights no preset", activeGlobePreset({ ...everythingState, hiddenTypes: new Set(["cave"]) }, siteTypes), null);
check("a moved year range lights no preset", activeGlobePreset({ ...everythingState, yearSpan: [-3000, -1000] }, siteTypes), null);
check("the megalith layer alone lights no preset", activeGlobePreset({ ...everythingState, osmMegaliths: true }, siteTypes), null);

const wholeRange = { start: RANGE_START, end: RANGE_END };
check("the Anatolia map has no type filter, so no megaliths preset", Object.keys(ATLAS_PRESETS).sort(), ["deep-past", "everything"]);
check("Everything on the Anatolia map includes undated places", activeAtlasPreset({ range: wholeRange, showUndated: true, everyLayerOn: true }), "everything");
check("a new visit on the Anatolia map lights no preset", activeAtlasPreset({ range: wholeRange, showUndated: DEFAULT_SHOW_UNDATED, everyLayerOn: true }), null);
check("with a place layer off it is not Everything", activeAtlasPreset({ range: wholeRange, showUndated: true, everyLayerOn: false }), null);
check("the Anatolia deep past ends at a stop of its year bar", TIMELINE_STOPS.some((stop) => stop.year === ATLAS_DEEP_PAST_END), true);
check("which is the end of its Neolithic period", PERIODS.find((period) => period.id === "neolithic")?.end, ATLAS_DEEP_PAST_END);
const atlasDeepPast = ATLAS_PRESETS["deep-past"]!;
check("the Anatolia deep past holds the Younger Dryas", atlasDeepPast.range.start <= YOUNGER_DRYAS.span[0] && atlasDeepPast.range.end >= YOUNGER_DRYAS.span[1], true);
check("applying the Anatolia deep past lights it, whatever the layers", activeAtlasPreset({ range: atlasDeepPast.range, showUndated: atlasDeepPast.showUndated, everyLayerOn: false }), "deep-past");
check("a custom Anatolia range lights none", activeAtlasPreset({ range: { start: -3200, end: -330 }, showUndated: true, everyLayerOn: true }), null);

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
