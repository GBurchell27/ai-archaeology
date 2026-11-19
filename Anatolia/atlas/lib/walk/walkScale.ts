/**
 * How a walk model is moved through and lit, for a site far larger than a building. Every figure defaults to what the
 * pillar sites use, so a model that names none is unchanged. Pure.
 */

import { BUILDING_MOVE_SCALE, type MoveScale } from "./walkMovement";

export type WalkScale = MoveScale & {
  /** The sun's one shadow map reaches this far from the walker's start. */
  shadowReachM: number;
  /** The haze, the far hills, the sky, the edge of the ground and the far plane all stand this many times further off. */
  backdropFactor: number;
  /** The gold ring over a landmark is this many times larger, so it can be seen from as far as the site is wide. */
  markerScale: number;
};

/** A site of buildings a few tens of metres across: Göbekli Tepe and Karahan Tepe. */
export const BUILDING_SCALE: WalkScale = { ...BUILDING_MOVE_SCALE, shadowReachM: 128, backdropFactor: 1, markerScale: 1 };

export function walkScaleOf(model: { scale?: Partial<WalkScale> }): WalkScale {
  return { ...BUILDING_SCALE, ...model.scale };
}
