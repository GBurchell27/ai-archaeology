"use client";

import { useEffect, useRef } from "react";
import { formatYear } from "@/lib/periods";
import {
  RANGE_END,
  RANGE_START,
  TIMELINE_STOPS,
  clampYear,
  normalizeRange,
  yearToTrack,
  trackToYear,
  type YearRange,
} from "@/lib/timeline";

export function TimelineControl(props: {
  range: YearRange;
  playing: boolean;
  showUndated: boolean;
  onRange: (range: YearRange) => void;
  onTogglePlay: () => void;
  onUndated: (show: boolean) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | null>(null);
  const rangeRef = useRef(props.range);
  rangeRef.current = props.range;
  const onRangeRef = useRef(props.onRange);
  onRangeRef.current = props.onRange;

  useEffect(() => {
    function move(event: PointerEvent) {
      const which = drag.current;
      const track = trackRef.current;
      if (!which || !track) return;
      const year = yearFromClient(track, event.clientX);
      const current = rangeRef.current;
      if (which === "start") {
        onRangeRef.current(normalizeRange({ start: Math.min(year, current.end), end: current.end }));
      } else {
        onRangeRef.current(normalizeRange({ start: current.start, end: Math.max(year, current.start) }));
      }
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
  }, []);

  const startAt = yearToTrack(props.range.start) * 100;
  const endAt = yearToTrack(props.range.end) * 100;
  return (
    <div
      className="timebar"
      data-role="timeline-control"
      data-year-start={props.range.start}
      data-year-end={props.range.end}
      data-playing={props.playing ? "true" : "false"}
      data-undated={props.showUndated ? "show" : "hide"}
    >
      <button
        type="button"
        className="time-play"
        data-action="play-time"
        aria-pressed={props.playing}
        aria-label={props.playing ? "Pause the timeline" : "Play the timeline"}
        onClick={props.onTogglePlay}
      >
        {props.playing ? "Pause" : "Play"}
      </button>
      <div className="time-readout">
        <span data-role="year-label">{formatYear(props.range.start)} – {formatYear(props.range.end)}</span>
        <div
          className="time-track"
          ref={trackRef}
          onPointerDown={(event) => {
            const track = trackRef.current;
            if (!track) return;
            const year = yearFromClient(track, event.clientX);
            const current = rangeRef.current;
            const nearerStart = Math.abs(yearToTrack(current.start) - yearToTrack(year))
              <= Math.abs(yearToTrack(current.end) - yearToTrack(year));
            drag.current = nearerStart ? "start" : "end";
            if (drag.current === "start") {
              props.onRange(normalizeRange({ start: Math.min(year, current.end), end: current.end }));
            } else {
              props.onRange(normalizeRange({ start: current.start, end: Math.max(year, current.start) }));
            }
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        >
          {TIMELINE_STOPS.map((stop) => (
            <i key={stop.year} className="time-tick" style={{ left: `${stop.at * 100}%` }} />
          ))}
          <i className="time-fill" style={{ left: `${startAt}%`, width: `${Math.max(0, endAt - startAt)}%` }} />
          <button
            type="button"
            className="time-thumb"
            style={{ left: `${startAt}%` }}
            aria-label="Range start"
            onPointerDown={(event) => {
              drag.current = "start";
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          />
          <button
            type="button"
            className="time-thumb is-end"
            style={{ left: `${endAt}%` }}
            aria-label="Range end"
            onPointerDown={(event) => {
              drag.current = "end";
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          />
        </div>
      </div>
      <label className="undated-toggle">
        <input
          type="checkbox"
          data-role="undated"
          checked={props.showUndated}
          onChange={(event) => props.onUndated(event.target.checked)}
        />
        Undated
      </label>
      <input
        className="time-input"
        data-role="year-start"
        aria-label="Range start year"
        inputMode="numeric"
        min={RANGE_START}
        max={RANGE_END}
        value={props.range.start}
        onChange={(event) => commitBound(props.range, "start", event.target.value, props.onRange)}
      />
      <input
        className="time-input"
        data-role="year-end"
        aria-label="Range end year"
        inputMode="numeric"
        min={RANGE_START}
        max={RANGE_END}
        value={props.range.end}
        onChange={(event) => commitBound(props.range, "end", event.target.value, props.onRange)}
      />
    </div>
  );
}

function yearFromClient(track: HTMLDivElement, clientX: number): number {
  const rect = track.getBoundingClientRect();
  const portion = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  return clampYear(trackToYear(portion));
}

function commitBound(
  range: YearRange,
  bound: "start" | "end",
  raw: string,
  onRange: (range: YearRange) => void,
): void {
  if (raw.trim() === "" || raw.trim() === "-") return;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return;
  const year = clampYear(parsed);
  if (bound === "start") onRange(normalizeRange({ start: Math.min(year, range.end), end: range.end }));
  else onRange(normalizeRange({ start: range.start, end: Math.max(year, range.start) }));
}
