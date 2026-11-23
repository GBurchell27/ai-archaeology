"use client";

import type { KeyboardEvent, PointerEvent } from "react";

/** The draggable year on a timeline track. `track` is 0–1. */
export function HistoryPlayheadMarker(props: {
  track: number;
  year: number;
  min: number;
  max: number;
  valueText: string;
  className: string;
  onPointerDown(event: PointerEvent<HTMLButtonElement>): void;
  onPointerMove(event: PointerEvent<HTMLButtonElement>): void;
  onPointerUp(event: PointerEvent<HTMLButtonElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void;
}) {
  return (
    <button
      type="button"
      role="slider"
      className={props.className}
      data-role="history-playhead"
      style={{ left: `${props.track * 100}%` }}
      aria-label="History playhead"
      aria-orientation="horizontal"
      aria-valuemin={props.min}
      aria-valuemax={props.max}
      aria-valuenow={props.year}
      aria-valuetext={props.valueText}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerUp}
      onKeyDown={props.onKeyDown}
    />
  );
}
