"use client";

import { useMemo } from "react";
import { DoubleSide, ExtrudeGeometry } from "three";
import type { Prism } from "@/lib/walk/rockCutModel";
import { LIE_FLAT, outlineShape } from "./outlineShape";

function TranslucentPrism({ prism }: { prism: Prism }) {
  const geometry = useMemo(() => new ExtrudeGeometry(outlineShape(prism.outline), { depth: prism.topM - prism.bottomM, bevelEnabled: false }), [prism]);
  return (
    <mesh geometry={geometry} rotation={LIE_FLAT} position={[0, prism.bottomM, 0]}>
      <meshStandardMaterial color={prism.colour} roughness={1} metalness={0} transparent opacity={prism.opacity} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** See-through upright blocks, casting no shadow, so what they would have hidden stays in view. */
export function TranslucentPrisms({ prisms }: { prisms: readonly Prism[] }) {
  return (
    <>
      {prisms.map((prism) => (
        <TranslucentPrism key={prism.id} prism={prism} />
      ))}
    </>
  );
}
