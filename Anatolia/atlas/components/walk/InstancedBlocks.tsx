"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Color, Object3D, type InstancedMesh, type WebGLProgramParametersWithUniforms } from "three";
import type { Block } from "@/lib/walk/enclosureModel";
import { addStoneGrain } from "./stoneGrain";
import { addShadedArrises, addWornEdges } from "./wornEdges";

type InstancedBlocksProps = {
  blocks: readonly Block[];
  colour: string;
  castShadow?: boolean;
  /** Worked stone: weathering and grain are added in the shader. */
  grained?: boolean;
  /** How far each edge is worn back, in metres, for grained blocks whose geometry is `bevelledBlockGeometry`. Without it a grained block must be a plain box. */
  wornEdgeM?: number;
  /** The height of the floor grained blocks stand on, which darkens their feet. Null for blocks that stand on no floor. */
  floorM?: number | null;
  /** The unit geometry every block scales: a box, a ball, a cone. */
  children: ReactNode;
};

/** The shader steps of worked stone, and a key that tells two different programs apart. */
function useStoneShader(wornEdgeM: number, floorM: number | null) {
  return useMemo(() => {
    const compile = (shader: WebGLProgramParametersWithUniforms) => {
      addStoneGrain(shader, floorM);
      // Added after the grain and so placed before it: the grain is read where the worn vertex ends up.
      if (wornEdgeM > 0) addWornEdges(shader, wornEdgeM);
      // A plain box has no worn geometry, so its edges are rounded in the shading instead.
      else addShadedArrises(shader);
    };
    return [compile, () => `stone-grain:${wornEdgeM}:${floorM}`] as const;
  }, [wornEdgeM, floorM]);
}

/** Many blocks of one shape and one base colour as a single instanced mesh. */
export function InstancedBlocks({ blocks, colour, castShadow = true, grained = false, wornEdgeM = 0, floorM = null, children }: InstancedBlocksProps) {
  const mesh = useRef<InstancedMesh>(null);
  const [compileStone, stoneKey] = useStoneShader(wornEdgeM, floorM);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    const placement = new Object3D();
    // Turn first, then pitch about the block's own first axis.
    placement.rotation.order = "YXZ";
    const shaded = new Color();
    blocks.forEach((block, index) => {
      placement.position.set(...block.centre);
      placement.scale.set(...block.size);
      placement.rotation.set(block.tiltRad ?? 0, block.yawRad, 0);
      placement.updateMatrix();
      instances.setMatrixAt(index, placement.matrix);
      instances.setColorAt(index, shaded.set(colour).multiplyScalar(block.shade));
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
  }, [blocks, colour]);

  if (blocks.length === 0) return null;
  return (
    // Never culled: the instances surround the walker, and the mesh's own bounds are one unit shape.
    <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]} castShadow={castShadow} receiveShadow frustumCulled={false}>
      {children}
      {grained ? (
        <meshStandardMaterial roughness={1} metalness={0} onBeforeCompile={compileStone} customProgramCacheKey={stoneKey} />
      ) : (
        <meshStandardMaterial roughness={1} metalness={0} />
      )}
    </instancedMesh>
  );
}
