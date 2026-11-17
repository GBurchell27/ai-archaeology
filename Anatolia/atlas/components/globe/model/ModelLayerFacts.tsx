"use client";

import { useId } from "react";
import { beatsEffortBaseline, type PredictLayer, type PredictLicence } from "@/lib/world/predictIndex";
import ui from "../chrome/chrome.module.css";
import styles from "./ModelControls.module.css";
import { honestyBadge, metricReadings, type MetricReading } from "./modelWording";

function Metric({ reading }: { reading: MetricReading }) {
  const explanationId = useId();
  return (
    <li className={styles.metric} tabIndex={0} aria-describedby={explanationId} data-metric={reading.key}>
      <span className={styles.metricLabel}>{reading.label}</span>
      <span className={`${ui.numeric} ${styles.metricValue}`}>{reading.value}</span>
      <span id={explanationId} role="tooltip" className={styles.explanation}>{reading.explanation}</span>
    </li>
  );
}

/** How far to trust the chosen layer: its badge, its numbers, and every caveat the model wrote for it. */
export function ModelLayerFacts({ layer, licences }: { layer: PredictLayer; licences: readonly PredictLicence[] }) {
  const badge = honestyBadge(beatsEffortBaseline(layer.metrics));
  return (
    <div className={styles.facts} data-role="model-facts" data-layer={layer.id}>
      <h3 className={`${ui.serif} ${styles.layerTitle}`}>{layer.title}</h3>
      <p className={styles.badge} data-role="model-badge" data-beats-baseline={badge.beatsBaseline}>{badge.label}</p>
      <p className={styles.badgeNote}>{badge.explanation}</p>

      <ul className={styles.metrics} aria-label="How the layer scored on regions held back from fitting">
        {metricReadings(layer.metrics).map((reading) => <Metric key={reading.key} reading={reading} />)}
      </ul>
      <p className={styles.basis}>
        Built from {layer.presences.toLocaleString("en-GB")} cells that hold such a site, checked on {layer.metrics.folds} held-out sets of 5° blocks.
        Point at a number, or tab to it, for what it means.
      </p>

      <h4 className={styles.caveatsHeading}>What this layer cannot tell you</h4>
      <ul className={styles.caveats} data-role="model-caveats">
        {layer.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
      </ul>
      <p className={styles.licences}>
        Built from {licences.map((entry) => `${entry.name} (${entry.attribution}; ${entry.licence})`).join(", ")}.
      </p>
    </div>
  );
}
