"use client";

import type { ReactNode } from "react";
import { SafeLink } from "@/components/SafeLink";
import type { WorldIndex } from "@/lib/world/catalogueTypes";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";
import ui from "./chrome.module.css";
import styles from "./LayersPanel.module.css";
import { PanelShell } from "./PanelShell";

function LayerSwitch(props: { dataRole: string; title: string; checked: boolean; onChange(checked: boolean): void; children: ReactNode }) {
  return (
    <div className={styles.layer}>
      <label className={`${ui.switch} ${styles.layerSwitch}`}>
        <input type="checkbox" data-role={props.dataRole} checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
        <span className={ui.switchTrack} />
        <span className={styles.layerTitle}>{props.title}</span>
      </label>
      <p className={`${ui.prose} ${styles.note}`}>{props.children}</p>
    </div>
  );
}

/** What is drawn on the globe besides the main catalogue. */
export function LayersPanel(props: {
  osmMegaliths: WorldIndex["osmMegaliths"];
  showOsmMegaliths: boolean;
  featuredOnly: boolean;
  onShowOsmMegaliths(show: boolean): void;
  onFeaturedOnly(only: boolean): void;
  /**
   * Reserved for the predictive layer ("where published sites of this kind tend to be recorded").
   * Whatever is passed is mounted under its own heading; this panel knows nothing else about it.
   */
  modelSlot?: ReactNode;
  onClose(): void;
}) {
  const megalithCount = props.osmMegaliths?.count.toLocaleString("en-GB");
  return (
    <PanelShell dataRole="layers-panel" title="Layers" closeLabel="Close the layers panel" onClose={props.onClose}>
      <LayerSwitch dataRole="featured-only" title="Wonders only" checked={props.featuredOnly} onChange={props.onFeaturedOnly}>
        Hide everything except the hand-picked monuments.
      </LayerSwitch>
      {props.osmMegaliths ? (
        <LayerSwitch dataRole="osm-megaliths" title="OpenStreetMap megaliths" checked={props.showOsmMegaliths} onChange={props.onShowOsmMegaliths}>
          <i className={ui.swatch} style={{ ["--swatch" as string]: OSM_MEGALITH_STYLE.color }} /> {megalithCount} standing stones, dolmens and
          stone rows mapped by volunteers, kept apart from the catalogue because of its share-alike licence. Almost none carry dates, so they go when undated sites are switched off.{" "}
          <SafeLink href={OSM_MEGALITH_STYLE.attributionUrl}>{OSM_MEGALITH_STYLE.attribution}</SafeLink>.
        </LayerSwitch>
      ) : null}
      {/* Reserved slot: the predictive-layer controls mount here. Nothing renders until a later change passes `modelSlot`. */}
      {props.modelSlot ? (
        <section className={styles.model} aria-label="Recording-pattern layer" data-role="model-slot">{props.modelSlot}</section>
      ) : null}
    </PanelShell>
  );
}
