"use client";

import ui from "../chrome/chrome.module.css";
import styles from "./ModelControls.module.css";
import { ModelLayerFacts } from "./ModelLayerFacts";
import { ModelLayerPicker } from "./ModelLayerPicker";
import { ModelLegend } from "./ModelLegend";
import { MODEL_HEADING, MODEL_STATEMENT } from "./modelWording";
import type { ModelLayerViewModel } from "./useModelLayer";

function OpacitySlider({ opacity, onChange }: { opacity: number; onChange(opacity: number): void }) {
  return (
    <label className={styles.opacity}>
      <span>Opacity</span>
      <input
        type="range"
        data-role="model-opacity"
        min={0.2}
        max={1}
        step={0.05}
        value={opacity}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={ui.numeric}>{Math.round(opacity * 100)}%</span>
    </label>
  );
}

/** The recording-pattern layer's controls, for the Layers panel slot. The statement shows whether it is on or off. */
export function ModelControls({ model }: { model: ModelLayerViewModel }) {
  const { index, layer } = model;
  return (
    <div className={styles.model}>
      <p className={styles.kicker}>Pattern layer</p>
      <label className={`${ui.switch} ${styles.switch}`}>
        <input type="checkbox" data-role="model-enabled" checked={model.enabled} onChange={(event) => model.setEnabled(event.target.checked)} />
        <span className={ui.switchTrack} />
        <span className={styles.heading}>{MODEL_HEADING}</span>
      </label>
      <p className={styles.statement} data-role="model-statement">{MODEL_STATEMENT}</p>
      {model.error ? <p className={styles.error} role="alert">The layer list did not load: {model.error}. Reload the page to try again.</p> : null}
      {model.enabled && index && layer ? (
        <>
          <ModelLayerPicker index={index} selectedId={layer.id} onSelect={model.selectLayer} />
          <OpacitySlider opacity={model.opacity} onChange={model.setOpacity} />
          <ModelLegend />
          <ModelLayerFacts layer={layer} licences={index.licences} />
        </>
      ) : null}
    </div>
  );
}
