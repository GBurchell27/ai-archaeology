"use client";

import type { ReactNode } from "react";
import type { HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PyramidField, SquareFrustum } from "@/lib/walk/pyramidModel";
import { STONE_COLOUR } from "./EnclosureStones";
import { InstancedBlocks } from "./InstancedBlocks";

/** Weathered casing that still stands, and the two stones of the casing as first built. Chosen by eye. */
const STANDING_CASING_COLOUR = "#d6ccb6";
const AS_BUILT_COLOUR: Record<SquareFrustum["tone"], string> = { limestone: "#f1ead9", granite: "#a98274" };
const AS_BUILT_OPACITY = 0.55;

/** A four-sided cylinder is a diamond in plan: its corners lie half a diagonal out, an eighth of a turn from the sides. */
function Frustum({ frustum, castShadow = false, children }: { frustum: SquareFrustum; castShadow?: boolean; children: ReactNode }) {
  const { centre, bottomM, topM, bottomSideM, topSideM, yawRad } = frustum;
  return (
    <mesh position={[centre[0], (bottomM + topM) / 2, centre[1]]} rotation={[0, Math.PI / 4 + yawRad, 0]} castShadow={castShadow} receiveShadow={!castShadow}>
      <cylinderGeometry args={[topSideM / Math.SQRT2, bottomSideM / Math.SQRT2, topM - bottomM, 4, 1]} />
      {children}
    </mesh>
  );
}

/**
 * Pyramids on open ground: each core as its courses in one instanced mesh, the casing that still stands, and the
 * conjectural layers switched on. The courses are finer than the shadow map, so they cast no shadow themselves:
 * a plain solid just inside each core, never drawn, casts it for them.
 */
export function PyramidSite({ site, hypotheses }: { site: PyramidField; hypotheses: readonly HypothesisLayerId[] }) {
  const asBuilt = hypotheses.flatMap((layerId) => site.layerDrawings[layerId] ?? []);
  return (
    <>
      <InstancedBlocks blocks={site.courses} colour={STONE_COLOUR.stone} castShadow={false} grained floorM={0}>
        <boxGeometry />
      </InstancedBlocks>
      {site.standingCasing.map((frustum, index) => (
        <Frustum key={`standing-${index}`} frustum={frustum}>
          <meshStandardMaterial color={STANDING_CASING_COLOUR} roughness={1} metalness={0} flatShading />
        </Frustum>
      ))}
      {site.shadowSolids.map((frustum, index) => (
        <Frustum key={`shadow-${index}`} frustum={frustum} castShadow>
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </Frustum>
      ))}
      {asBuilt.map((frustum, index) => (
        // See-through and casting no shadow, so the core that stands stays in view under it.
        <Frustum key={`as-built-${index}`} frustum={frustum}>
          <meshStandardMaterial color={AS_BUILT_COLOUR[frustum.tone]} roughness={1} metalness={0} flatShading transparent opacity={AS_BUILT_OPACITY} depthWrite={false} />
        </Frustum>
      ))}
    </>
  );
}
