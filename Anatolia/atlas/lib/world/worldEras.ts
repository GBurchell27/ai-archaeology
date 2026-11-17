// The globe's time filter: absolute calendar years, the same everywhere on Earth.
// Regional period names (Neolithic, Bronze Age…) start at different dates on different continents, so none are used here.

import { formatYear } from "@/lib/periods";
import type { SiteFilter } from "./siteFilter";

export type YearSpan = [start: number, end: number];

export const WORLD_RANGE_START = -12_000;
export const WORLD_RANGE_END = 1500;
export const WORLD_YEAR_STEP = 100;
export const WORLD_YEAR_PAGE = 1000;
export const ALL_TIME: YearSpan = [WORLD_RANGE_START, WORLD_RANGE_END];

export interface WorldEra {
  id: string;
  label: string;
  span: YearSpan;
}

/** Each era takes an equal share of the slider, so the chips sit under their own stretch of track. */
export const WORLD_ERAS: readonly WorldEra[] = [
  { id: "before-9000", label: "Before 9000 BCE", span: [WORLD_RANGE_START, -9000] },
  { id: "9000-5000", label: "9000–5000 BCE", span: [-9000, -5000] },
  { id: "5000-3000", label: "5000–3000 BCE", span: [-5000, -3000] },
  { id: "3000-1000", label: "3000–1000 BCE", span: [-3000, -1000] },
  { id: "1000-500", label: "1000 BCE–500 CE", span: [-1000, 500] },
  { id: "after-500", label: "After 500 CE", span: [500, WORLD_RANGE_END] },
];

const ERA_SHARE = 1 / WORLD_ERAS.length;

export function isAllTime(span: YearSpan): boolean {
  return span[0] <= WORLD_RANGE_START && span[1] >= WORLD_RANGE_END;
}

export function clampWorldYear(year: number): number {
  const stepped = Math.round(year / WORLD_YEAR_STEP) * WORLD_YEAR_STEP;
  return Math.min(WORLD_RANGE_END, Math.max(WORLD_RANGE_START, stepped));
}

/** 0–1 position of a year along the slider. */
export function worldYearToTrack(year: number): number {
  if (year <= WORLD_RANGE_START) return 0;
  if (year >= WORLD_RANGE_END) return 1;
  const eraIndex = WORLD_ERAS.findIndex((era) => year <= era.span[1]);
  const [start, end] = WORLD_ERAS[eraIndex].span;
  return (eraIndex + (year - start) / (end - start)) * ERA_SHARE;
}

export function trackToWorldYear(track: number): number {
  const position = Math.min(1, Math.max(0, track)) / ERA_SHARE;
  const eraIndex = Math.min(WORLD_ERAS.length - 1, Math.floor(position));
  const [start, end] = WORLD_ERAS[eraIndex].span;
  return clampWorldYear(start + (position - eraIndex) * (end - start));
}

export function activeWorldEra(span: YearSpan): WorldEra | null {
  return WORLD_ERAS.find((era) => era.span[0] === span[0] && era.span[1] === span[1]) ?? null;
}

/** The era a single year falls in; the slider's two ends are open, so anything older or younger still lands in one. */
export function eraOfYear(year: number): WorldEra {
  return WORLD_ERAS.find((era) => year < era.span[1]) ?? WORLD_ERAS[WORLD_ERAS.length - 1];
}

export function describeSpan(span: YearSpan): string {
  if (isAllTime(span)) return "All time";
  if (span[0] <= WORLD_RANGE_START) return `Before ${formatYear(span[1])}`;
  if (span[1] >= WORLD_RANGE_END) return `After ${formatYear(span[0])}`;
  return describeClosedSpan(span[0], span[1]);
}

/**
 * The slider's ends are open: 12,000 BCE means "and earlier", 1500 CE means "and later",
 * so Ice Age cave art and recent monuments are never silently dropped at the edges.
 */
export function filterRangeFor(span: YearSpan, showUndated: boolean): SiteFilter["range"] {
  if (isAllTime(span)) return showUndated ? null : [-Infinity, Infinity];
  return [
    span[0] <= WORLD_RANGE_START ? -Infinity : span[0],
    span[1] >= WORLD_RANGE_END ? Infinity : span[1],
  ];
}

/** "9500–8000 BCE", "300 BCE – 400 CE", "about 2600 BCE", or null when nothing is dated. */
export function formatSiteDates(startYear: number | null, endYear: number | null): string | null {
  if (startYear === null && endYear === null) return null;
  const dates = startYear === null || endYear === null || startYear === endYear
    ? `about ${formatYear((startYear ?? endYear)!)}`
    : describeClosedSpan(startYear, endYear);
  // Deep-time dates read better grouped: 476,000 rather than 476000.
  return dates.replace(/\d{5,}/g, (digits) => Number(digits).toLocaleString("en-GB"));
}

function describeClosedSpan(startYear: number, endYear: number): string {
  const sameSide = (startYear < 0) === (endYear < 0);
  return sameSide ? `${Math.abs(startYear)}–${formatYear(endYear)}` : `${formatYear(startYear)} – ${formatYear(endYear)}`;
}
