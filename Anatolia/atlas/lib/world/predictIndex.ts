// The recording-pattern ("suitability") layers under public/predict/: Contract 4.
// Each layer is a 1440×720 greyscale raster of decile ranks plus the numbers that say how far to trust it.

export type PredictSiteClass = "any" | "settlement" | "monument" | "funerary";
export type PredictPeriod = "early-holocene" | "mid-holocene" | "late-holocene" | "all";

export const PREDICT_SITE_CLASSES: readonly PredictSiteClass[] = ["monument", "settlement", "funerary", "any"];
export const PREDICT_PERIODS: readonly PredictPeriod[] = ["early-holocene", "mid-holocene", "late-holocene", "all"];

export interface PredictMetrics {
  boyce: number;
  gainTop10: number;
  gainTop20: number;
  auc: number;
  effortNullAuc: number;
  folds: number;
}

export interface PredictLayer {
  id: string;
  file: string;
  title: string;
  siteClass: PredictSiteClass;
  period: PredictPeriod;
  /** Cells that hold a published site of this kind and period. */
  presences: number;
  metrics: PredictMetrics;
  caveats: string[];
}

export interface PredictLicence {
  name: string;
  licence: string;
  attribution: string;
}

export interface PredictIndex {
  generated: string;
  cellDegrees: number;
  layers: PredictLayer[];
  /** Combinations the model refused to publish, with the reason. */
  skipped: { id: string; reason: string }[];
  licences: PredictLicence[];
}

/** Fold-to-fold AUC varies by more than this. Same margin as NOISE_MARGIN in suitability/caveats.py. */
export const EFFORT_NOISE_MARGIN = 0.02;

/** True only when held-out AUC clears the survey-effort null by the noise margin (caveats.py: effort_caveat). */
export function beatsEffortBaseline(metrics: Pick<PredictMetrics, "auc" | "effortNullAuc">): boolean {
  return metrics.auc >= metrics.effortNullAuc + EFFORT_NOISE_MARGIN;
}

const LAYER_ID = /^[a-z]+_[a-z]+(?:-[a-z]+)*$/;
const LAYER_FILE = /^[a-z]+_[a-z]+(?:-[a-z]+)*\.png$/;
const METRIC_KEYS: readonly (keyof PredictMetrics)[] = ["boyce", "gainTop10", "gainTop20", "auc", "effortNullAuc", "folds"];

export function isPredictLayerId(value: string): boolean {
  return LAYER_ID.test(value);
}

function fail(what: string): never {
  throw new Error(`predict/index.json: ${what}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function allStrings(record: unknown, keys: readonly string[]): boolean {
  return isRecord(record) && keys.every((key) => typeof record[key] === "string");
}

function parseLayer(raw: unknown): PredictLayer {
  if (!isRecord(raw) || !allStrings(raw, ["id", "file", "title"])) fail("a layer lacks id, file or title");
  const id = raw.id as string;
  if (!LAYER_ID.test(id) || !LAYER_FILE.test(raw.file as string)) fail(`layer ${id} has an unsafe id or file name`);
  if (!PREDICT_SITE_CLASSES.includes(raw.siteClass as PredictSiteClass)) fail(`layer ${id} has an unknown siteClass`);
  if (!PREDICT_PERIODS.includes(raw.period as PredictPeriod)) fail(`layer ${id} has an unknown period`);
  const metrics = raw.metrics;
  if (!isRecord(metrics) || !METRIC_KEYS.every((key) => Number.isFinite(metrics[key]))) fail(`layer ${id} has incomplete metrics`);
  const caveats = raw.caveats;
  // Contract 4: a layer is never shown without its caveats.
  if (!Array.isArray(caveats) || caveats.length === 0 || !caveats.every((text) => typeof text === "string")) fail(`layer ${id} has no caveats`);
  if (!Number.isFinite(raw.presences)) fail(`layer ${id} has no presence count`);
  return raw as unknown as PredictLayer;
}

/** Checks the shape the UI relies on, so a bad file fails loudly instead of drawing something misleading. */
export function parsePredictIndex(raw: unknown): PredictIndex {
  if (!isRecord(raw) || typeof raw.generated !== "string" || !Number.isFinite(raw.cellDegrees)) fail("missing generated or cellDegrees");
  if (!Array.isArray(raw.layers)) fail("missing layers");
  const skipped = Array.isArray(raw.skipped) ? raw.skipped : [];
  const licences = Array.isArray(raw.licences) ? raw.licences : [];
  if (!skipped.every((entry) => allStrings(entry, ["id", "reason"]))) fail("a skipped entry lacks id or reason");
  if (!licences.every((entry) => allStrings(entry, ["name", "licence", "attribution"]))) fail("a licence entry is incomplete");
  return {
    generated: raw.generated,
    cellDegrees: raw.cellDegrees as number,
    layers: raw.layers.map(parseLayer),
    skipped: skipped as PredictIndex["skipped"],
    licences: licences as PredictLicence[],
  };
}

export const PREDICT_BASE_URL = "/predict/";

let pendingIndex: Promise<PredictIndex> | null = null;

/** Fetched once per page; a failure is not cached, so a later call retries. */
export function loadPredictIndex(): Promise<PredictIndex> {
  pendingIndex ??= fetch(`${PREDICT_BASE_URL}index.json`)
    .then((response) => (response.ok ? response.json() : fail(`HTTP ${response.status}`)))
    .then(parsePredictIndex)
    .catch((error) => {
      pendingIndex = null;
      throw error;
    });
  return pendingIndex;
}
