"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { nearestLandmark, type PlacedLandmark } from "@/lib/walk/landmarks";

type LandmarkWatcherProps = {
  landmarks: readonly PlacedLandmark[];
  /** Called only when the landmark to show changes, with its id or null. */
  onNearest: (landmarkId: string | null) => void;
};

/** Watches the walker each frame and reports which landmark they have come up to. Draws nothing. */
export function LandmarkWatcher({ landmarks, onNearest }: LandmarkWatcherProps) {
  const camera = useThree((state) => state.camera);
  const look = useMemo(() => new Vector3(), []);
  const reportedId = useRef<string | null>(null);

  useFrame(() => {
    camera.getWorldDirection(look);
    const landmarkId = nearestLandmark(landmarks, camera.position.toArray(), look.toArray(), reportedId.current)?.landmark.id ?? null;
    if (landmarkId === reportedId.current) return;
    reportedId.current = landmarkId;
    onNearest(landmarkId);
  });

  // Leaving the scene (a change of source) leaves every landmark behind.
  useEffect(() => () => onNearest(null), [onNearest]);
  return null;
}
