// The ice and sea level layer under public/paleo/: one class raster per time step, and which step a year means.
// Rasters share the recording-pattern layer's grid (1440×720, row 0 = 90°N): 1 is land where the sea is today, 2 is ice.

import { isAllTime, type YearSpan } from "@/lib/world/worldEras";

export interface PaleoStep {
  /** First calendar year of the step; negative is BCE. */
  year: number;
  file: string;
}

export interface PaleoSource {
  name: string;
  licence: string;
  citation: string;
  url: string;
}

export interface PaleoIndex {
  generated: string;
  cellDegrees: number;
  /** The source has no data north of this latitude. */
  northLimitDegrees: number;
  /** Oldest first; the last step is the present day. */
  steps: PaleoStep[];
  source: PaleoSource;
}

export const PALEO_BASE_URL = "/paleo/";
export const PALEO_CLASS = { exposedLand: 1, ice: 2 } as const;

const STEP_FILE = /^-?\d+\.png$/;
const SOURCE_KEYS: readonly (keyof PaleoSource)[] = ["name", "licence", "citation", "url"];

function fail(what: string): never {
  throw new Error(`paleo/index.json: ${what}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStep(raw: unknown): PaleoStep {
  if (!isRecord(raw) || !Number.isInteger(raw.year) || typeof raw.file !== "string") fail("a step lacks its year or file");
  if (!STEP_FILE.test(raw.file as string)) fail(`step ${raw.year} has an unsafe file name`);
  return { year: raw.year as number, file: raw.file as string };
}

/** Checks the shape the layer relies on, so a bad file fails loudly instead of drawing something misleading. */
export function parsePaleoIndex(raw: unknown): PaleoIndex {
  if (!isRecord(raw) || typeof raw.generated !== "string" || !Number.isFinite(raw.cellDegrees)) fail("missing generated or cellDegrees");
  if (!Number.isFinite(raw.northLimitDegrees)) fail("missing northLimitDegrees");
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) fail("missing steps");
  const source = raw.source;
  // The layer is never shown without its credit.
  if (!isRecord(source) || !SOURCE_KEYS.every((key) => typeof source[key] === "string" && source[key] !== "")) fail("the source credit is incomplete");
  const steps = raw.steps.map(parseStep);
  if (!steps.every((step, at) => at === 0 || step.year > steps[at - 1].year)) fail("steps are not in order of year");
  return {
    generated: raw.generated,
    cellDegrees: raw.cellDegrees as number,
    northLimitDegrees: raw.northLimitDegrees as number,
    steps,
    source: source as unknown as PaleoSource,
  };
}

/** The year the layer shows for a timeline range: the middle of the range, or the present day for all time (null). */
export function paleoYearForSpan(span: YearSpan): number | null {
  return isAllTime(span) ? null : Math.round((span[0] + span[1]) / 2);
}

/** The step nearest a year; null (the present day) gives the last step. A tie goes to the later step. */
export function nearestPaleoStep(steps: readonly PaleoStep[], year: number | null): PaleoStep {
  const present = steps[steps.length - 1];
  if (year === null) return present;
  return steps.reduce((best, step) => (Math.abs(step.year - year) <= Math.abs(best.year - year) ? step : best), steps[0]);
}

let pendingIndex: Promise<PaleoIndex> | null = null;

/** Fetched once per page; a failure is not cached, so a later call retries. */
export function loadPaleoIndex(): Promise<PaleoIndex> {
  pendingIndex ??= fetch(`${PALEO_BASE_URL}index.json`)
    .then((response) => (response.ok ? response.json() : fail(`HTTP ${response.status}`)))
    .then(parsePaleoIndex)
    .catch((error) => {
      pendingIndex = null;
      throw error;
    });
  return pendingIndex;
}
