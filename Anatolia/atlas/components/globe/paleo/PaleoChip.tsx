import chip from "../model/ModelChip.module.css";
import styles from "./PaleoControls.module.css";
import { PALEO_DRAWN, PALEO_KICKER, PALEO_NOTHING_DRAWN, PALEO_TOO_CLOSE_NOTE, paleoStepLabel, paleoYearsAgo } from "./paleoWording";
import type { PaleoLayerViewModel } from "./usePaleoLayer";

/** The always-on label over the globe while the layer shows: what it is, which step, and whose model. */
export function PaleoChip({ paleo }: { paleo: PaleoLayerViewModel }) {
  const { index, step } = paleo;
  if (!paleo.enabled || !index || !step) return null;
  const present = index.steps[index.steps.length - 1];
  const when = [paleoStepLabel(step, present), paleoYearsAgo(step, present)].filter(Boolean).join(", ");
  return (
    <div className={styles.chipHost}>
      <div className={chip.chip} role="status" data-role="paleo-chip" data-year={step.year} data-too-close={paleo.tooClose}>
        <span className={chip.kicker}>{PALEO_KICKER}</span>
        <span className={chip.title}>Ice and sea level at {when}</span>
        <span>{step.year === present.year ? PALEO_NOTHING_DRAWN : PALEO_DRAWN}</span>
        <span className={chip.note}>{paleo.tooClose ? PALEO_TOO_CLOSE_NOTE : `${index.source.name} · ${index.source.licence}`}</span>
      </div>
    </div>
  );
}
