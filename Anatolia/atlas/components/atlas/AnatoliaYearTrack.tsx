"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { HistoryPlayheadMarker } from "@/components/history/HistoryPlayheadMarker";
import { TimelineIntervalBand } from "@/components/TimelineIntervalBand";
import { formatYear } from "@/lib/periods";
import {
  KEY_STEP,
  PAGE_STEP,
  RANGE_END,
  RANGE_START,
  TIMELINE_STOPS,
  clampYear,
  normalizeRange,
  stepYear,
  trackToYear,
  yearToTrack,
  type YearRange,
} from "@/lib/timeline";
import { YOUNGER_DRYAS } from "@/lib/world/namedPeriods";

/** The Anatolia year bar's track: two range thumbs, and the history playhead once a sweep has started. */
export function AnatoliaYearTrack(props: {
  range: YearRange;
  playTrack: number | null;
  playYear: number | null;
  scrubbing: boolean;
  onRange: (range: YearRange) => void;
  onScrub: (year: number) => void;
  onScrubEnd: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | null>(null);
  const rangeRef = useRef(props.range);
  rangeRef.current = props.range;
  const onRangeRef = useRef(props.onRange);
  onRangeRef.current = props.onRange;
  useThumbDrag(trackRef, drag, rangeRef, onRangeRef);

  const startAt = yearToTrack(props.range.start) * 100;
  const endAt = yearToTrack(props.range.end) * 100;
  const playAt = props.playTrack === null ? null : props.playTrack * 100;
  return (
    <div
      className="time-track"
      ref={trackRef}
      data-scrubbing={props.scrubbing ? "true" : "false"}
      onPointerDown={(event) => pressTrack(trackRef.current, props.range, props.onRange, drag, event)}
    >
      {TIMELINE_STOPS.map((stop) => (
        <i key={stop.year} className="time-tick" style={{ left: `${stop.at * 100}%` }} />
      ))}
      <TimelineIntervalBand period={YOUNGER_DRYAS} yearToTrack={yearToTrack} className="time-interval" labelClassName="time-interval-label" />
      <i className="time-fill" style={{ left: `${startAt}%`, width: `${Math.max(0, endAt - startAt)}%` }} />
      {playAt === null ? null : (
        <i className="time-progress" style={{ left: `${startAt}%`, width: `${Math.max(0, playAt - startAt)}%` }} />
      )}
      <YearThumb bound="start" range={props.range} at={startAt} onKey={(event) => moveThumb("start", rangeRef, onRangeRef, event)} onDrag={() => { drag.current = "start"; }} />
      <YearThumb bound="end" range={props.range} at={endAt} onKey={(event) => moveThumb("end", rangeRef, onRangeRef, event)} onDrag={() => { drag.current = "end"; }} />
      {props.playTrack === null || props.playYear === null ? null : (
        <HistoryPlayheadMarker
          track={props.playTrack}
          year={props.playYear}
          min={props.range.start}
          max={props.range.end}
          valueText={formatYear(props.playYear)}
          className="time-playhead"
          onPointerDown={(event) => grabPlayhead(trackRef.current, props.onScrub, event)}
          onPointerMove={(event) => movePlayhead(trackRef.current, props.onScrub, event)}
          onPointerUp={props.onScrubEnd}
          onKeyDown={(event) => keyPlayhead(props.playYear ?? props.range.start, props.range, props.onScrub, props.onScrubEnd, event)}
        />
      )}
    </div>
  );
}

function YearThumb(props: {
  bound: "start" | "end";
  range: YearRange;
  at: number;
  onKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onDrag: () => void;
}) {
  const year = props.bound === "start" ? props.range.start : props.range.end;
  return (
    <button
      type="button"
      role="slider"
      className={props.bound === "end" ? "time-thumb is-end" : "time-thumb"}
      data-thumb={props.bound}
      style={{ left: `${props.at}%` }}
      aria-label={props.bound === "start" ? "Range start" : "Range end"}
      aria-orientation="horizontal"
      aria-valuemin={RANGE_START}
      aria-valuemax={RANGE_END}
      aria-valuenow={year}
      aria-valuetext={formatYear(year)}
      onKeyDown={props.onKey}
      onPointerDown={(event) => {
        props.onDrag();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
    />
  );
}

function useThumbDrag(
  trackRef: RefObject<HTMLDivElement | null>,
  drag: RefObject<"start" | "end" | null>,
  rangeRef: RefObject<YearRange>,
  onRangeRef: RefObject<(range: YearRange) => void>,
): void {
  useEffect(() => {
    function move(event: PointerEvent) {
      const which = drag.current;
      const track = trackRef.current;
      if (!which || !track) return;
      const year = yearFromClient(track, event.clientX);
      const current = rangeRef.current;
      onRangeRef.current(which === "start"
        ? normalizeRange({ start: Math.min(year, current.end), end: current.end })
        : normalizeRange({ start: current.start, end: Math.max(year, current.start) }));
    }
    function stop() {
      drag.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [trackRef, drag, rangeRef, onRangeRef]);
}

function pressTrack(
  track: HTMLDivElement | null,
  range: YearRange,
  onRange: (range: YearRange) => void,
  drag: RefObject<"start" | "end" | null>,
  event: ReactPointerEvent<HTMLDivElement>,
): void {
  if (!track) return;
  const year = yearFromClient(track, event.clientX);
  const nearerStart = Math.abs(yearToTrack(range.start) - yearToTrack(year)) <= Math.abs(yearToTrack(range.end) - yearToTrack(year));
  drag.current = nearerStart ? "start" : "end";
  onRange(drag.current === "start"
    ? normalizeRange({ start: Math.min(year, range.end), end: range.end })
    : normalizeRange({ start: range.start, end: Math.max(year, range.start) }));
  event.currentTarget.setPointerCapture(event.pointerId);
}

function moveThumb(
  bound: "start" | "end",
  rangeRef: RefObject<YearRange>,
  onRangeRef: RefObject<(range: YearRange) => void>,
  event: KeyboardEvent<HTMLButtonElement>,
): void {
  const current = rangeRef.current;
  const year = bound === "start" ? current.start : current.end;
  const next = keyYear(event.key, year, bound, current);
  if (next === null) return;
  event.preventDefault();
  event.stopPropagation();
  onRangeRef.current(bound === "start"
    ? normalizeRange({ start: Math.min(next, current.end), end: current.end })
    : normalizeRange({ start: current.start, end: Math.max(next, current.start) }));
}

function keyYear(key: string, year: number, bound: "start" | "end", range: YearRange): number | null {
  if (key === "ArrowRight" || key === "ArrowUp") return stepYear(year, KEY_STEP);
  if (key === "ArrowLeft" || key === "ArrowDown") return stepYear(year, -KEY_STEP);
  if (key === "PageUp") return stepYear(year, PAGE_STEP);
  if (key === "PageDown") return stepYear(year, -PAGE_STEP);
  if (key === "Home") return bound === "start" ? RANGE_START : range.start;
  if (key === "End") return bound === "end" ? RANGE_END : range.end;
  return null;
}

function grabPlayhead(track: HTMLDivElement | null, onScrub: (year: number) => void, event: ReactPointerEvent<HTMLButtonElement>): void {
  if (!track) return;
  event.stopPropagation();
  event.currentTarget.setPointerCapture(event.pointerId);
  onScrub(yearFromClient(track, event.clientX));
}

function movePlayhead(track: HTMLDivElement | null, onScrub: (year: number) => void, event: ReactPointerEvent<HTMLButtonElement>): void {
  if (!track || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
  onScrub(yearFromClient(track, event.clientX));
}

function keyPlayhead(
  year: number,
  range: YearRange,
  onScrub: (year: number) => void,
  onScrubEnd: () => void,
  event: KeyboardEvent<HTMLButtonElement>,
): void {
  const next = keyYear(event.key, year, "end", range);
  if (next === null) return;
  event.preventDefault();
  event.stopPropagation();
  onScrub(event.key === "Home" ? range.start : event.key === "End" ? range.end : next);
  onScrubEnd();
}

function yearFromClient(track: HTMLDivElement, clientX: number): number {
  const rect = track.getBoundingClientRect();
  const portion = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  return clampYear(trackToYear(portion));
}
