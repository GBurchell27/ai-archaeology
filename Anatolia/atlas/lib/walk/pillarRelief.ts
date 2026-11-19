/**
 * The published human features of a central pillar as raised bars: arms bent at the elbow and tapering to hands with
 * long fingers that meet on the narrow front, a belt, and a loincloth below it (Schmidt 2010 for Enclosure D's
 * Pillars 18 and 31). A simplified sketch.
 * [EST] every proportion here: where the elbow sits, how high the belt is, how wide a limb or a finger is.
 */

import { PILLAR_BASE_TAPER, beamBetween, enclosurePillars, pointOnPillar, type Enclosure, type PillarPlacement, type StoneBox } from "./enclosureModel";
import type { Vec3 } from "./walkMovement";

/** How far the relief stands out from the stone. Real flat relief is shallower; this reads at walking distance. */
const RELIEF_PROUD_M = 0.03;
/** An arm narrows from the shoulder to the wrist. */
const SHOULDER_WIDTH_M = 0.2;
const WRIST_WIDTH_M = 0.11;
/** Each of the two limbs of an arm narrows by this much from its upper end to its lower, so the elbow is as wide on both. */
export const LIMB_TAPER = Math.sqrt(WRIST_WIDTH_M / SHOULDER_WIDTH_M);
/** A limb runs this far past the shoulder and past the wrist, where it meets the hand on the narrow front. */
const LIMB_OVERLAP_M = 0.03;
/** At the elbow both limbs run on until their outer edges meet, which closes the bend to a corner. */
const ELBOW_OVERLAP_M = 0.09;
/** Five fingers to a hand. */
const FINGER_COUNT = 5;
const FINGER_HEIGHT_M = 0.022;
const FINGER_PITCH_M = 0.036;
const FINGER_LENGTH_OF_FRONT = 0.44;
const BELT_DEPTH_M = 0.24;
const LOINCLOTH_DROP_M = 0.5;
/** Height as a fraction of the shaft, from its foot. */
const BELT_HEIGHT = 0.4;
/** Slightly darker than the pillar, so the relief shows in flat light too. */
const RELIEF_SHADE = 0.9;

/** A point on the broad face: `side` runs from -1 at the back edge to 1 at the narrow front, height as for the belt. */
type FacePoint = readonly [side: number, heightFraction: number];
const SHOULDER: FacePoint = [0.15, 0.95];
const ELBOW: FacePoint = [-0.6, 0.64];
const WRIST: FacePoint = [1, 0.5];

const shaftHeightM = (pillar: PillarPlacement) => pillar.size.heightM - pillar.size.headHeightM;

/** Half the width of the tapered shaft at a height given as a fraction of the shaft. */
function shaftHalfWidthM(pillar: PillarPlacement, heightFraction: number): number {
  return (pillar.size.shaftWidthM / 2) * (PILLAR_BASE_TAPER + (1 - PILLAR_BASE_TAPER) * heightFraction);
}

function shaftPoint(pillar: PillarPlacement, side: number, heightFraction: number, acrossM = 0): Vec3 {
  const upM = pillar.baseM + heightFraction * shaftHeightM(pillar);
  return pointOnPillar(pillar, side * shaftHalfWidthM(pillar, heightFraction), upM, acrossM);
}

function plainBox(pillar: PillarPlacement, centre: Vec3, size: Vec3): StoneBox {
  return { kind: "dressed", centre, size, yawRad: pillar.yawRad, shade: RELIEF_SHADE };
}

/** The arm on the broad face: down and back to the elbow, then forward to the wrist at the front edge. */
export function armPath(): FacePoint[] {
  return [SHOULDER, ELBOW, WRIST];
}

/** The point `pastM` beyond `to` on the line from `from`. */
function runOn(from: Vec3, to: Vec3, pastM: number): Vec3 {
  const lengthM = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const past = (axis: 0 | 1 | 2) => to[axis] + ((to[axis] - from[axis]) * pastM) / lengthM;
  return [past(0), past(1), past(2)];
}

/** Two tapered bars through the pillar, upper arm and forearm, so the same narrowing arm shows on both broad faces. */
function armBoxes(pillar: PillarPlacement): StoneBox[] {
  const acrossM = pillar.size.thicknessM + 2 * RELIEF_PROUD_M;
  const [shoulder, elbow, wrist] = armPath().map(([side, heightFraction]) => shaftPoint(pillar, side, heightFraction));
  const upperArm = beamBetween(runOn(elbow, shoulder, LIMB_OVERLAP_M), runOn(shoulder, elbow, ELBOW_OVERLAP_M), acrossM, SHOULDER_WIDTH_M, "limb");
  const forearm = beamBetween(runOn(wrist, elbow, ELBOW_OVERLAP_M), runOn(elbow, wrist, LIMB_OVERLAP_M), acrossM, SHOULDER_WIDTH_M * LIMB_TAPER, "limb");
  return [upperArm, forearm].map((limb) => ({ ...limb, shade: RELIEF_SHADE }));
}

/** Two hands on the narrow front, each a row of long thin fingers that reach in from an edge and nearly meet. */
function handBoxes(pillar: PillarPlacement): StoneBox[] {
  const { thicknessM } = pillar.size;
  const fingerLengthM = thicknessM * FINGER_LENGTH_OF_FRONT;
  return [-1, 1].flatMap((hand) =>
    Array.from({ length: FINGER_COUNT }, (_, finger) => {
      const [east, wristM, south] = shaftPoint(pillar, 1, WRIST[1], (hand * (thicknessM - fingerLengthM)) / 2);
      const upM = wristM - (finger - (FINGER_COUNT - 1) / 2) * FINGER_PITCH_M;
      return plainBox(pillar, [east, upM, south], [fingerLengthM, FINGER_HEIGHT_M, 2 * RELIEF_PROUD_M]);
    }),
  );
}

function beltAndLoincloth(pillar: PillarPlacement): StoneBox[] {
  const { thicknessM } = pillar.size;
  const beltLengthM = 2 * (shaftHalfWidthM(pillar, BELT_HEIGHT) + RELIEF_PROUD_M);
  const belt = plainBox(pillar, shaftPoint(pillar, 0, BELT_HEIGHT), [thicknessM + 2 * RELIEF_PROUD_M, BELT_DEPTH_M, beltLengthM]);
  const [east, beltUpM, south] = shaftPoint(pillar, 1, BELT_HEIGHT);
  const clothCentre: Vec3 = [east, beltUpM - (BELT_DEPTH_M + LOINCLOTH_DROP_M) / 2, south];
  return [belt, plainBox(pillar, clothCentre, [thicknessM * 0.62, LOINCLOTH_DROP_M, 2 * RELIEF_PROUD_M])];
}

export function anthropomorphicRelief(pillar: PillarPlacement): StoneBox[] {
  return [...armBoxes(pillar), ...handBoxes(pillar), ...beltAndLoincloth(pillar)];
}

/** The relief boxes of every pillar a layout marks as anthropomorphic. */
export function reliefBoxes(enclosures: readonly Enclosure[]): StoneBox[] {
  return enclosures.flatMap(enclosurePillars).filter((pillar) => pillar.anthropomorphic).flatMap(anthropomorphicRelief);
}
