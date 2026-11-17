"use client";

import { Fragment, useId } from "react";
import {
  PREDICT_PERIODS,
  PREDICT_SITE_CLASSES,
  beatsEffortBaseline,
  type PredictIndex,
  type PredictLayer,
} from "@/lib/world/predictIndex";
import styles from "./ModelControls.module.css";
import { PERIOD_LABEL, SITE_CLASS_LABEL, honestyBadge } from "./modelWording";

function LayerChoice(props: { layer: PredictLayer; groupName: string; selected: boolean; onSelect(layerId: string): void }) {
  const { layer } = props;
  const badge = honestyBadge(beatsEffortBaseline(layer.metrics));
  return (
    <label className={styles.choice} title={`${layer.title}. ${badge.label}.`}>
      <input
        type="radio"
        name={props.groupName}
        data-layer={layer.id}
        aria-label={`${layer.title}. ${badge.label}.`}
        checked={props.selected}
        onChange={() => props.onSelect(layer.id)}
      />
      <span className={styles.mark} data-beats-baseline={badge.beatsBaseline} />
    </label>
  );
}

/**
 * Every layer on one grid: what is recorded down the side, when across the top. The mark in each
 * cell says at a glance which few layers are more than a map of survey effort.
 */
export function ModelLayerPicker(props: { index: PredictIndex; selectedId: string; onSelect(layerId: string): void }) {
  const groupName = useId();
  const layers = new Map(props.index.layers.map((layer) => [`${layer.siteClass}_${layer.period}`, layer]));
  const skipped = new Map(props.index.skipped.map((entry) => [entry.id, entry.reason]));
  return (
    <div className={styles.picker} data-role="model-picker">
      <div className={styles.grid} role="radiogroup" aria-label="Which published sites, from when">
        <span />
        {PREDICT_PERIODS.map((period) => <span key={period} className={styles.period}>{PERIOD_LABEL[period]}</span>)}
        {PREDICT_SITE_CLASSES.map((siteClass) => (
          <Fragment key={siteClass}>
            <span className={styles.siteClass}>{SITE_CLASS_LABEL[siteClass]}</span>
            {PREDICT_PERIODS.map((period) => {
              const key = `${siteClass}_${period}`;
              const layer = layers.get(key);
              if (layer) return <LayerChoice key={key} layer={layer} groupName={groupName} selected={layer.id === props.selectedId} onSelect={props.onSelect} />;
              const reason = `Not published: ${skipped.get(key) ?? "no layer was built"}`;
              return <span key={key} className={styles.absent} title={reason} aria-label={reason} role="img">–</span>;
            })}
          </Fragment>
        ))}
      </div>
      <p className={styles.key}>
        <span><i className={styles.mark} data-beats-baseline="true" /> beats the survey-effort baseline</span>
        <span><i className={styles.mark} data-beats-baseline="false" /> mostly survey effort</span>
        <span><i className={styles.absentKey}>–</i> withheld: too few records or no held-out skill</span>
      </p>
    </div>
  );
}
