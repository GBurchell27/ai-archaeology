"use client";

import { HYPOTHESIS_STANDING_NOTE, type HypothesisLayer, type HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import { WALK_PANEL_GROUP } from "./WalkKeyLegend";
import styles from "./WalkView.module.css";

type HypothesisPanelProps = {
  layers: readonly HypothesisLayer[];
  active: readonly HypothesisLayerId[];
  locked: boolean;
  onToggle: (layerId: HypothesisLayerId) => void;
  /** Switch a layer on and stand the walker where it can be seen. Only asked of a layer with a viewpoint. */
  onShow: (layer: HypothesisLayer) => void;
};

/** Where a layer is drawn, with the way to go and see it when it is out of sight from the start. */
function LayerPlace({ layer, onShow }: { layer: HypothesisLayer; onShow: () => void }) {
  if (!layer.where) return null;
  return (
    <p className={styles.hypothesisWhere} data-role="layer-where">
      {layer.where}{" "}
      {layer.viewpoint ? (
        <button type="button" data-action="layer-show" data-layer={layer.id} aria-label={`Show me: ${layer.label}`} onClick={onShow}>
          Show me
        </button>
      ) : null}
    </p>
  );
}

function LayerToggle({ layer, checked, onToggle, onShow }: { layer: HypothesisLayer; checked: boolean; onToggle: () => void; onShow: () => void }) {
  return (
    <div className={styles.hypothesis}>
      <label>
        <input type="checkbox" checked={checked} onChange={onToggle} data-layer={layer.id} /> {layer.label}
      </label>
      <LayerPlace layer={layer} onShow={onShow} />
      <p>{layer.note}</p>
      <p className={styles.hypothesisSources}>
        {layer.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            {source.label}
          </a>
        ))}
      </p>
    </div>
  );
}

/** A collapsible panel of conjectural layers for the model. Everything in it is off until the visitor asks. */
export function HypothesisPanel({ layers, active, locked, onToggle, onShow }: HypothesisPanelProps) {
  return (
    <details className={`${styles.disclosure} ${styles.hypotheses}`} name={WALK_PANEL_GROUP} data-locked={locked} data-role="walk-hypotheses">
      <summary>What it might have looked like</summary>
      <p className={styles.hypothesesNote}>{HYPOTHESIS_STANDING_NOTE}</p>
      {layers.map((layer) => (
        <LayerToggle key={layer.id} layer={layer} checked={active.includes(layer.id)} onToggle={() => onToggle(layer.id)} onShow={() => onShow(layer)} />
      ))}
    </details>
  );
}
