"use client";

import { useCallback, useState } from "react";
import type { WalkSource } from "./WalkSourceToggle";

/**
 * A render error caught in the scene, remembered with the source that threw it.
 * Switching source drops it. `attempt` is the key that remounts the scene on Try again.
 */
export function useSceneFailure(source: WalkSource): [unknown, (error: unknown) => void, () => void, number] {
  const [attempt, setAttempt] = useState(0);
  const [caught, setCaught] = useState<{ source: WalkSource; error: unknown } | null>(null);
  const report = useCallback((error: unknown) => setCaught({ source, error }), [source]);
  const retry = useCallback(() => {
    setCaught(null);
    setAttempt((current) => current + 1);
  }, []);
  const error = caught?.source === source ? caught.error : null;
  return [error, report, retry, attempt];
}
