"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { beatsEffortBaseline, loadPredictIndex, type PredictIndex, type PredictLayer } from "@/lib/world/predictIndex";
import { readModelParam, writeModelParam } from "./modelUrl";

export interface ModelLayerViewModel {
  index: PredictIndex | null;
  /** Why the layer list did not load, in words for the panel. */
  error: string | null;
  enabled: boolean;
  /** The chosen layer; null until the index has loaded. */
  layer: PredictLayer | null;
  opacity: number;
  setEnabled(enabled: boolean): void;
  selectLayer(layerId: string): void;
  setOpacity(opacity: number): void;
}

export const DEFAULT_MODEL_OPACITY = 0.8;

/** The layer shown first: one that beats the survey-effort baseline, built on the most records. */
export function defaultPredictLayer(layers: readonly PredictLayer[]): PredictLayer | null {
  const honest = layers.filter((layer) => beatsEffortBaseline(layer.metrics));
  const pool = honest.length > 0 ? honest : layers;
  return pool.reduce<PredictLayer | null>((best, layer) => (best && best.presences >= layer.presences ? best : layer), null);
}

/** State of the recording-pattern layer: off by default, switched on by a `&model=` link. */
export function useModelLayer(): ModelLayerViewModel {
  const [index, setIndex] = useState<PredictIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read once on mount; nothing on the server renders from it, so there is no hydration mismatch.
  const [linkedLayerId] = useState(readModelParam);
  const [enabled, setEnabled] = useState(linkedLayerId !== null);
  const [layerId, setLayerId] = useState<string | null>(linkedLayerId);
  const [opacity, setOpacity] = useState(DEFAULT_MODEL_OPACITY);

  useEffect(() => {
    let cancelled = false;
    loadPredictIndex().then(
      (loaded) => { if (!cancelled) setIndex(loaded); },
      (reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); },
    );
    return () => { cancelled = true; };
  }, []);

  const layer = useMemo(() => {
    if (!index) return null;
    return index.layers.find((candidate) => candidate.id === layerId) ?? defaultPredictLayer(index.layers);
  }, [index, layerId]);

  // A link naming a layer this index does not have must not switch on some other layer in its place.
  useEffect(() => {
    if (index && linkedLayerId && !index.layers.some((candidate) => candidate.id === linkedLayerId)) setEnabled(false);
  }, [index, linkedLayerId]);

  const shownLayerId = enabled ? layer?.id ?? layerId : null;
  useEffect(() => writeModelParam(shownLayerId), [shownLayerId]);

  const selectLayer = useCallback((nextLayerId: string) => setLayerId(nextLayerId), []);
  return { index, error, enabled, layer, opacity, setEnabled, selectLayer, setOpacity };
}
