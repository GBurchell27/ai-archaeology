"use client";

import panel from "@/components/settings/SettingsPanel.module.css";
import { GLOBE_BASEMAPS } from "@/lib/globe/basemaps";
import ui from "./chrome.module.css";

/** Which registered imagery is draped on the globe. Its credit line under the globe follows the choice. */
export function GlobeBasemapSetting({ basemapId, onBasemap }: { basemapId: string; onBasemap(basemapId: string): void }) {
  return (
    <>
      {GLOBE_BASEMAPS.map((basemap) => (
        <label key={basemap.id} className={panel.choice}>
          <input type="radio" name="globe-basemap" data-basemap={basemap.id} checked={basemap.id === basemapId} onChange={() => onBasemap(basemap.id)} />
          <span>{basemap.title}</span>
          <span className={ui.muted}>{basemap.licence}</span>
        </label>
      ))}
      <p className={panel.note}>Streamed, never stored, and credited under the globe. Blue Marble is coarser close up.</p>
    </>
  );
}
