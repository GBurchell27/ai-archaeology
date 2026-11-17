import { useEffect } from "react";
import type { TerrainSourceId } from "@/lib/terrainSource";
import type { YearRange } from "@/lib/timeline";
import type { BaseMap, LayerId } from "@/lib/types";

export interface BodyDatasetState {
  selectedId: string | null;
  settingsOpen: boolean;
  panelOpen: boolean;
  busy: boolean;
  baseMap: BaseMap;
  layers: Record<LayerId, boolean>;
  range: YearRange;
  periodId: string;
  showUndated: boolean;
  terrainSource: TerrainSourceId;
}

/** Mirrors atlas state onto `document.body.dataset`, which the browser checks read. */
export function useBodyDataset(state: BodyDatasetState): void {
  const { selectedId, settingsOpen, panelOpen, busy, baseMap, layers, range, periodId, showUndated, terrainSource } = state;
  useEffect(() => {
    document.body.dataset.site = selectedId ?? "";
    document.body.dataset.settings = settingsOpen ? "open" : "closed";
    document.body.dataset.panel = panelOpen ? "open" : "closed";
    document.body.dataset.busy = busy ? "true" : "false";
    document.body.dataset.base = baseMap;
    document.body.dataset.reliefSource = terrainSource;
    document.body.dataset.yearStart = String(range.start);
    document.body.dataset.yearEnd = String(range.end);
    document.body.dataset.period = periodId || "custom";
    document.body.dataset.undated = showUndated ? "show" : "hide";
    for (const [layer, enabled] of Object.entries(layers)) {
      document.body.dataset[layer] = enabled ? "on" : "off";
    }
  }, [selectedId, settingsOpen, panelOpen, busy, baseMap, layers, range, periodId, showUndated, terrainSource]);
}
