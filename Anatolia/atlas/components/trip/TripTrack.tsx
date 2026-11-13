"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "@/components/trip/TripControl.module.css";
import { MODE_COLORS } from "@/lib/trip/tripStyle";
import { adjacentBoundary, type DayMark, type TripSpan } from "@/lib/trip/tripTimeline";
import type { TimedSegment } from "@/lib/trip/tripTypes";

const MINUTE_MS = 60_000;
const KEY_STEP_MS = 15 * MINUTE_MS;
const SHIFT_STEP_MS = 60 * MINUTE_MS;

export function TripTrack(props: {
  span: TripSpan;
  timed: TimedSegment[];
  days: DayMark[];
  timeMs: number;
  /** The live time, which can be ahead of `timeMs` between renders. */
  readTimeMs: () => number;
  valueText: string;
  onSeek: (timeMs: number) => void;
  onScrubStart: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [touched, setTouched] = useState(false);
  const share = (ms: number) => ((ms - props.span.startMs) / (props.span.endMs - props.span.startMs)) * 100;

  function timeFromPointer(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return props.timeMs;
    const portion = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return props.span.startMs + portion * (props.span.endMs - props.span.startMs);
  }

  function startScrub(event: PointerEvent<HTMLDivElement>) {
    setScrubbing(true);
    setTouched(true);
    props.onScrubStart();
    props.onSeek(timeFromPointer(event.clientX));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? SHIFT_STEP_MS : KEY_STEP_MS;
    const now = props.readTimeMs();
    const targets: Record<string, () => number> = {
      ArrowRight: () => now + step,
      ArrowUp: () => now + step,
      ArrowLeft: () => now - step,
      ArrowDown: () => now - step,
      PageUp: () => adjacentBoundary(props.timed, now, 1),
      PageDown: () => adjacentBoundary(props.timed, now, -1),
      Home: () => props.span.startMs,
      End: () => props.span.endMs,
    };
    const target = targets[event.key];
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    setTouched(true);
    props.onScrubStart();
    props.onSeek(target());
  }

  return (
    <div className={styles.trackArea}>
      <div
        ref={trackRef}
        className={styles.track}
        data-role="trip-track"
        data-scrubbing={scrubbing}
        onPointerDown={startScrub}
        onPointerMove={(event) => {
          if (scrubbing) props.onSeek(timeFromPointer(event.clientX));
        }}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
      >
        {props.timed.map(({ segment, startMs, endMs, index }) => segment.kind === "travel" ? (
          <i
            key={index}
            className={styles.band}
            style={{ left: `${share(startMs)}%`, width: `${share(endMs) - share(startMs)}%`, background: MODE_COLORS[segment.mode] }}
          />
        ) : null)}
        {props.days.map((day) => <i key={day.ms} className={styles.dayTick} style={{ left: `${share(day.ms)}%` }} />)}
        <i className={styles.played} style={{ width: `${share(props.timeMs)}%` }} />
        <button
          type="button"
          role="slider"
          className={styles.thumb}
          style={{ left: `${share(props.timeMs)}%` }}
          aria-label="Trip time"
          aria-valuemin={props.span.startMs}
          aria-valuemax={props.span.endMs}
          aria-valuenow={Math.round(props.timeMs)}
          aria-valuetext={props.valueText}
          title="Drag to move through the trip"
          onKeyDown={onKey}
        >
          <span className={styles.grip} aria-hidden="true" />
          <span className={styles.hint} data-shown={!touched} aria-hidden="true"><b>◂</b><b>▸</b></span>
        </button>
      </div>
      <div className={styles.dayLabels} aria-hidden="true">
        {props.days.map((day) => <span key={day.ms} style={{ left: `${share(day.ms)}%` }}>{day.label}</span>)}
      </div>
    </div>
  );
}
