"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { PlayHistoryTransport } from "@/components/history/PlayHistoryTransport";
import { useHistoryPlayback } from "@/components/history/useHistoryPlayback";
import { NamedPeriodChips } from "@/components/NamedPeriodChips";
import { formatYear } from "@/lib/periods";
import type { NamedPeriod } from "@/lib/world/namedPeriods";
import { describePlayhead, displayedYear, type TrackScale } from "@/lib/world/historyPlayhead";
import { ALL_TIME, WORLD_ERAS, activeWorldEra, clampWorldYear, describeSpan, eraOfYear, isAllTime, trackToWorldYear, worldYearToTrack, type YearSpan } from "@/lib/world/worldEras";
import { globeTimeSheetCovered, usePhoneSheetEscape } from "@/components/usePhoneSheetEscape";
import { ChevronIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./GlobeTimeline.module.css";
import { YearRangeSlider } from "./YearRangeSlider";

const count = (value: number) => value.toLocaleString("en-GB");
const ANNOUNCE_AFTER_MS = 900;
const GLOBE_TRACK: TrackScale = { yearToTrack: worldYearToTrack, trackToYear: trackToWorldYear };
const namedPeriodChipClass = () => ui.chip;

/** The value once it has stopped changing: regional cells arriving mid-flight change the count many times a second. */
function useSettled<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

/** The globe's time filter: date-band chips, named periods, and a playhead that reveals sites as it sweeps. */
export function GlobeTimeline(props: {
  span: YearSpan;
  showUndated: boolean;
  shownCount: number | null;
  undatedCount: number | null;
  /** The named periods that apply to where the globe is looking. */
  namedPeriods: readonly NamedPeriod[];
  onSpan(span: YearSpan): void;
  onPlayYear(year: number | null): void;
  onShowUndated(show: boolean): void;
}) {
  const { span } = props;
  const bounds = useMemo(() => ({ start: span[0], end: span[1] }), [span]);
  const playback = useHistoryPlayback({ bounds, quantize: clampWorldYear, scale: GLOBE_TRACK, onCommit: props.onPlayYear });
  const [sheetOpen, setSheetOpen] = useState(false);
  const bodyId = useId();
  usePhoneSheetEscape(sheetOpen, () => setSheetOpen(false), globeTimeSheetCovered);
  const sweep = playback.sweep;
  const chip = sweep === null ? describeSpan(span) : formatYear(displayedYear(sweep.year));
  const chooseSpan = (next: YearSpan) => {
    playback.dismiss();
    props.onSpan(next);
  };
  return (
    <section
      className={`${ui.glass} ${styles.timeline}`}
      aria-label="Time filter"
      data-role="globe-timeline"
      data-sheet={sheetOpen ? "open" : "closed"}
      data-year-start={span[0]}
      data-year-end={span[1]}
      data-playing={playback.playing ? "true" : "false"}
      data-play-speed={playback.speed}
      data-play-year={sweep === null ? "" : String(displayedYear(sweep.year))}
    >
      <button
        type="button"
        className={`${ui.chip} ${styles.sheetToggle}`}
        aria-expanded={sheetOpen}
        aria-controls={bodyId}
        data-action="toggle-timeline"
        onClick={() => setSheetOpen((open) => !open)}
      >
        <span className={styles.sheetLabel}>{chip}</span>
        <ChevronIcon direction={sheetOpen ? "down" : "up"} />
      </button>
      <div id={bodyId} className={styles.sheetBody}>
        <PlayHistoryTransport
          playing={playback.playing}
          speed={playback.speed}
          onToggle={playback.toggle}
          onSpeed={playback.setSpeed}
          className={styles.transport}
          playClassName={`${ui.button} ${styles.play}`}
          speedsClassName={styles.speeds}
          speedClassName={`${ui.chip} ${styles.speed}`}
        />
        <TimelineControls
          {...props}
          onSpan={chooseSpan}
          readout={sweep === null ? describeSpan(span) : describePlayhead(sweep.year, eraOfYear(sweep.year).label)}
          playTrack={sweep?.track ?? null}
          playYear={sweep === null ? null : displayedYear(sweep.year)}
          scrubbing={playback.scrubbing}
          onScrub={playback.scrub}
          onScrubEnd={playback.endScrub}
        />
      </div>
    </section>
  );
}

function TimelineControls(props: {
  span: YearSpan;
  showUndated: boolean;
  shownCount: number | null;
  undatedCount: number | null;
  namedPeriods: readonly NamedPeriod[];
  readout: string;
  playTrack: number | null;
  playYear: number | null;
  scrubbing: boolean;
  onSpan(span: YearSpan): void;
  onShowUndated(show: boolean): void;
  onScrub(year: number): void;
  onScrubEnd(): void;
}) {
  const { span, onSpan, shownCount, undatedCount } = props;
  const era = activeWorldEra(span);
  const announcedCount = useSettled(shownCount, ANNOUNCE_AFTER_MS);
  return (
    <>
      <div className={styles.head}>
        <p className={`${ui.serif} ${styles.readout}`} data-role="timeline-readout">{props.readout}</p>
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
      <YearRangeSlider
        span={span}
        onSpan={onSpan}
        playTrack={props.playTrack}
        playYear={props.playYear}
        scrubbing={props.scrubbing}
        onScrub={props.onScrub}
        onScrubEnd={props.onScrubEnd}
      />
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
    </>
  );
}
