"use client";

import { SafeLink } from "@/components/SafeLink";
import type { PaleoIndex, PaleoStep } from "@/lib/world/paleoIndex";
import ui from "../chrome/chrome.module.css";
import model from "../model/ModelControls.module.css";
import styles from "./PaleoControls.module.css";
import { PALEO_EXPOSED_LAND_COLOR, PALEO_ICE_COLOR } from "./paleoStyle";
import {
  FOLLOW_TIMELINE_LABEL, LEGEND_EXPOSED_LAND, LEGEND_ICE, PALEO_HEADING, PALEO_SOURCE_NOTE,
  PALEO_STATEMENT, PALEO_TIMELINE_NOTE, paleoReadout, paleoStepLabel, paleoYearsAgo,
} from "./paleoWording";
import type { PaleoLayerViewModel } from "./usePaleoLayer";

const FOLLOW_TIMELINE = "timeline";

function StepPicker({ index, pickedYear, onPick }: { index: PaleoIndex; pickedYear: number | null; onPick(year: number | null): void }) {
  const present = index.steps[index.steps.length - 1];
  return (
    <label className={styles.picker}>
      <span>Time step</span>
      <select
        data-role="paleo-step"
        value={pickedYear ?? FOLLOW_TIMELINE}
        onChange={(event) => onPick(event.target.value === FOLLOW_TIMELINE ? null : Number(event.target.value))}
      >
        <option value={FOLLOW_TIMELINE}>{FOLLOW_TIMELINE_LABEL}</option>
        {index.steps.map((step) => (
          <option key={step.year} value={step.year}>
            {[paleoStepLabel(step, present), paleoYearsAgo(step, present)].filter(Boolean).join(" · ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function PaleoLegend() {
  return (
    <ul className={styles.legend} data-role="paleo-legend">
      <li><i style={{ background: PALEO_ICE_COLOR }} />{LEGEND_ICE}</li>
      <li><i style={{ background: PALEO_EXPOSED_LAND_COLOR }} />{LEGEND_EXPOSED_LAND}</li>
    </ul>
  );
}

function PaleoDetails({ paleo, index, step }: { paleo: PaleoLayerViewModel; index: PaleoIndex; step: PaleoStep }) {
  const present = index.steps[index.steps.length - 1];
  const { source } = index;
  return (
    <>
      <StepPicker index={index} pickedYear={paleo.pickedYear} onPick={paleo.setPickedYear} />
      <p className={styles.readout} role="status" data-role="paleo-readout" data-year={step.year}>
        {paleoReadout(step, present)}
      </p>
      <PaleoLegend />
      <p className={styles.small}>{PALEO_TIMELINE_NOTE}</p>
      <p className={styles.small}>{PALEO_SOURCE_NOTE}</p>
      <p className={`${ui.prose} ${styles.small}`} data-role="paleo-credit">
        Source: {source.name}. {source.citation}, <SafeLink href={source.url}>{source.url.replace("https://", "")}</SafeLink>. {source.licence}.
      </p>
    </>
  );
}

/** The ice and sea level layer's controls, for the Layers section of the settings panel. The statement shows whether it is on or off. */
export function PaleoControls({ paleo }: { paleo: PaleoLayerViewModel }) {
  const { index, step } = paleo;
  return (
    <div className={model.model}>
      <p className={model.kicker}>Context layer</p>
      <label className={`${ui.switch} ${model.switch}`}>
        <input type="checkbox" data-role="paleo-enabled" checked={paleo.enabled} onChange={(event) => paleo.setEnabled(event.target.checked)} />
        <span className={ui.switchTrack} />
        <span className={model.heading}>{PALEO_HEADING}</span>
      </label>
      <p className={model.statement} data-role="paleo-statement">{PALEO_STATEMENT}</p>
      {paleo.error ? <p className={model.error} role="alert">The layer did not load: {paleo.error}. Switch it off and on to try again.</p> : null}
      {paleo.enabled && index && step ? <PaleoDetails paleo={paleo} index={index} step={step} /> : null}
    </div>
  );
}
