import { useCallback, useEffect, useState } from "react";
import { ReliefFetchError, loadTerrain, type LoadedTerrain } from "@/lib/placeTerrainLoad";
import { reliefLoadFailure, type TerrainSourceId } from "@/lib/terrainSource";
import type { DetailRecord } from "@/lib/types";

export interface PlaceTerrainState {
  /** The loaded close-up terrain, only while it matches the active place and relief source. */
  activeTerrain: LoadedTerrain | null;
  busy: boolean;
  reliefError: string | null;
  clearReliefError: () => void;
}

/** Loads the close-up height grid for the active place.
 *  `activeRecord` must keep its identity between renders, or the load restarts every render. */
export function usePlaceTerrain(
  activeId: string | undefined,
  activeRecord: DetailRecord | undefined,
  terrainSource: TerrainSourceId,
  onPanelShown: (shown: boolean) => void,
): PlaceTerrainState {
  const [loadedTerrain, setLoadedTerrain] = useState<LoadedTerrain | null>(null);
  const [reliefError, setReliefError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId) {
      setReliefError(null);
      document.body.dataset.detail = "";
      return;
    }
    document.body.dataset.detail = "loading";
    setReliefError(null);
    const controller = new AbortController();
    loadTerrain(activeId, activeRecord, terrainSource, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setLoadedTerrain(result);
      setReliefError(null);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      const failure = reliefLoadFailure(reason instanceof ReliefFetchError ? reason.status : 0);
      setLoadedTerrain({ id: activeId, source: terrainSource, grid: null });
      onPanelShown(failure.panelOpen);
      setReliefError(failure.message);
      document.body.dataset.detail = failure.detailState;
    });
    return () => controller.abort();
    // onPanelShown is a state setter; leaving it out keeps the load keyed to the place alone.
  }, [activeId, activeRecord, terrainSource]);

  const activeTerrain = loadedTerrain
    && loadedTerrain.id === activeId
    && loadedTerrain.source === terrainSource
    ? loadedTerrain
    : null;
  const clearReliefError = useCallback(() => setReliefError(null), []);
  return { activeTerrain, busy: Boolean(activeId && !activeTerrain), reliefError, clearReliefError };
}
