"use client";

import { useEffect, useState } from "react";
import { loadGizaTerrain } from "@/lib/walk/gizaTerrainLoad";
import type { GizaTerrain } from "@/lib/walk/gizaTerrain";

export type GizaGroundState = { terrain: GizaTerrain | null; error: Error | null };

/** The prebuilt Giza ground, or nothing when this walk does not use it. */
export function useGizaGround(enabled: boolean): GizaGroundState {
  const [terrain, setTerrain] = useState<GizaTerrain | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadGizaTerrain().then(
      (loaded) => {
        if (!cancelled) setTerrain(loaded);
      },
      (reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason : new Error("Giza ground did not load"));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return { terrain, error };
}
