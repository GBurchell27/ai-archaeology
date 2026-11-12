/** Published atlas range: 12000 BCE through 1923 CE. */
export const RANGE_START = -12_000;
export const RANGE_END = 1923;
/** Keyboard step for Arrow keys. PageUp and PageDown move this many years. */
export const KEY_STEP = 1;
export const PAGE_STEP = 10;

/**
 * Latest year of each period chip. A pin with a start and no end runs to the
 * latest of these that it names. The numbers match the chips in periods.ts.
 */
const PERIOD_END: Record<string, number> = {
  neolithic: -6000,
  bronze: -330,
  classical: 1095,
  crusader: 1522,
};

/**
 * Piecewise track. The long prehistoric stretches keep most of the bar.
 * Later eras get a wider share than a linear scale would give them, so a
 * short period such as the Crusader era is still a visible span.
 */
export const TIMELINE_STOPS: readonly { year: number; at: number }[] = [
  { year: RANGE_START, at: 0 },
  { year: -9600, at: 0.16 },
  { year: -6000, at: 0.4 },
  { year: -3200, at: 0.58 },
  { year: -330, at: 0.74 },
  { year: 1096, at: 0.84 },
  { year: 1522, at: 0.92 },
  { year: RANGE_END, at: 1 },
];

export interface YearRange {
  start: number;
  end: number;
}

export function yearToTrack(year: number): number {
  const stops = TIMELINE_STOPS;
  if (year <= stops[0].year) return stops[0].at;
  const last = stops[stops.length - 1];
  if (year >= last.year) return last.at;
  for (let index = 1; index < stops.length; index += 1) {
    const right = stops[index];
    const left = stops[index - 1];
    if (year > right.year) continue;
    const span = right.year - left.year;
    const portion = span === 0 ? 0 : (year - left.year) / span;
    return left.at + portion * (right.at - left.at);
  }
  return last.at;
}

export function trackToYear(track: number): number {
  const t = Math.min(1, Math.max(0, track));
  const stops = TIMELINE_STOPS;
  for (let index = 1; index < stops.length; index += 1) {
    const right = stops[index];
    const left = stops[index - 1];
    if (t > right.at) continue;
    const span = right.at - left.at;
    const portion = span === 0 ? 0 : (t - left.at) / span;
    return left.year + portion * (right.year - left.year);
  }
  return stops[stops.length - 1].year;
}

/** Round to a historical year. 1 BCE and 1 CE are adjacent, so 0 is not a year. */
export function historicalYear(year: number): number {
  if (!Number.isFinite(year)) return RANGE_START;
  const rounded = Math.round(year);
  if (rounded !== 0) return rounded;
  return year < 0 ? -1 : 1;
}

export function clampYear(year: number): number {
  return Math.min(RANGE_END, Math.max(RANGE_START, historicalYear(year)));
}

/** Move by whole historical years, skipping the missing year 0. */
export function stepYear(year: number, delta: number): number {
  const direction = delta < 0 ? -1 : 1;
  let next = historicalYear(year);
  let remaining = Math.abs(Math.round(delta));
  while (remaining > 0) {
    next += direction;
    if (next === 0) next += direction;
    remaining -= 1;
  }
  return clampYear(next);
}

export function normalizeRange(range: YearRange): YearRange {
  const start = clampYear(Math.min(range.start, range.end));
  const end = clampYear(Math.max(range.start, range.end));
  return { start, end };
}

/** A Wikidata inception after this year is not an occupation date. */
export const ADMINISTRATIVE_YEAR = 1900;

export interface DatedSpan {
  startYear: number | null;
  endYear: number | null;
  /** Period chip ids. Used only when the end year is missing. */
  periods?: readonly string[];
  source?: string;
  types?: readonly string[];
  periodLabels?: readonly string[];
}

/** Ancient or historical tags. A modern museum or show cave alone does not qualify. */
export function taggedAncientOrHistorical(tags: readonly string[] | undefined): boolean {
  if (!tags || tags.length === 0) return false;
  return tags.some((tag) => /ancient|historic|archaeolog|\bpolis\b|\bruins?\b/i.test(tag));
}

/**
 * Wikidata inception after 1900 on an ancient or historical place is a modern
 * administrative date (a titular see, a museum opening, a heritage listing).
 * It is not an occupation span. A Pleiades or curated span is kept: those
 * sources are not Wikidata-derived.
 */
