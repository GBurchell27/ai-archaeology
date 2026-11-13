import type { TimedSegment, Trip, TripPlace, TripSegment } from "@/lib/trip/tripTypes";

const HOUR_MS = 3_600_000;

export interface TripSpan {
  startMs: number;
  endMs: number;
}

export interface TripLocation {
  timed: TimedSegment;
  /** 0 at the start of the segment, 1 at its end. */
  progress: number;
}

export interface DayMark {
  ms: number;
  label: string;
}

export function timeSegments(trip: Trip): TimedSegment[] {
  return trip.segments.map((segment, index) => ({
    index,
    segment,
    startMs: Date.parse(segment.starts),
    endMs: Date.parse(segment.ends),
  }));
}

export function tripSpan(timed: TimedSegment[]): TripSpan {
  return { startMs: timed[0].startMs, endMs: timed[timed.length - 1].endMs };
}

export function clampToSpan(span: TripSpan, timeMs: number): number {
  return Math.min(span.endMs, Math.max(span.startMs, timeMs));
}

/** The segment under `timeMs`. Segments are contiguous, so a binary search on start times is enough. */
export function locateSegment(timed: TimedSegment[], timeMs: number): TripLocation {
  let low = 0;
  let high = timed.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (timed[middle].startMs <= timeMs) low = middle;
    else high = middle - 1;
  }
  const found = timed[low];
  const length = found.endMs - found.startMs;
  const progress = length <= 0 ? 1 : (timeMs - found.startMs) / length;
  return { timed: found, progress: Math.min(1, Math.max(0, progress)) };
}

/** Start of the next segment, or of the current one when stepping back from inside it. */
export function adjacentBoundary(timed: TimedSegment[], timeMs: number, direction: 1 | -1): number {
  if (direction === 1) {
    const next = timed.find((item) => item.startMs > timeMs);
    return next ? next.startMs : timed[timed.length - 1].endMs;
  }
  const previous = [...timed].reverse().find((item) => item.startMs < timeMs);
  return previous ? previous.startMs : timed[0].startMs;
}

/** The first moment of each local day in the span, labelled like "Wed 15". The first mark is the trip start. */
export function dayMarks(span: TripSpan, timeZone: string): DayMark[] {
  const dayKey = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const label = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric" });
  const marks: DayMark[] = [{ ms: span.startMs, label: label.format(span.startMs) }];
  let previousKey = dayKey.format(span.startMs);
  for (let hour = Math.floor(span.startMs / HOUR_MS) + 1; hour * HOUR_MS <= span.endMs; hour += 1) {
    const ms = hour * HOUR_MS;
    const key = dayKey.format(ms);
    if (key === previousKey) continue;
    previousKey = key;
    marks.push({ ms, label: label.format(ms) });
  }
  return marks;
}

/** Gaps, overlaps and backwards segments. Empty when the trip is a clean timeline. */
export function timelineProblems(timed: TimedSegment[]): string[] {
  const problems: string[] = [];
  timed.forEach((item, position) => {
    if (!Number.isFinite(item.startMs) || !Number.isFinite(item.endMs)) problems.push(`${item.segment.title}: unreadable time`);
    if (item.endMs < item.startMs) problems.push(`${item.segment.title}: ends before it starts`);
    const next = timed[position + 1];
    if (next && next.startMs !== item.endMs) problems.push(`${item.segment.title} → ${next.segment.title}: not contiguous`);
    if (next && endPlace(item.segment) !== startPlace(next.segment)) {
      problems.push(`${item.segment.title} → ${next.segment.title}: does not start where the last one ended`);
    }
  });
  return problems;
}

export function startPlace(segment: TripSegment): TripPlace {
  return segment.kind === "travel" ? segment.from : segment.place;
}

export function endPlace(segment: TripSegment): TripPlace {
  return segment.kind === "travel" ? segment.to : segment.place;
}
