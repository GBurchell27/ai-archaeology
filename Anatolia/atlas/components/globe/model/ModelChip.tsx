import { beatsEffortBaseline, type PredictLayer } from "@/lib/world/predictIndex";
import styles from "./ModelChip.module.css";
import { TOO_CLOSE_NOTE, honestyBadge } from "./modelWording";

/** The always-on label over the globe while the layer shows: what it is and how far to trust it. */
export function ModelChip({ layer, tooClose }: { layer: PredictLayer; tooClose: boolean }) {
  const badge = honestyBadge(beatsEffortBaseline(layer.metrics));
  return (
    <div className={styles.chip} role="status" data-role="model-chip" data-layer={layer.id} data-too-close={tooClose}>
      <span className={styles.kicker}>Pattern layer · not a site map</span>
      <span className={styles.title}>{layer.title}</span>
      <span className={styles.badge} data-beats-baseline={badge.beatsBaseline}>{badge.label}</span>
      {tooClose ? <span className={styles.note}>{TOO_CLOSE_NOTE}</span> : null}
    </div>
  );
}
