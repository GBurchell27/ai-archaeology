/** Pure movement maths for the walk view: walking on the ground and flying inside a dome. y is up, metres. */

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
  /** The height of the ground under a point, where a site's floors are not all at y = 0. */
  groundHeightM: GroundHeight;
};

export type GroundHeight = (x: number, z: number) => number;

const SPEED_MPS: Record<MoveMode, number> = { walk: 2.2, fly: 7 };
const FAST_FACTOR = 3;
/** Time constants of the exponential easing. Smaller is snappier. */
const VELOCITY_RESPONSE_S = 0.12;
const EYE_SETTLE_S = 0.25;
const FLY_RADIUS_FACTOR = 3;
const FLY_FLOOR_M = 0.4;
const HIGHEST_CEILING_M = 40;
const CLIMB_RESPONSE_S = 0.15;
const CLIMB_M_PER_WHEEL_UNIT = 0.015;
const LARGEST_PENDING_CLIMB_M = 20;
const FLAT_GROUND: GroundHeight = () => 0;

export function moveLimits(eyeHeightM: number, walkRadiusM: number, groundHeightM: GroundHeight = FLAT_GROUND): MoveLimits {
  return {
    eyeHeightM,
    walkRadiusM,
    flyRadiusM: walkRadiusM * FLY_RADIUS_FACTOR,
    flyFloorM: FLY_FLOOR_M,
    flyCeilingM: Math.min(walkRadiusM * 2, HIGHEST_CEILING_M),
    groundHeightM,
  };
}

/** Where the walker's eyes are when standing at the start, which is the origin. */
export function startPosition(limits: MoveLimits): Vec3 {
  return standingAt(limits, 0, 0);
}

/** Where the walker's eyes are when standing on the ground at a point. */
export function standingAt(limits: MoveLimits, x: number, z: number): Vec3 {
  return [x, limits.groundHeightM(x, z) + limits.eyeHeightM, z];
}

/** Moves `current` towards `target` by the same fraction per second whatever the frame rate. */
export function easeToward(current: number, target: number, seconds: number, responseS: number): number {
  return target + (current - target) * Math.exp(-seconds / responseS);
}

/**
 * Whether the wheel may climb yet. A walk entered by zooming in arrives with the wheel still turning (a trackpad
 * keeps sending its inertia), and that tail must not lift the walker off. Time is counted in drawn frames, not by
 * the clock: while the page is stalled the browser holds wheel events back, and that must not look like a pause.
 */
export type WheelGate = { open: boolean; shownForMs: number; stillForMs: number };

/** No wheel movement counts until the walk has been drawn for this long. */
export const WHEEL_GRACE_MS = 1500;
/** After that, the first movement to count is one that follows a pause this long: longer than the gap between slow, deliberate notches. */
export const WHEEL_STILL_MS = 1000;
/** A frame that took longer counts as this much, so one stall is never a pause. */
export const LONGEST_COUNTED_FRAME_MS = 250;

/** The gate as the walk comes on screen: shut. */
export const SHUT_WHEEL_GATE: WheelGate = { open: false, shownForMs: 0, stillForMs: 0 };

/** The gate after one drawn frame that took `frameMs`. */
export function wheelGateAfterFrame(gate: WheelGate, frameMs: number): WheelGate {
  if (gate.open) return gate;
  const countedMs = Math.min(frameMs, LONGEST_COUNTED_FRAME_MS);
  return { ...gate, shownForMs: gate.shownForMs + countedMs, stillForMs: gate.stillForMs + countedMs };
}

/** The gate after one wheel event. The event counts when the result is open; once open the gate stays open. */
export function wheelGateAfterWheel(gate: WheelGate): WheelGate {
  const rested = gate.shownForMs >= WHEEL_GRACE_MS && gate.stillForMs >= WHEEL_STILL_MS;
  return { ...gate, open: gate.open || rested, stillForMs: 0 };
}

/** Metres of climb still owed after a wheel movement. Scrolling down (positive delta) climbs. */
export function climbAfterWheel(pendingClimbM: number, wheelDeltaY: number): number {
  const wanted = pendingClimbM + wheelDeltaY * CLIMB_M_PER_WHEEL_UNIT;
  return Math.min(LARGEST_PENDING_CLIMB_M, Math.max(-LARGEST_PENDING_CLIMB_M, wanted));
}

/** The part of the owed climb to fly this frame, so a wheel notch glides instead of jumping. */
export function climbThisFrame(pendingClimbM: number, seconds: number): number {
  return pendingClimbM - easeToward(pendingClimbM, 0, seconds, CLIMB_RESPONSE_S);
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
 * A walker's height eases to eye level above the ground under them, so leaving fly mode or stepping into a sunken room
 * glides down instead of snapping. A flyer stays above that same ground.
 */
export function moveStep(
  from: MoveState,
  mode: MoveMode,
  look: Vec3,
  intent: MoveIntent,
  limits: MoveLimits,
  seconds: number,
  climbM = 0,
): MoveState {
  const wish = wishVelocity(mode, look, intent);
  const [velocityX, flyVelocityY, velocityZ] = from.velocity.map((speed, axis) =>
    easeToward(speed, wish[axis], seconds, VELOCITY_RESPONSE_S),
  );
  const [fromX, fromY, fromZ] = from.position;
  // A walker who landed outside the walk radius is not dragged back: they just cannot go further out.
  const radiusM = mode === "fly" ? limits.flyRadiusM : Math.max(limits.walkRadiusM, Math.hypot(fromX, fromZ));
  const [x, z] = withinRadius(fromX + velocityX * seconds, fromZ + velocityZ * seconds, radiusM);
  const groundM = limits.groundHeightM(x, z);
  if (mode === "walk") {
    const y = easeToward(fromY, groundM + limits.eyeHeightM, seconds, EYE_SETTLE_S);
    return { position: [x, y, z], velocity: [velocityX, 0, velocityZ] };
  }
  const y = Math.min(limits.flyCeilingM, Math.max(groundM + limits.flyFloorM, fromY + flyVelocityY * seconds + climbM));
  return { position: [x, y, z], velocity: [velocityX, flyVelocityY, velocityZ] };
}
