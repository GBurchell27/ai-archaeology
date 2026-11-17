import { useCallback, useEffect, useState } from "react";
import { decodeHeight, type TerrainGrid } from "@/lib/terrain";
import type { RegionalTerrain } from "@/lib/types";

export interface RegionalTerrainState {
  regionalLayer: string;
  setRegionalLayer: (layer: string) => void;
  regionalGrid: TerrainGrid | null;
  regionalVisible: boolean;
  setRegionalVisible: (visible: boolean) => void;
  /** Starts the height download; safe to call many times. */
  prepareRegion: () => void;
}

/** The finer regional terrain: fetched only once something asks for it. */
export function useRegionalTerrain(regional: RegionalTerrain | null): RegionalTerrainState {
  const [regionalLayer, setRegionalLayer] = useState("");
  const [regionalRequested, requestRegional] = useState(false);
  const [regionalGrid, setRegionalGrid] = useState<TerrainGrid | null>(null);
  const [regionalVisible, setRegionalVisible] = useState(false);
  const prepareRegion = useCallback(() => requestRegional(true), []);

  useEffect(() => {
    if (!regional || !regionalRequested) return;
    const controller = new AbortController();
    fetch(`/terrain/${regional.heightFile}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const { width, height, bounds, elevation } = regional;
      const grid = decodeHeight(await response.arrayBuffer(), width, height, elevation.min, elevation.max);
      if (!controller.signal.aborted) setRegionalGrid({ width, height, bounds, metres: grid });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [regional, regionalRequested]);

  return { regionalLayer, setRegionalLayer, regionalGrid, regionalVisible, setRegionalVisible, prepareRegion };
}