export function isDroppedAdministrativeSpan(span: DatedSpan): boolean {
  if (span.source !== "Wikidata") return false;
  const start = span.startYear ?? span.endYear;
  if (start == null || start <= ADMINISTRATIVE_YEAR) return false;
  const tags = [...(span.types ?? []), ...(span.periodLabels ?? [])];
  return taggedAncientOrHistorical(tags);
}

/**
 * Closed span for a pin, or null when both years are missing.
 *
 * A missing end year runs to the end of the latest named period that still
 * reaches the known start (the Anastasian Wall starts in 460 and is tagged
 * classical and crusader, so it runs to 1522). With no such period it is the
 * single known year (Hoşap Castle, 1643).
 *
 * A Wikidata span that starts after 1900 on an ancient or historical place is
 * dropped. If that place has a Pleiades or curated span, the stored years are
 * that span and this rule leaves them alone.
 */
export function datedSpan(span: DatedSpan): [number, number] | null {
  if (span.startYear == null && span.endYear == null) return null;
  if (isDroppedAdministrativeSpan(span)) return null;
  let start = span.startYear ?? span.endYear as number;
  let end = span.endYear ?? span.startYear as number;
  if (span.endYear == null && span.startYear != null) {
    end = periodEndAfter(span.periods, span.startYear) ?? span.startYear;
  }
  if (end < start) {
    const swap = start;
    start = end;
    end = swap;
  }
  return [start, end];
}

function periodEndAfter(periods: readonly string[] | undefined, startYear: number): number | null {
  if (!periods || periods.length === 0) return null;
  let latest: number | null = null;
  for (const id of periods) {
    const end = PERIOD_END[id];
    if (end == null || end < startYear) continue;
    if (latest == null || end > latest) latest = end;
  }
  return latest;
}

export function isUndatedSpan(span: DatedSpan): boolean {
  return datedSpan(span) == null;
}

export function spansOverlap(spanStart: number, spanEnd: number, range: YearRange): boolean {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  return spanEnd >= start && spanStart <= end;
}

export function spanInRange(span: DatedSpan, range: YearRange, showUndated: boolean): boolean {
  const dated = datedSpan(span);
  if (!dated) return showUndated;
  return spansOverlap(dated[0], dated[1], range);
}

export function pinsInRange<T extends { properties: DatedSpan }>(
  pins: readonly T[],
  range: YearRange,
  showUndated: boolean,
): T[] {
  return pins.filter((pin) => spanInRange(pin.properties, range, showUndated));
}

/** Period chips are presets. All periods is the whole slider, not a later end year. */
export function rangeForChip(chip: { id: string; start: number; end: number }): YearRange {
  if (chip.id === "all") return { start: RANGE_START, end: RANGE_END };
  return normalizeRange({ start: chip.start, end: chip.end });
}

export function activeChip(
  range: YearRange,
  chips: readonly { id: string; start: number; end: number }[],
): string {
  const normalized = normalizeRange(range);
  for (const chip of chips) {
    const preset = rangeForChip(chip);
    if (preset.start === normalized.start && preset.end === normalized.end) return chip.id;
  }
  return "";
}

/** Move the window forward along the track. A point range stays a point. */
export function nextPlayRange(range: YearRange): YearRange | null {
  const current = normalizeRange(range);
  if (current.start >= RANGE_END && current.end >= RANGE_END) return null;
  const point = current.start === current.end;
  const span = point ? 0 : yearToTrack(current.end) - yearToTrack(current.start);
  const nextStartT = Math.min(1, yearToTrack(current.start) + 0.04);
  let nextEndT = Math.min(1, nextStartT + span);
  let nextStartTrack = nextStartT;
  if (!point && nextEndT >= 1) {
    nextEndT = 1;
    nextStartTrack = Math.max(0, 1 - span);
  }
  let next = normalizeRange({
    start: trackToYear(nextStartTrack),
    end: trackToYear(point ? nextStartTrack : nextEndT),
  });
  if (point) next = { start: next.end, end: next.end };
  if (next.start === current.start && next.end === current.end) {
    const end = stepYear(current.end, KEY_STEP);
    const start = point ? end : Math.min(end, stepYear(current.start, KEY_STEP));
    next = { start, end };
  }
  if (next.start === current.start && next.end === current.end) return null;
  return next;
}
