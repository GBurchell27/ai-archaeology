"use client";

import { Html } from "@react-three/drei";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import { markerName } from "@/lib/walk/markerNames";
import { useUnclutteredNames } from "./useUnclutteredNames";
import styles from "./WalkView.module.css";

const GOLD = "#dba545";
/** Below the walk chrome, which sits at z-index 5. */
const NAME_Z_INDEX_RANGE = [4, 0];

/** How far above its marker a name floats. */
const NAME_LIFT_M = 0.6;

function GoldMaterial() {
  return <meshBasicMaterial color={GOLD} fog={false} toneMapped={false} />;
}

/**
 * A still gold ring and bead above each landmark, and its name while `showNames` is set (when flying), so landmarks
 * can be found from the air. Where names would cover one another only the nearest shows. Nothing moves, so there is
 * nothing to stop for reduced motion.
 */
export function LandmarkMarkers({ landmarks, showNames }: { landmarks: readonly PlacedLandmark[]; showNames: boolean }) {
  const namedIds = useUnclutteredNames(landmarks, NAME_LIFT_M, showNames);
  return (
    <>
      {landmarks.map(({ landmark, markerM }) => (
        <group key={landmark.id} position={[...markerM]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.03, 8, 28]} />
            <GoldMaterial />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.07, 12, 8]} />
            <GoldMaterial />
          </mesh>
          {namedIds.has(landmark.id) ? (
            <Html center position={[0, NAME_LIFT_M, 0]} zIndexRange={NAME_Z_INDEX_RANGE} className={styles.landmarkName} pointerEvents="none">
              {markerName(landmark.name)}
            </Html>
          ) : null}
        </group>
      ))}
    </>
  );
}
