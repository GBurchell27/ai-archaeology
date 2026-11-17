"use client";

import { ALL_TIME, WORLD_ERAS, activeWorldEra, describeSpan, isAllTime, type YearSpan } from "@/lib/world/worldEras";
import ui from "./chrome.module.css";
import styles from "./GlobeTimeline.module.css";
import { YearRangeSlider } from "./YearRangeSlider";

const count = (value: number) => value.toLocaleString("en-GB");

/** The globe's time filter: era chips that sit under their own stretch of a two-thumb slider. */
export function GlobeTimeline(props: {
  span: YearSpan;
  showUndated: boolean;
  shownCount: number | null;
  undatedCount: number | null;
  onSpan(span: YearSpan): void;
  onShowUndated(show: boolean): void;
}) {
  const { span, onSpan, shownCount, undatedCount } = props;
  const era = activeWorldEra(span);
  return (
    <section className={`${ui.glass} ${styles.timeline}`} aria-label="Time filter" data-role="globe-timeline" data-year-start={span[0]} data-year-end={span[1]}>
      <div className={styles.head}>
        <p className={`${ui.serif} ${styles.readout}`} data-role="timeline-readout">{describeSpan(span)}</p>
        {isAllTime(span) ? null : (
          <button type="button" className={`${ui.chip} ${styles.allTime}`} data-era="all" onClick={() => onSpan(ALL_TIME)}>All time</button>
        )}
        <p className={styles.count} role="status">
          {shownCount === null ? "Loading sites…" : <><b className={ui.numeric}>{count(shownCount)}</b> {shownCount === 1 ? "site" : "sites"}</>}
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
    </section>
  );
}
