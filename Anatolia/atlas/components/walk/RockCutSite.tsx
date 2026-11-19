"use client";

import type { HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { RockCutModel } from "@/lib/walk/rockCutModel";
import { BedrockTerrace } from "./BedrockTerrace";
import { EnclosureStones } from "./EnclosureStones";
import { RockCarvings } from "./RockCarvings";
import { TranslucentPrisms } from "./TranslucentPrisms";

/** A site cut into bedrock: the rock, what was carved from it, what was built in it, and the conjectural layers switched on. */
export function RockCutSite({ site, hypotheses }: { site: RockCutModel; hypotheses: readonly HypothesisLayerId[] }) {
  const layers = hypotheses.flatMap((layerId) => site.layerDrawings[layerId] ?? []);
  return (
    <>
      <BedrockTerrace site={site} />
      <RockCarvings site={site} />
      <EnclosureStones boxes={site.boxes} floorM={site.lowGroundM} />
      {layers.map((layer, index) => (
        <group key={index}>
          <EnclosureStones boxes={layer.boxes} floorM={null} />
          <TranslucentPrisms prisms={layer.prisms} />
        </group>
      ))}
    </>
  );
}
