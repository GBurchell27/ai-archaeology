/** Published atlas range: 12000 BCE through 1923 CE. */
export const RANGE_START = -12_000;
export const RANGE_END = 1923;

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

export interface DatedSpan {
  startYear: number | null;
  endYear: number | null;
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

export function clampYear(year: number): number {
  return Math.min(RANGE_END, Math.max(RANGE_START, Math.round(year)));
}

export function normalizeRange(range: YearRange): YearRange {
  const start = clampYear(Math.min(range.start, range.end));
  const end = clampYear(Math.max(range.start, range.end));
  return { start, end };
}

/** Closed spans overlap. A missing bound is not a span. */
export function datedSpan(span: DatedSpan): [number, number] | null {
  if (span.startYear == null && span.endYear == null) return null;
  if (span.startYear == null) return [span.endYear as number, span.endYear as number];
  if (span.endYear == null) return [span.startYear, span.startYear];
  return [Math.min(span.startYear, span.endYear), Math.max(span.startYear, span.endYear)];
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
    const end = Math.min(RANGE_END, current.end + 1);
    const start = point ? end : Math.min(end, current.start + 1);
    next = { start, end };
  }
  if (next.start === current.start && next.end === current.end) return null;
  return next;
}
