import { useCallback, useEffect, useState } from "react";
import { readLegendOpen, storeLegend, useTheme } from "@/components/AtlasChrome";
import { SCROLL_SPEEDS } from "@/components/MapNavigation";
import { readStoredReliefSource, storeReliefSource, type TerrainSourceId } from "@/lib/terrainSource";

const SCROLL_SPEED_KEY = "anatolia.scrollSpeed";

export interface AtlasPreferences {
  theme: "light" | "dark";
  toggleTheme: () => void;
  terrainSource: TerrainSourceId;
  changeTerrainSource: (source: TerrainSourceId) => void;
  zoomSpeed: number;
  changeScrollSpeed: (speed: number) => void;
  legendOpen: boolean;
  toggleLegend: () => void;
}

/** Choices that are remembered in browser storage between visits. */
export function useAtlasPreferences(): AtlasPreferences {
  const [terrainSource, setTerrainSource] = useState<TerrainSourceId>("gem15");
  const [zoomSpeed, setZoomSpeed] = useState(1);
  const [legendOpen, setLegendOpen] = useState(true);
  useEffect(() => {
    const stored = readStoredReliefSource();
    if (stored !== "gem15") setTerrainSource(stored);
  }, []);
  const [theme, toggleTheme] = useTheme();
  useEffect(() => {
    setLegendOpen(readLegendOpen());
    try {
      const saved = Number(window.localStorage.getItem(SCROLL_SPEED_KEY));
      if (SCROLL_SPEEDS.some(({ value }) => value === saved)) setZoomSpeed(saved);
    } catch {
      // The current session can still use the control when storage is unavailable.
    }
  }, []);

  const changeTerrainSource = useCallback((source: TerrainSourceId) => {
    setTerrainSource(source);
    storeReliefSource(source);
  }, []);
  const changeScrollSpeed = useCallback((speed: number) => {
    setZoomSpeed(speed);
    try {
      window.localStorage.setItem(SCROLL_SPEED_KEY, String(speed));
    } catch {
      // The session value remains available.
    }
  }, []);
  const toggleLegend = useCallback(() => setLegendOpen((open) => {
    const next = !open;
    storeLegend(next);
    return next;
  }), []);

  return { theme, toggleTheme, terrainSource, changeTerrainSource, zoomSpeed, changeScrollSpeed, legendOpen, toggleLegend };
}
