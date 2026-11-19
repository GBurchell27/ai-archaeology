"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { TimelineIntervalBand } from "@/components/TimelineIntervalBand";
import { formatYear } from "@/lib/periods";
import { YOUNGER_DRYAS } from "@/lib/world/namedPeriods";
import {
  WORLD_ERAS,
  WORLD_RANGE_END,
  WORLD_RANGE_START,
  WORLD_YEAR_PAGE,
  WORLD_YEAR_STEP,
  clampWorldYear,
  trackToWorldYear,
  worldYearToTrack,
  type YearSpan,
} from "@/lib/world/worldEras";
import styles from "./GlobeTimeline.module.css";

type Bound = 0 | 1;

/** With one bound moved to `year`, the other stays put and is never crossed. */
function spanWithBound(span: YearSpan, bound: Bound, year: number): YearSpan {
  return bound === 0 ? [Math.min(year, span[1]), span[1]] : [span[0], Math.max(year, span[0])];
}

function keyTarget(key: string, year: number): number | null {
  if (key === "ArrowRight" || key === "ArrowUp") return year + WORLD_YEAR_STEP;
  if (key === "ArrowLeft" || key === "ArrowDown") return year - WORLD_YEAR_STEP;
  if (key === "PageUp") return year + WORLD_YEAR_PAGE;
  if (key === "PageDown") return year - WORLD_YEAR_PAGE;
  if (key === "Home") return WORLD_RANGE_START;
  if (key === "End") return WORLD_RANGE_END;
  return null;
}

function openEndedYear(year: number): string {
  if (year <= WORLD_RANGE_START) return `${formatYear(year)} and earlier`;
  if (year >= WORLD_RANGE_END) return `${formatYear(year)} and later`;
  return formatYear(year);
}

/** Two thumbs on one track, 12,000 BCE to 1500 CE, each era taking an equal share of the width. */
export function YearRangeSlider(props: { span: YearSpan; onSpan(span: YearSpan): void }) {
  const { span, onSpan } = props;
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef<Bound | null>(null);

  function yearAt(clientX: number): number {
    const box = track.current!.getBoundingClientRect();
    return trackToWorldYear(box.width > 0 ? (clientX - box.left) / box.width : 0);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>): void {
    const year = yearAt(event.clientX);
    const nearerStart = Math.abs(worldYearToTrack(span[0]) - worldYearToTrack(year))
      <= Math.abs(worldYearToTrack(span[1]) - worldYearToTrack(year));
    // Where the two thumbs sit together, the side of the press decides which one moves.
    dragging.current = span[0] === span[1] ? (year < span[0] ? 0 : 1) : nearerStart ? 0 : 1;
    event.currentTarget.setPointerCapture(event.pointerId);
    onSpan(spanWithBound(span, dragging.current, year));
  }

  function drag(event: PointerEvent<HTMLDivElement>): void {
    if (dragging.current !== null) onSpan(spanWithBound(span, dragging.current, yearAt(event.clientX)));
  }

  function onThumbKey(bound: Bound, event: KeyboardEvent<HTMLButtonElement>): void {
    const target = keyTarget(event.key, span[bound]);
    if (target === null) return;
    event.preventDefault();
    onSpan(spanWithBound(span, bound, clampWorldYear(target)));
  }

  const edges = [worldYearToTrack(span[0]) * 100, worldYearToTrack(span[1]) * 100];
  return (
    <div
      ref={track}
      className={styles.track}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={() => { dragging.current = null; }}
      onPointerCancel={() => { dragging.current = null; }}
    >
      <i className={styles.rail} />
      <TimelineIntervalBand period={YOUNGER_DRYAS} yearToTrack={worldYearToTrack} className={styles.interval} labelClassName={styles.intervalLabel} />
      <i className={styles.fill} style={{ left: `${edges[0]}%`, width: `${edges[1] - edges[0]}%` }} />
      {WORLD_ERAS.slice(1).map((era) => (
        <i key={era.id} className={styles.tick} style={{ left: `${worldYearToTrack(era.span[0]) * 100}%` }} />
      ))}
      {([0, 1] as const).map((bound) => (
        <button
          key={bound}
          type="button"
          role="slider"
          className={styles.thumb}
          data-thumb={bound === 0 ? "start" : "end"}
          style={{ left: `${edges[bound]}%` }}
          aria-label={bound === 0 ? "Earliest year shown" : "Latest year shown"}
          aria-orientation="horizontal"
          aria-valuemin={WORLD_RANGE_START}
          aria-valuemax={WORLD_RANGE_END}
          aria-valuenow={span[bound]}
          aria-valuetext={openEndedYear(span[bound])}
          onKeyDown={(event) => onThumbKey(bound, event)}
        />
      ))}
    </div>
  );
}
