"use client";

import type { PhotoViewpoint } from "@/lib/walk/photoViewpoints";

/** --globe-ink: pale, where a landmark's ring is gold. */
const PALE = "#ece4d4";
/** Just above the ground the walker stands on, so the ring is at their feet and never across their eyes. */
const RING_HEIGHT_M = 0.04;

/**
 * A still pale ring on the ground under each place a training photograph was taken from: where the splat is
 * sharp. Smaller than a landmark's gold ring and without its bead. Nothing moves.
 */
export function ViewpointMarkers({ viewpoints }: { viewpoints: readonly PhotoViewpoint[] }) {
  return (
    <>
      {viewpoints.map(({ positionM: [x, , z] }, index) => (
        <mesh key={index} position={[x, RING_HEIGHT_M, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.022, 6, 24]} />
          <meshBasicMaterial color={PALE} fog={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
