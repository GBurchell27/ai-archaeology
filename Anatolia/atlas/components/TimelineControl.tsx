"use client";

import { useId, useMemo, useState } from "react";
import { AnatoliaYearTrack } from "@/components/atlas/AnatoliaYearTrack";
import { PlayHistoryTransport } from "@/components/history/PlayHistoryTransport";
import { useHistoryPlayback } from "@/components/history/useHistoryPlayback";
import { NamedPeriodChips } from "@/components/NamedPeriodChips";
import { atlasYearSheetCovered, usePhoneSheetEscape } from "@/components/usePhoneSheetEscape";
import { PERIODS, formatYear } from "@/lib/periods";
import { RANGE_END, RANGE_START, clampYear, normalizeRange, trackToYear, yearToTrack, type YearRange } from "@/lib/timeline";
import {
  PLAYHEAD_YEAR_STEP,
  describePlayhead,
  displayedYear,
  quantizePlayYear,
  type TrackScale,
} from "@/lib/world/historyPlayhead";
import { namedPeriodsForRegions } from "@/lib/world/namedPeriods";

/** This map is Anatolia at every zoom, so its chips do not follow the camera. */
const ANATOLIA_PERIODS = namedPeriodsForRegions("anatolia");
const FULL_RANGE: YearRange = { start: RANGE_START, end: RANGE_END };
const ATLAS_TRACK: TrackScale = { yearToTrack, trackToYear };
const namedPeriodChipClass = (pressed: boolean) => (pressed ? "chip is-on" : "chip");

function quantizeAtlasPlayYear(year: number): number {
  return clampYear(quantizePlayYear(year, PLAYHEAD_YEAR_STEP));
}

function atlasEra(year: number): string | null {
  const match = PERIODS.find((period) => period.id !== "all" && year >= period.start && year <= period.end);
  return match?.label ?? null;
}

export function TimelineControl(props: {
  range: YearRange;
  showUndated: boolean;
  onRange: (range: YearRange) => void;
  onPlayYear: (year: number | null) => void;
  onUndated: (show: boolean) => void;
}) {
  const bounds = useMemo(() => ({ start: props.range.start, end: props.range.end }), [props.range.start, props.range.end]);
  const playback = useHistoryPlayback({ bounds, quantize: quantizeAtlasPlayYear, scale: ATLAS_TRACK, onCommit: props.onPlayYear });
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetId = useId();
  usePhoneSheetEscape(sheetOpen, () => setSheetOpen(false), atlasYearSheetCovered);
  const sweep = playback.sweep;
  const readout = sweep === null
    ? `${formatYear(props.range.start)} – ${formatYear(props.range.end)}`
    : describePlayhead(sweep.year, atlasEra(displayedYear(sweep.year)));
  const chooseRange = (next: YearRange) => {
    playback.dismiss();
    props.onRange(next);
  };
  return (
    <div
      className="timebar"
      data-role="timeline-control"
      data-sheet={sheetOpen ? "open" : "closed"}
      data-year-start={props.range.start}
      data-year-end={props.range.end}
      data-playing={playback.playing ? "true" : "false"}
      data-play-speed={playback.speed}
      data-play-year={sweep === null ? "" : String(displayedYear(sweep.year))}
      data-undated={props.showUndated ? "show" : "hide"}
    >
      <button
        type="button"
        className="time-sheet-toggle"
        data-action="toggle-time"
        aria-expanded={sheetOpen}
        aria-controls={sheetId}
        onClick={() => setSheetOpen((open) => !open)}
      >
        {sweep === null ? `${formatYear(props.range.start)} – ${formatYear(props.range.end)}` : formatYear(displayedYear(sweep.year))}
      </button>
      <div id={sheetId} className="time-sheet-body">
        <PlayHistoryTransport
          playing={playback.playing}
          speed={playback.speed}
          onToggle={playback.toggle}
          onSpeed={playback.setSpeed}
          className="time-transport"
          playClassName="time-play"
          speedsClassName="time-speeds"
          speedClassName="time-speed"
        />
        <div className="time-readout">
          <span data-role="year-label">{readout}</span>
          <AnatoliaYearTrack
            range={props.range}
            playTrack={sweep?.track ?? null}
            playYear={sweep === null ? null : displayedYear(sweep.year)}
            scrubbing={playback.scrubbing}
            onRange={chooseRange}
            onScrub={playback.scrub}
            onScrubEnd={playback.endScrub}
          />
          <NamedPeriodChips
            periods={ANATOLIA_PERIODS}
            startYear={props.range.start}
            endYear={props.range.end}
            className="chips time-periods"
            chipClassName={namedPeriodChipClass}
            onSpan={(span) => chooseRange(span ? { start: span[0], end: span[1] } : FULL_RANGE)}
          />
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
        <YearField role="year-start" label="Range start year" range={props.range} bound="start" onRange={chooseRange} />
        <YearField role="year-end" label="Range end year" range={props.range} bound="end" onRange={chooseRange} />
      </div>
    </div>
  );
}

function YearField(props: {
  role: string;
  label: string;
  range: YearRange;
  bound: "start" | "end";
  onRange: (range: YearRange) => void;
}) {
  return (
    <input
      className="time-input"
      data-role={props.role}
      aria-label={props.label}
      inputMode="numeric"
      min={RANGE_START}
      max={RANGE_END}
      value={props.bound === "start" ? props.range.start : props.range.end}
      onChange={(event) => commitBound(props.range, props.bound, event.target.value, props.onRange)}
    />
  );
}

function commitBound(range: YearRange, bound: "start" | "end", raw: string, onRange: (range: YearRange) => void): void {
  if (raw.trim() === "" || raw.trim() === "-") return;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return;
  const year = clampYear(parsed);
  if (bound === "start") onRange(normalizeRange({ start: Math.min(year, range.end), end: range.end }));
  else onRange(normalizeRange({ start: range.start, end: Math.max(year, range.start) }));
}
