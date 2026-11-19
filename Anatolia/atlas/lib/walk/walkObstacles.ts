/** What a walker cannot walk through: footprints of pillars and walls on the floor plan, and ground too high to step up. Pure. */

import type { Block, PlanPoint } from "./enclosureModel";
import type { GroundHeight, WalkerStep } from "./walkMovement";

/**
 * A footprint on the floor plan: a box reaching `halfSizeM` to each side of its centre along its own two axes, turned
 * by `yawRad` like the block it stands for, and swollen by `roundM` all round. A round pillar is a box of no size
 * swollen to its radius; a piece of wall is a line swollen to half the wall's thickness.
 */
export type Obstacle = { centre: PlanPoint; halfSizeM: readonly [number, number]; yawRad: number; roundM: number };

/** The walker's middle stays this far from every obstacle and rock face. Not a published figure: it keeps the eye out of the stone. */
export const WALKER_RADIUS_M = 0.3;
/** The walker steps up this much and no more: enough for the tallest bench step drawn, 0.62 m in Karahan Tepe's Structure AD. */
export const HIGHEST_STEP_M = 0.7;
/** Rock that rises more than this above the walker's feet nears their eye, so they keep a radius back from it. Lower rock they may stand against. */
const TALLEST_RISE_STOOD_AGAINST_M = 2 * HIGHEST_STEP_M;
/** Pushing out of one obstacle can push into its neighbour, so the obstacles are gone through twice. */
const PUSH_OUT_PASSES = 2;

export const roundObstacle = (centre: PlanPoint, radiusM: number): Obstacle => ({ centre, halfSizeM: [0, 0], yawRad: 0, roundM: radiusM });

/** The footprint of a drawn block. */
export const blockObstacle = ({ centre, size, yawRad }: Pick<Block, "centre" | "size" | "yawRad">): Obstacle => ({
  centre: [centre[0], centre[2]],
  halfSizeM: [size[0] / 2, size[2] / 2],
  yawRad,
  roundM: 0,
});

/** The point itself, or the nearest point a walker's radius clear of the obstacle when it is nearer than that. */
export function pushedOut([east, south]: PlanPoint, { centre, halfSizeM, yawRad, roundM }: Obstacle): PlanPoint {
  const [sine, cosine] = [Math.sin(yawRad), Math.cos(yawRad)];
  const [offEast, offSouth] = [east - centre[0], south - centre[1]];
  // In the box's own axes, as three.js turns a block about the upright axis.
  const own = [offEast * cosine - offSouth * sine, offEast * sine + offSouth * cosine];
  const nearest = own.map((part, axis) => Math.min(halfSizeM[axis], Math.max(-halfSizeM[axis], part)));
  const reachM = roundM + WALKER_RADIUS_M;
  const awayM = Math.hypot(own[0] - nearest[0], own[1] - nearest[1]);
  if (awayM >= reachM) return [east, south];
  const moved = [...own];
  if (awayM > 1e-9) {
    nearest.forEach((part, axis) => (moved[axis] = part + ((own[axis] - part) / awayM) * reachM));
  } else {
    // Inside the box itself: out through the nearest face.
    const axis = halfSizeM[0] - Math.abs(own[0]) < halfSizeM[1] - Math.abs(own[1]) ? 0 : 1;
    moved[axis] = (own[axis] < 0 ? -1 : 1) * (halfSizeM[axis] + reachM);
  }
  return [centre[0] + moved[0] * cosine + moved[1] * sine, centre[1] - moved[0] * sine + moved[1] * cosine];
}

/**
 * Where a walker who meant to go from `from` to `to` ends this frame. They are pushed out of every obstacle by the
 * shortest way, which slides them along it. Ground more than a step above where they stand stops them, a radius
 * short where it is a tall face; they keep whichever of the two plan directions is still open, and so slide along a
 * rock face too. Any drop is allowed.
 */
export function walkerStep(from: PlanPoint, to: PlanPoint, obstacles: readonly Obstacle[], groundHeightM: GroundHeight): PlanPoint {
  const clearOf = (point: PlanPoint) => {
    let clear = point;
    for (let pass = 0; pass < PUSH_OUT_PASSES; pass += 1) clear = obstacles.reduce<PlanPoint>(pushedOut, clear);
    return clear;
  };
  const clear = clearOf(to);
  const feetM = groundHeightM(from[0], from[1]);
  const canReach = ([east, south]: PlanPoint) => {
    const [stepEast, stepSouth] = [east - from[0], south - from[1]];
    const stepM = Math.hypot(stepEast, stepSouth);
    if (stepM < 1e-9) return true;
    if (groundHeightM(east, south) > feetM + HIGHEST_STEP_M) return false;
    return groundHeightM(east + (stepEast / stepM) * WALKER_RADIUS_M, south + (stepSouth / stepM) * WALKER_RADIUS_M) <= feetM + TALLEST_RISE_STOOD_AGAINST_M;
  };
  if (canReach(clear)) return clear;
  return [clearOf([clear[0], from[1]]), clearOf([from[0], clear[1]])].find(canReach) ?? from;
}

/** `walkerStep` for the movement limits of one model. */
export const obstructedBy = (obstacles: readonly Obstacle[], groundHeightM: GroundHeight): WalkerStep => (from, to) => walkerStep(from, to, obstacles, groundHeightM);
