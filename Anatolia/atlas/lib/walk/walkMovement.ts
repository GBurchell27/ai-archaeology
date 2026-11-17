/** Pure movement maths for the splat view: walking on the floor and flying inside a dome. y is up, metres. */

import type { MoveIntent } from "./walkKeys";

export type Vec3 = readonly [x: number, y: number, z: number];
export type MoveMode = "walk" | "fly";
export type MoveState = { position: Vec3; velocity: Vec3 };
export type MoveLimits = {
  eyeHeightM: number;
  walkRadiusM: number;
  flyRadiusM: number;
  flyFloorM: number;
  flyCeilingM: number;
};

const SPEED_MPS: Record<MoveMode, number> = { walk: 2.2, fly: 7 };
const FAST_FACTOR = 3;
/** Time constants of the exponential easing. Smaller is snappier. */
const VELOCITY_RESPONSE_S = 0.12;
const EYE_SETTLE_S = 0.25;
const FLY_RADIUS_FACTOR = 3;
const FLY_FLOOR_M = 0.4;
const HIGHEST_CEILING_M = 40;

export function moveLimits(eyeHeightM: number, walkRadiusM: number): MoveLimits {
  return {
    eyeHeightM,
    walkRadiusM,
    flyRadiusM: walkRadiusM * FLY_RADIUS_FACTOR,
    flyFloorM: FLY_FLOOR_M,
    flyCeilingM: Math.min(walkRadiusM * 2, HIGHEST_CEILING_M),
  };
}

/** Moves `current` towards `target` by the same fraction per second whatever the frame rate. */
export function easeToward(current: number, target: number, seconds: number, responseS: number): number {
  return target + (current - target) * Math.exp(-seconds / responseS);
}

/**
 * The velocity the keys ask for. `look` is the camera's view direction (any length).
 * Walking follows the look direction flattened onto the floor. Flying follows it fully, and rises along world up.
 * Diagonals are no faster than straight lines.
 */
export function wishVelocity(mode: MoveMode, look: Vec3, intent: MoveIntent): Vec3 {
  const flatLength = Math.hypot(look[0], look[2]);
  // Looking straight up or down gives no heading, so only flying along the look direction still works.
  const heading = flatLength < 1e-3 ? [0, 0] : [look[0] / flatLength, look[2] / flatLength];
  const lookLength = Math.hypot(look[0], look[1], look[2]) || 1;
  const ahead = mode === "fly" ? look.map((part) => part / lookLength) : [heading[0], 0, heading[1]];
  // Right of forward with y up: forward × up.
  const x = ahead[0] * intent.forward - heading[1] * intent.strafe;
  const y = ahead[1] * intent.forward + (mode === "fly" ? intent.rise : 0);
  const z = ahead[2] * intent.forward + heading[0] * intent.strafe;
  const speed = (SPEED_MPS[mode] * (intent.fast ? FAST_FACTOR : 1)) / Math.max(1, Math.hypot(x, y, z));
  return [x * speed, y * speed, z * speed];
}

function withinRadius(x: number, z: number, radiusM: number): [number, number] {
  const distance = Math.hypot(x, z);
  return distance <= radiusM ? [x, z] : [(x / distance) * radiusM, (z / distance) * radiusM];
}

/**
 * One frame of movement: ease the velocity towards what the keys ask for, move, then stay inside the limits.
 * A walker's height eases to eye level, so leaving fly mode glides down instead of snapping.
 */
export function moveStep(
  from: MoveState,
  mode: MoveMode,
  look: Vec3,
  intent: MoveIntent,
  limits: MoveLimits,
  seconds: number,
): MoveState {
  const wish = wishVelocity(mode, look, intent);
  const [velocityX, flyVelocityY, velocityZ] = from.velocity.map((speed, axis) =>
    easeToward(speed, wish[axis], seconds, VELOCITY_RESPONSE_S),
  );
  const [fromX, fromY, fromZ] = from.position;
  // A walker who landed outside the walk radius is not dragged back: they just cannot go further out.
  const radiusM = mode === "fly" ? limits.flyRadiusM : Math.max(limits.walkRadiusM, Math.hypot(fromX, fromZ));
  const [x, z] = withinRadius(fromX + velocityX * seconds, fromZ + velocityZ * seconds, radiusM);
  if (mode === "walk") {
    const y = easeToward(fromY, limits.eyeHeightM, seconds, EYE_SETTLE_S);
    return { position: [x, y, z], velocity: [velocityX, 0, velocityZ] };
  }
  const y = Math.min(limits.flyCeilingM, Math.max(limits.flyFloorM, fromY + flyVelocityY * seconds));
  return { position: [x, y, z], velocity: [velocityX, flyVelocityY, velocityZ] };
}
