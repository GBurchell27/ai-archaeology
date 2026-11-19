"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPaleoIndex, nearestPaleoStep, paleoYearForSpan, type PaleoIndex, type PaleoStep } from "@/lib/world/paleoIndex";
import type { YearSpan } from "@/lib/world/worldEras";

export interface PaleoLayerViewModel {
  enabled: boolean;
  index: PaleoIndex | null;
  /** Why the step list did not load, in words for the panel. */
  error: string | null;
  /** The step picked by hand; null while the layer follows the timeline. */
  pickedYear: number | null;
  /** The step on the globe; null until the index has loaded. */
  step: PaleoStep | null;
  /** The camera is so low that the layer has faded out. */
  tooClose: boolean;
  setEnabled(enabled: boolean): void;
  setPickedYear(year: number | null): void;
  setTooClose(tooClose: boolean): void;
}

/** State of the ice and sea level layer: off by default; its index is fetched when it is first switched on. */
export function usePaleoLayer(yearSpan: YearSpan): PaleoLayerViewModel {
  const [enabled, setEnabled] = useState(false);
  const [index, setIndex] = useState<PaleoIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const [tooClose, setTooClose] = useState(false);

  useEffect(() => {
    if (!enabled || index) return undefined;
    let cancelled = false;
    setError(null);
    loadPaleoIndex().then(
      (loaded) => { if (!cancelled) setIndex(loaded); },
      (reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); },
    );
    return () => { cancelled = true; };
  }, [enabled, index]);

  const [spanStart, spanEnd] = yearSpan;
  const step = useMemo(
    () => (index ? nearestPaleoStep(index.steps, pickedYear ?? paleoYearForSpan([spanStart, spanEnd])) : null),
    [index, pickedYear, spanStart, spanEnd],
  );
  return useMemo(
    () => ({ enabled, index, error, pickedYear, step, tooClose, setEnabled, setPickedYear, setTooClose }),
    [enabled, index, error, pickedYear, step, tooClose],
  );
}
