"use client";

import { useEffect, useState } from "react";
import { NamedPeriodChips } from "@/components/NamedPeriodChips";
import type { NamedPeriod } from "@/lib/world/namedPeriods";
import { ALL_TIME, WORLD_ERAS, activeWorldEra, describeSpan, isAllTime, type YearSpan } from "@/lib/world/worldEras";
import ui from "./chrome.module.css";
import styles from "./GlobeTimeline.module.css";
import { YearRangeSlider } from "./YearRangeSlider";

const count = (value: number) => value.toLocaleString("en-GB");
const ANNOUNCE_AFTER_MS = 900;

/** The value once it has stopped changing: regional cells arriving mid-flight change the count many times a second. */
function useSettled<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

const namedPeriodChipClass = () => ui.chip;

/** The globe's time filter: date-band chips under their own stretch of a two-thumb slider, then the named periods of the region in view. */
export function GlobeTimeline(props: {
  span: YearSpan;
  showUndated: boolean;
  shownCount: number | null;
  undatedCount: number | null;
  /** The named periods that apply to where the globe is looking. */
  namedPeriods: readonly NamedPeriod[];
  onSpan(span: YearSpan): void;
  onShowUndated(show: boolean): void;
}) {
  const { span, onSpan, shownCount, undatedCount } = props;
  const era = activeWorldEra(span);
  const announcedCount = useSettled(shownCount, ANNOUNCE_AFTER_MS);
  return (
    <section className={`${ui.glass} ${styles.timeline}`} aria-label="Time filter" data-role="globe-timeline" data-year-start={span[0]} data-year-end={span[1]}>
      <div className={styles.head}>
        <p className={`${ui.serif} ${styles.readout}`} data-role="timeline-readout">{describeSpan(span)}</p>
        {isAllTime(span) ? null : (
          <button type="button" className={`${ui.chip} ${styles.allTime}`} data-era="all" onClick={() => onSpan(ALL_TIME)}>All time</button>
        )}
        <p className={styles.count}>
          {shownCount === null ? "Loading sites…" : <><b className={ui.numeric}>{count(shownCount)}</b> {shownCount === 1 ? "site" : "sites"}</>}
          <span className={ui.visuallyHidden} role="status">
            {announcedCount === null ? "" : `${count(announcedCount)} ${announcedCount === 1 ? "site" : "sites"} shown`}
          </span>
        </p>
        <label className={`${ui.switch} ${styles.undated}`}>
          <input type="checkbox" data-role="include-undated" checked={props.showUndated} onChange={(event) => props.onShowUndated(event.target.checked)} />
          <span className={ui.switchTrack} />
          <span>
            Include undated
            {undatedCount === null ? null : <span className={`${ui.muted} ${ui.numeric}`}> · {count(undatedCount)}</span>}
          </span>
        </label>
      </div>
      <YearRangeSlider span={span} onSpan={onSpan} />
      <div className={styles.eras} role="group" aria-label="Eras">
        {WORLD_ERAS.map((worldEra) => (
          <button
            key={worldEra.id}
            type="button"
            className={`${ui.chip} ${styles.era}`}
            data-era={worldEra.id}
            aria-pressed={era?.id === worldEra.id}
            // Pressing the lit era again lets everything back in.
            onClick={() => onSpan(era?.id === worldEra.id ? ALL_TIME : worldEra.span)}
          >
            {worldEra.label}
          </button>
        ))}
      </div>
      <NamedPeriodChips
        periods={props.namedPeriods}
        startYear={span[0]}
        endYear={span[1]}
        className={styles.periods}
        chipClassName={namedPeriodChipClass}
        onSpan={(next) => onSpan(next ?? ALL_TIME)}
      />
    </section>
  );
}
