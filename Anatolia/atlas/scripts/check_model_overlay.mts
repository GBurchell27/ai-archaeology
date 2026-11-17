import { readFileSync } from "node:fs";
import { MODEL_RAMP, oklabLightness } from "../components/globe/model/modelRamp.ts";
import { RASTER_COLUMNS, RASTER_ROWS, coarseLayerFade, rasterCell, rasterUv } from "../components/globe/model/modelRaster.ts";
import { beatsEffortBaseline, isPredictLayerId, parsePredictIndex } from "../lib/world/predictIndex.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

function throws(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch {
    return true;
  }
}

// The ramp: ten steps, lightness strictly rising with clear steps, so order survives colour-blindness and greyscale.
const lightness = MODEL_RAMP.map(oklabLightness);
check("the ramp has ten steps, one per decile", MODEL_RAMP.length === 10);
check("ramp lightness rises at every step by a visible amount", lightness.every((value, step) => step === 0 || value - lightness[step - 1] > 0.03));
check("the ramp spans dark to light", lightness[0] < 0.35 && lightness[9] > 0.9);
check("every ramp colour is cool: blue is never below red", MODEL_RAMP.every((hex) => Number.parseInt(hex.slice(5, 7), 16) > Number.parseInt(hex.slice(1, 3), 16)));

// The shipped index parses to the declared types, and every layer is safe to show.
const rawIndex: unknown = JSON.parse(readFileSync(new URL("../public/predict/index.json", import.meta.url), "utf8"));
const index = parsePredictIndex(rawIndex);
check("the cells are 0.25 degrees, matching the raster size", index.cellDegrees === 360 / RASTER_COLUMNS && index.cellDegrees === 180 / RASTER_ROWS);
check("layer ids are unique and match class_period", new Set(index.layers.map((layer) => layer.id)).size === index.layers.length
  && index.layers.every((layer) => layer.id === `${layer.siteClass}_${layer.period}` && layer.file === `${layer.id}.png`));
check("no title claims a prediction or a discovery", index.layers.every((layer) => /^Where published .+ tend to be recorded$/.test(layer.title)
  && !/predict|discover/i.test(layer.title)));
check("every layer says it is not a map of undiscovered sites", index.layers.every((layer) => layer.caveats.some((text) => text.includes("not a map of undiscovered sites"))));
check("skipped entries carry a reason", index.skipped.every((entry) => isPredictLayerId(entry.id) && entry.reason.length > 0));
check("licences are listed", index.licences.length > 0);

const sample = { id: "any_all", file: "any_all.png", title: "t", siteClass: "any", period: "all", presences: 1, caveats: ["c"],
  metrics: { boyce: 0, gainTop10: 0, gainTop20: 0, auc: 0.5, effortNullAuc: 0.5, folds: 5 } };
const wrap = (layer: object) => ({ generated: "2026-01-01", cellDegrees: 0.25, layers: [layer] });
check("a well-formed layer parses", parsePredictIndex(wrap(sample)).layers.length === 1);
check("a layer without caveats is refused", throws(() => parsePredictIndex(wrap({ ...sample, caveats: [] }))));
check("a file name that leaves the folder is refused", throws(() => parsePredictIndex(wrap({ ...sample, file: "../world/core.json" }))));
check("an unknown period is refused", throws(() => parsePredictIndex(wrap({ ...sample, period: "iron-age" }))));
check("missing metrics are refused", throws(() => parsePredictIndex(wrap({ ...sample, metrics: { auc: 0.7 } }))));

// The honesty badge: same ±0.02 rule as suitability/caveats.py, and exactly three layers pass in the shipped index.
check("0.02 above the effort null beats it", beatsEffortBaseline({ auc: 0.72, effortNullAuc: 0.7 }));
check("0.019 above is a tie", !beatsEffortBaseline({ auc: 0.719, effortNullAuc: 0.7 }));
check("below the null does not beat it", !beatsEffortBaseline({ auc: 0.71, effortNullAuc: 0.75 }));
const beating = index.layers.filter((layer) => beatsEffortBaseline(layer.metrics)).map((layer) => layer.id).sort();
check(`exactly three shipped layers beat the baseline (got ${beating.join(", ")})`,
  beating.join() === ["any_mid-holocene", "funerary_all", "funerary_late-holocene"].join());
check("the badge agrees with each layer's own first caveat", index.layers.every((layer) =>
  beatsEffortBaseline(layer.metrics) === layer.caveats[0].includes("add something beyond survey effort")));

// Raster orientation: row 0 = 90°N, column 0 = 180°W; texture v runs north (three's default flipY).
const near = (a: number, b: number) => Math.abs(a - b) < 1e-12;
const cellIs = (longitude: number, latitude: number, column: number, row: number) => {
  const cell = rasterCell(longitude, latitude);
  return cell.column === column && cell.row === row;
};
check("180°W 90°N is the first cell", cellIs(-180, 90, 0, 0));
check("the far corner clamps to the last cell", cellIs(180, -90, RASTER_COLUMNS - 1, RASTER_ROWS - 1));
check("0°E 0°N is the cell south-east of the raster centre", cellIs(0, 0, 720, 360));
check("Rome (12.5°E 41.9°N) is east of centre and in the northern half", cellIs(12.5, 41.9, 770, 192));
check("Sydney (151.2°E 33.9°S) is far east and in the southern half", cellIs(151.2, -33.9, 1324, 495));
check("Lima (77.0°W 12.0°S) is west of centre", cellIs(-77.04, -12.05, 411, 408));
check("u runs east from 180°W", near(rasterUv(-180, 0)[0], 0) && near(rasterUv(0, 0)[0], 0.5) && rasterUv(90, 0)[0] > rasterUv(-90, 0)[0]);
check("v runs north from the south pole", near(rasterUv(0, -90)[1], 0) && near(rasterUv(0, 90)[1], 1));

// Too coarse to zoom into: gone before a cell fills an eighth of the view, whole from regional distance up.
check("the layer is whole at 3,000 km", coarseLayerFade(3_000_000, 45) === 1);
check("the layer is gone at 250 km", coarseLayerFade(250_000, 45) === 0);
check("the fade is monotonic", [300, 350, 400, 450, 500].every((km) => coarseLayerFade(km * 1000, 45) <= coarseLayerFade((km + 50) * 1000, 45)));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, beatsBaseline: beating }));
