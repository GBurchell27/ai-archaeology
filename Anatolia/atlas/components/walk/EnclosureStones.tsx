"use client";

import { useMemo } from "react";
import type { BufferGeometry } from "three";
import { PILLAR_BASE_TAPER, type StoneBox, type StoneKind } from "@/lib/walk/enclosureModel";
import { LIMB_TAPER } from "@/lib/walk/pillarRelief";
import { InstancedBlocks } from "./InstancedBlocks";
import { bevelledBlockGeometry } from "./wornEdges";

/**
 * Weathered limestone: the wall stones a shade darker and greyer than the dressed pillars. Timber for a conjectural
 * roof, the even tone of a face cut from living rock, and near-black for an opening.
 */
export const STONE_COLOUR: Record<StoneKind, string> = {
  stone: "#bdb3a0",
  slab: "#bdb3a0",
  pillar: "#e0d7c4",
  dressed: "#e0d7c4",
  limb: "#e0d7c4",
  timber: "#6f563a",
  rock: "#c9bfa9",
  dark: "#1d1813",
};
const KINDS = Object.keys(STONE_COLOUR) as StoneKind[];
/** Laid and dressed limestone carries weathering and grain. Living rock has its own material; timber and darkness stay plain. */
const GRAINED_KINDS: readonly StoneKind[] = ["stone", "slab", "pillar", "dressed", "limb"];
/**
 * How far the edges of a stone seen on its own are worn back, in metres, chosen by eye: a dressed arris is worn a
 * little, a rough slab more. The thousands of wall stones stay plain boxes, which keeps the model light.
 */
const WORN_EDGE_M: Partial<Record<StoneKind, number>> = { slab: 0.045, pillar: 0.035, dressed: 0.025, limb: 0.025 };

/**
 * The unit shape of each kind with worn edges. A T-pillar's shaft and head are narrower at the foot along their
 * length, and a limb in relief narrows to its far end, so neither is a plain box.
 */
function wornShapes(): Partial<Record<StoneKind, BufferGeometry>> {
  const block = bevelledBlockGeometry();
  return { slab: block, dressed: block, pillar: bevelledBlockGeometry({ footTaper: PILLAR_BASE_TAPER }), limb: bevelledBlockGeometry({ endTaper: LIMB_TAPER }) };
}

/**
 * Every block of a model, one instanced mesh for each kind of stone. `floorM` is the floor they stand on, where their
 * feet are darker; null for blocks that lie on something else.
 */
export function EnclosureStones({ boxes, floorM = 0 }: { boxes: readonly StoneBox[]; floorM?: number | null }) {
  const shapes = useMemo(wornShapes, []);
  const boxesOfKind = useMemo(() => KINDS.map((kind) => boxes.filter((box) => box.kind === kind)), [boxes]);
  return (
    <>
      {KINDS.map((kind, index) => (
        <InstancedBlocks key={kind} blocks={boxesOfKind[index]} colour={STONE_COLOUR[kind]} grained={GRAINED_KINDS.includes(kind)} wornEdgeM={WORN_EDGE_M[kind]} floorM={floorM}>
          {shapes[kind] ? <primitive object={shapes[kind]} attach="geometry" /> : <boxGeometry />}
        </InstancedBlocks>
      ))}
    </>
  );
}
