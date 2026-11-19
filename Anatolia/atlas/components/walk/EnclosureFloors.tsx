"use client";

import { outerRadiusM, type Enclosure } from "@/lib/walk/enclosureModel";
import { BedrockMaterial } from "./BedrockMaterial";

/** Just above the earth, so the two never fight for the same depth. */
const FLOOR_LIFT_M = 0.02;

/** The floor inside each enclosure as a pale, mottled disc: smoothed bedrock in C and D, terrazzo in B. A's is not excavated. */
export function EnclosureFloors({ enclosures }: { enclosures: readonly Enclosure[] }) {
  return (
    <>
      {enclosures.map((enclosure) => (
        <mesh key={enclosure.id} position={[enclosure.centre[0], FLOOR_LIFT_M, enclosure.centre[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[outerRadiusM(enclosure) - 0.3, 48]} />
          <BedrockMaterial colour="#9f9480" />
        </mesh>
      ))}
    </>
  );
}
