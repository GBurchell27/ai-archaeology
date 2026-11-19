"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { Vector3 } from "three";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import { markerName, nameWidthPx, unclutteredNameIds, type NameTag } from "@/lib/walk/markerNames";

const NO_NAMES: ReadonlySet<string> = new Set();

/**
 * The ids of the landmarks whose names fit on screen without covering one another, checked each frame from where
 * the camera is. `nameLiftM` is how far above its marker a name floats. The state changes only when the set does.
 */
export function useUnclutteredNames(landmarks: readonly PlacedLandmark[], nameLiftM: number, enabled: boolean): ReadonlySet<string> {
  const [shownIds, setShownIds] = useState(NO_NAMES);
  const point = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    if (!enabled) return;
    const tags = landmarks.flatMap(({ landmark, markerM }): NameTag[] => {
      point.set(markerM[0], markerM[1] + nameLiftM, markerM[2]);
      const distanceM = point.distanceTo(camera.position);
      point.project(camera);
      // Past the far plane after projection means behind the camera.
      if (point.z > 1) return [];
      const [xPx, yPx] = [(point.x * 0.5 + 0.5) * size.width, (0.5 - point.y * 0.5) * size.height];
      return [{ id: landmark.id, xPx, yPx, widthPx: nameWidthPx(markerName(landmark.name)), distanceM }];
    });
    const ids = unclutteredNameIds(tags, shownIds);
    if (ids.length !== shownIds.size || ids.some((id) => !shownIds.has(id))) setShownIds(new Set(ids));
  });

  return enabled ? shownIds : NO_NAMES;
}
