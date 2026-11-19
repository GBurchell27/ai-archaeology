"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";
import type { Enclosure } from "@/lib/walk/enclosureModel";
import { modelRoofs, type RoofCover } from "@/lib/walk/roofModel";
import { EnclosureStones } from "./EnclosureStones";

/**
 * Translucent and casting no shadow, so the walker still sees the stones the roof would have hidden. A little glow
 * of its own stands in for evening light coming through: unlit, the underside read as a dark lid from inside.
 */
function Cover({ cover }: { cover: RoofCover }) {
  const { centre, eavesRadiusM, eavesHeightM, openingRadiusM, openingHeightM } = cover;
  return (
    <mesh position={[centre[0], (eavesHeightM + openingHeightM) / 2, centre[1]]}>
      <cylinderGeometry args={[openingRadiusM, eavesRadiusM, openingHeightM - eavesHeightM, 48, 1, true]} />
      <meshStandardMaterial color="#9c8456" roughness={1} metalness={0} emissive="#b89a62" emissiveIntensity={0.45} transparent opacity={0.42} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** The conjectural roofs: a timber frame and rafters over each enclosure under a see-through cover. */
export function HypothesisRoofs({ enclosures }: { enclosures: readonly Enclosure[] }) {
  const roofs = useMemo(() => modelRoofs(enclosures), [enclosures]);
  const timbers = useMemo(() => roofs.flatMap((roof) => roof.timbers), [roofs]);
  return (
    <>
      <EnclosureStones boxes={timbers} />
      {roofs.map((roof, index) => (
        <Cover key={index} cover={roof.cover} />
      ))}
    </>
  );
}
