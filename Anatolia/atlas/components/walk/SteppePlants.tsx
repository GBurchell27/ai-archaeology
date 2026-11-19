"use client";

import { useMemo } from "react";
import type { Enclosure } from "@/lib/walk/enclosureModel";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { steppePlants, tuftBladeCorners } from "@/lib/walk/steppePlants";
import { InstancedBlocks } from "./InstancedBlocks";

/**
 * The unit tuft, each blade drawn facing both ways. Every normal points up, so a blade takes the light the ground
 * under it takes and neither face goes dark as the walker passes.
 */
function tuftGeometry(): BufferGeometry {
  const corners = tuftBladeCorners();
  const facingBack: number[] = [];
  for (let corner = 0; corner < corners.length; corner += 9) {
    facingBack.push(...corners.slice(corner, corner + 3), ...corners.slice(corner + 6, corner + 9), ...corners.slice(corner + 3, corner + 6));
  }
  const positions = [...corners, ...facingBack];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(positions.map((_, index) => (index % 3 === 1 ? 1 : 0)), 3));
  return geometry;
}

/** The conjectural surroundings: widely spaced low trees and grass tufts, three instanced meshes in all. */
export function SteppePlants({ enclosures }: { enclosures: readonly Enclosure[] }) {
  const plants = useMemo(() => steppePlants(enclosures), [enclosures]);
  const tuft = useMemo(tuftGeometry, []);
  return (
    <>
      <InstancedBlocks blocks={plants.trunks} colour="#5b4a38">
        <cylinderGeometry args={[0.35, 0.5, 1, 6]} />
      </InstancedBlocks>
      <InstancedBlocks blocks={plants.crowns} colour="#6c7a46">
        <icosahedronGeometry args={[0.5, 1]} />
      </InstancedBlocks>
      <InstancedBlocks blocks={plants.tufts} colour="#8d8c55" castShadow={false}>
        <primitive object={tuft} attach="geometry" />
      </InstancedBlocks>
    </>
  );
}
