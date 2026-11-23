// The playhead that sweeps a chosen year range. The clock and the React state live in useHistoryPlayback.
// Progress is a fraction of the track, not a year, so a scale that snaps to centuries cannot stall the sweep.

import { formatYear } from "@/lib/periods";

export const PLAY_SPEEDS = [1, 2, 4] as const;
export type PlaySpeed = (typeof PLAY_SPEEDS)[number];

/** Seconds for the playhead to cross the whole track at 1x. */
export const FULL_SWEEP_SECONDS = 24;

/** Shortest gap between site-filter commits while the playhead moves. */
export const FILTER_COMMIT_MS = 160;

/** Gap between jumps when the visitor prefers reduced motion. */
export const REDUCED_MOTION_COMMIT_MS = 800;

/** One date band's share of a six-band track. Reduced motion jumps by this, times the speed. */
export const REDUCED_MOTION_TRACK_STEP = 1 / 6;

/** Filter commits use this year grain, so a sweep does not walk every calendar year. */
export const PLAYHEAD_YEAR_STEP = 100;

export interface YearWindow {
  start: number;
  end: number;
}

export interface TrackScale {
  yearToTrack(year: number): number;
  trackToYear(track: number): number;
}

/** Move the playhead toward `endTrack`. `done` means it has arrived. */
export function stepTrack(input: {
  track: number;
  startTrack: number;
  endTrack: number;
  elapsedSeconds: number;
  speed: PlaySpeed;
  reducedMotion: boolean;
}): { track: number; done: boolean } {
  const start = Math.min(input.startTrack, input.endTrack);
  const end = Math.max(input.startTrack, input.endTrack);
  const current = Math.min(end, Math.max(start, input.track));
  if (current >= end) return { track: end, done: true };
  const delta = trackDelta(input.elapsedSeconds, input.speed, input.reducedMotion);
  const track = Math.min(end, current + delta);
  return { track, done: track >= end };
}

function trackDelta(elapsedSeconds: number, speed: PlaySpeed, reducedMotion: boolean): number {
  if (reducedMotion) return REDUCED_MOTION_TRACK_STEP * speed;
  return (Math.max(0, elapsedSeconds) * speed) / FULL_SWEEP_SECONDS;
}

export function quantizePlayYear(year: number, step: number): number {
  if (!Number.isFinite(year) || step <= 0) return year;
  return Math.round(year / step) * step;
}

/** True when a filter commit would show a different set of years. */
export function filterYearChanged(previous: number | null, next: number, step: number): boolean {
  if (previous === null) return true;
  return quantizePlayYear(previous, step) !== quantizePlayYear(next, step);
}

/** A label year. There is no year 0, and a fraction is not shown. */
export function displayedYear(year: number): number {
  if (!Number.isFinite(year)) return year;
  const rounded = Math.round(year);
  if (rounded !== 0) return rounded;
  return year < 0 ? -1 : 1;
}

export function describePlayhead(year: number, eraLabel: string | null): string {
  const label = formatYear(displayedYear(year));
  return eraLabel ? `${label} · ${eraLabel}` : label;
}

/** The end year sites are revealed up to, or null when the whole chosen range should show. */
export function revealedEnd(bounds: YearWindow, playYear: number | null): number | null {
  if (playYear === null) return null;
  const start = Math.min(bounds.start, bounds.end);
  const end = Math.max(bounds.start, bounds.end);
  if (playYear >= end) return null;
  return Math.max(start, Math.min(end, playYear));
}

export function rangeWithRevealedEnd(bounds: YearWindow, playYear: number | null): YearWindow {
  const start = Math.min(bounds.start, bounds.end);
  const end = Math.max(bounds.start, bounds.end);
  const revealed = revealedEnd(bounds, playYear);
  return { start, end: revealed ?? end };
}

export function clampWindowYear(bounds: YearWindow, year: number): number {
  const start = Math.min(bounds.start, bounds.end);
  const end = Math.max(bounds.start, bounds.end);
  if (!Number.isFinite(year)) return start;
  return Math.min(end, Math.max(start, year));
}
