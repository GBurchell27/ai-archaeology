import styles from "./ModelControls.module.css";
import { MODEL_RAMP, NO_BASIS_HATCH } from "./modelRamp";
import { LEGEND_HIGH, LEGEND_LOW, NO_BASIS_LABEL } from "./modelWording";

const hatchSwatch = {
  background: `repeating-linear-gradient(135deg, ${NO_BASIS_HATCH.line}66 0 1px, transparent 1px ${NO_BASIS_HATCH.spacingPx}px), #1a2029`,
};

/** The ten decile steps as flat cells (they are ranks, not a continuous measure) and the "no basis" hatch. */
export function ModelLegend() {
  return (
    <div className={styles.legend} data-role="model-legend">
      <ol className={styles.ramp} aria-label={`Ten steps, from ${LEGEND_LOW} to ${LEGEND_HIGH}`}>
        {MODEL_RAMP.map((color, step) => <li key={color} style={{ background: color }} title={`Step ${step + 1} of 10`} />)}
      </ol>
      <p className={styles.rampEnds} aria-hidden="true">
        <span>{LEGEND_LOW}</span>
        <span>→</span>
        <span>{LEGEND_HIGH}</span>
      </p>
      <p className={styles.noBasis}>
        <i style={hatchSwatch} />
        <span>{NO_BASIS_LABEL}</span>
      </p>
    </div>
  );
}
