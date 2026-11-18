"use client";

import { useLayoutEffect, useRef } from "react";
import { Color, Object3D, type InstancedMesh } from "three";
import type { StoneBox } from "@/lib/walk/enclosureModel";

/** Weathered limestone: the wall stones a shade darker and greyer than the dressed pillars. */
const KIND_COLOUR: Record<StoneBox["kind"], string> = { stone: "#bdb3a0", pillar: "#e2dccd" };

/** Every stone and pillar block of a model as one instanced mesh of boxes. */
export function EnclosureStones({ boxes }: { boxes: readonly StoneBox[] }) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const stones = mesh.current;
    if (!stones) return;
    const placement = new Object3D();
    const colour = new Color();
    boxes.forEach((box, index) => {
      placement.position.set(...box.centre);
      placement.scale.set(...box.size);
      placement.rotation.set(0, box.yawRad, 0);
      placement.updateMatrix();
      stones.setMatrixAt(index, placement.matrix);
      stones.setColorAt(index, colour.set(KIND_COLOUR[box.kind]).multiplyScalar(box.shade));
    });
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
  }, [boxes]);

  return (
    // Never culled: the instances surround the walker, and the mesh's own bounds are one unit box.
    <instancedMesh ref={mesh} args={[undefined, undefined, boxes.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry />
      <meshStandardMaterial roughness={1} metalness={0} />
    </instancedMesh>
  );
}
