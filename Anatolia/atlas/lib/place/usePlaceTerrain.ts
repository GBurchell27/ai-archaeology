import { useCallback, useEffect, useState } from "react";
import { loadPlaceTerrain, PlaceTerrainError, type PlaceFailure, type PlaceTerrain } from "./placeTerrain";

export type PlaceTerrainState =
  | { status: "loading" }
  | { status: "ready"; terrain: PlaceTerrain }
  | { status: "error"; failure: PlaceFailure };

/** Loads one place's terrain window; `retry` starts the request again after a failure. */
export function usePlaceTerrain(siteId: string): { state: PlaceTerrainState; retry: () => void } {
  const [state, setState] = useState<PlaceTerrainState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const cancel = new AbortController();
    setState({ status: "loading" });
    loadPlaceTerrain(siteId, cancel.signal).then(
      (terrain) => setState({ status: "ready", terrain }),
      (error: unknown) => {
        if (cancel.signal.aborted) return;
        setState({ status: "error", failure: error instanceof PlaceTerrainError ? error.failure : "failed" });
      },
    );
    return () => cancel.abort();
  }, [siteId, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { state, retry };
}
