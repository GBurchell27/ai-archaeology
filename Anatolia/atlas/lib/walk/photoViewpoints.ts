/**
 * Where a splat's training photographs were taken, and how far from them the splat can be trusted. A splat is a
 * picture of its photographs: from where a photographer stood it is sharp, and away from every one of them it is
 * the trainer's guess. Pure maths; each site's table is written by scripts/splat/export_viewpoints.py.
 */

import type { LayerViewpoint } from "./hypothesisLayers";
import type { Vec3 } from "./walkMovement";

/** One camera position and a point 10 m along its view, in walk metres. A camera position, never a find. */
export type PhotoViewpoint = { positionM: Vec3; lookAtM: Vec3 };

/** Within this distance of a camera the splat is drawn in full. [EST] chosen by eye. */
export const SHARP_WITHIN_M = 6;
/** Beyond this distance from every camera nothing of the splat is drawn. [EST] chosen by eye. */
export const GONE_BEYOND_M = 22;

/** The distance to the nearest camera, or infinity for a site with none listed. */
export function nearestViewpointDistanceM(viewpoints: readonly PhotoViewpoint[], position: Vec3): number {
  return viewpoints.reduce((nearestM, { positionM }) => Math.min(nearestM, Math.hypot(position[0] - positionM[0], position[1] - positionM[1], position[2] - positionM[2])), Infinity);
}

/**
 * How much of the splat to draw for a viewer at `position`: 1 near a camera, easing to 0 far from every one.
 * A site with no cameras listed is drawn in full, because there is nothing to judge it by.
 */
export function splatOpacityAt(viewpoints: readonly PhotoViewpoint[], position: Vec3): number {
  if (viewpoints.length === 0) return 1;
  const distanceM = nearestViewpointDistanceM(viewpoints, position);
  const along = Math.min(1, Math.max(0, (distanceM - SHARP_WITHIN_M) / (GONE_BEYOND_M - SHARP_WITHIN_M)));
  return 1 - along * along * (3 - 2 * along);
}

/** The viewpoint one step on from `current` (null before any jump), round and round. */
export function steppedViewpointIndex(current: number | null, step: 1 | -1, count: number): number {
  if (current === null) return step === 1 ? 0 : count - 1;
  return (current + step + count) % count;
}

/** Where a walker of this eye height stands to see what the camera saw: under the camera, looking the same way. */
export function standingViewpoint({ positionM, lookAtM }: PhotoViewpoint, eyeHeightM: number): LayerViewpoint {
  return { standAt: [positionM[0], positionM[2]], lookAt: [lookAtM[0], lookAtM[1] - positionM[1] + eyeHeightM, lookAtM[2]] };
}
