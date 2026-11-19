"use client";

import { NamedPeriodChips } from "@/components/NamedPeriodChips";
import panel from "@/components/settings/SettingsPanel.module.css";
import type { NamedPeriod } from "@/lib/world/namedPeriods";
import { ALL_TIME, WORLD_ERAS, activeWorldEra, describeSpan, isAllTime, type YearSpan } from "@/lib/world/worldEras";
import ui from "./chrome.module.css";

const namedPeriodChipClass = () => ui.chip;

/** The globe's time filter as the settings panel shows it: the date bands and named periods. The year slider stays under the globe. */
export function GlobeTimelineSetting(props: {
  span: YearSpan;
  showUndated: boolean;
  namedPeriods: readonly NamedPeriod[];
  onSpan(span: YearSpan): void;
  onShowUndated(show: boolean): void;
}) {
  const { span, onSpan } = props;
  const era = activeWorldEra(span);
  return (
    <>
      <p className={`${ui.serif} ${panel.readout}`} data-role="settings-timeline-readout">{describeSpan(span)}</p>
      <div className={panel.chips} role="group" aria-label="Date bands">
        <button type="button" className={ui.chip} data-settings-era="all" aria-pressed={isAllTime(span)} onClick={() => onSpan(ALL_TIME)}>All time</button>
        {WORLD_ERAS.map((worldEra) => (
          <button key={worldEra.id} type="button" className={ui.chip} data-settings-era={worldEra.id} aria-pressed={era?.id === worldEra.id} onClick={() => onSpan(worldEra.span)}>
            {worldEra.label}
          </button>
        ))}
      </div>
      <NamedPeriodChips
        periods={props.namedPeriods}
        startYear={span[0]}
        endYear={span[1]}
        className={panel.chips}
        chipClassName={namedPeriodChipClass}
        onSpan={(next) => onSpan(next ?? ALL_TIME)}
      />
      <label className={`${ui.switch} ${panel.toggle}`}>
        <input type="checkbox" data-role="settings-include-undated" checked={props.showUndated} onChange={(event) => props.onShowUndated(event.target.checked)} />
        <span className={ui.switchTrack} />
        <span>Include undated</span>
      </label>
      <p className={panel.note}>The year slider is under the globe.</p>
    </>
  );
}
