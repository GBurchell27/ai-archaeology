"use client";

import { useCallback, useState, type RefObject } from "react";
import { standingViewpoint, steppedViewpointIndex, type PhotoViewpoint } from "@/lib/walk/photoViewpoints";
import type { WalkerHandle } from "./WalkControls";

/**
 * Which viewpoint the visitor last jumped to (null before any jump), and the step to the next or the one before.
 * The walker is stood there at once, as "Show me" does, so there is no flight to stop for reduced motion.
 */
export function useViewpointSteps(viewpoints: readonly PhotoViewpoint[], eyeHeightM: number, walker: RefObject<WalkerHandle | null>): [number | null, (step: 1 | -1) => void] {
  const [current, setCurrent] = useState<number | null>(null);
  const stepTo = useCallback((step: 1 | -1) => {
    if (viewpoints.length === 0) return;
    const next = steppedViewpointIndex(current, step, viewpoints.length);
    walker.current?.standAt(standingViewpoint(viewpoints[next], eyeHeightM));
    setCurrent(next);
  }, [current, eyeHeightM, viewpoints, walker]);
  return [current, stepTo];
}
