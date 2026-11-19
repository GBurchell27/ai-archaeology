/**
 * A conjectural roof over an enclosure: a timber frame on the central pair, rafters from each pillar of the inner
 * ring up to it, and a cover left open over the centre. Whether the enclosures were roofed at all is disputed and no
 * roof remains were found, so every figure here is [EST] and the form is this model's own simplification.
 */

import { centralPillars, perimeterPillars, pillarRingRadiusM, beamBetween, type Enclosure, type PlanPoint, type StoneBox } from "./enclosureModel";
import type { Vec3 } from "./walkMovement";

/** The cover as a cone with its tip cut off: wide and low at the eaves, narrow and high at the opening. */
export type RoofCover = { centre: PlanPoint; eavesRadiusM: number; eavesHeightM: number; openingRadiusM: number; openingHeightM: number };
export type EnclosureRoof = { cover: RoofCover; timbers: StoneBox[] };

const RAFTER_M = 0.18;
const FRAME_BEAM_M = 0.24;
const FRAME_OVERHANG_M = 0.4;
const EAVES_OVERHANG_M = 0.9;
const COVER_ABOVE_RAFTERS_M = 0.14;
/** The frame reaches this share of the way along the pillar heads, north and south of the centre. */
const FRAME_DEPTH_OF_HEAD = 0.38;

type RoofFrame = { centre: PlanPoint; halfSpanM: number; halfDepthM: number; topM: number };

function roofFrame(enclosure: Enclosure): RoofFrame {
  const { pillar, spacingM, pedestalHeightM } = enclosure.centralPair;
  return {
    centre: enclosure.centre,
    halfSpanM: spacingM / 2,
    halfDepthM: pillar.headLengthM * FRAME_DEPTH_OF_HEAD,
    topM: pedestalHeightM + pillar.heightM + FRAME_BEAM_M,
  };
}

/** Four beams in a rectangle: two along the heads of the central pillars, two across them. */
function frameBeams({ centre, halfSpanM, halfDepthM, topM }: RoofFrame): StoneBox[] {
  const corner = (east: number, south: number): Vec3 => [centre[0] + east * halfSpanM, topM - FRAME_BEAM_M / 2, centre[1] + south * halfDepthM];
  const reach = (from: Vec3, to: Vec3): StoneBox => {
    const beam = beamBetween(from, to, FRAME_BEAM_M, FRAME_BEAM_M, "timber");
    return { ...beam, size: [beam.size[0], beam.size[1], beam.size[2] + 2 * FRAME_OVERHANG_M] };
  };
  return [reach(corner(-1, -1), corner(1, -1)), reach(corner(-1, 1), corner(1, 1)), reach(corner(-1, -1), corner(-1, 1)), reach(corner(1, -1), corner(1, 1))];
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Where a rafter from this point lands: the nearest point of the frame. */
function frameSeat({ centre, halfSpanM, halfDepthM, topM }: RoofFrame, from: PlanPoint): Vec3 {
  return [
    clamp(from[0], centre[0] - halfSpanM, centre[0] + halfSpanM),
    topM + RAFTER_M / 2,
    clamp(from[1], centre[1] - halfDepthM, centre[1] + halfDepthM),
  ];
}

function roofCover(enclosure: Enclosure, frame: RoofFrame): RoofCover {
  const ring = enclosure.rings[0];
  const ringRadiusM = pillarRingRadiusM(ring);
  const openingRadiusM = Math.hypot(frame.halfSpanM, frame.halfDepthM);
  const rafterFootM = ring.pillar.heightM + RAFTER_M;
  const rafterHeadM = frame.topM + RAFTER_M;
  const slope = (rafterHeadM - rafterFootM) / (ringRadiusM - openingRadiusM);
  return {
    centre: enclosure.centre,
    eavesRadiusM: ringRadiusM + EAVES_OVERHANG_M,
    eavesHeightM: rafterFootM - slope * EAVES_OVERHANG_M + COVER_ABOVE_RAFTERS_M,
    openingRadiusM,
    openingHeightM: rafterHeadM + COVER_ABOVE_RAFTERS_M,
  };
}

/** The roof of one enclosure. Only its innermost ring is roofed: an outer passage is left open. */
export function enclosureRoof(enclosure: Enclosure): EnclosureRoof {
  const frame = roofFrame(enclosure);
  const ring = enclosure.rings[0];
  const rafters = perimeterPillars(enclosure, ring).map((pillar) => {
    const foot: Vec3 = [pillar.centre[0], ring.pillar.heightM + RAFTER_M / 2, pillar.centre[1]];
    return beamBetween(foot, frameSeat(frame, pillar.centre), RAFTER_M, RAFTER_M, "timber");
  });
  return { cover: roofCover(enclosure, frame), timbers: [...frameBeams(frame), ...rafters] };
}

/** Two central pillars are needed to carry the frame, so this is every enclosure of the model. */
export function modelRoofs(enclosures: readonly Enclosure[]): EnclosureRoof[] {
  return enclosures.filter((enclosure) => centralPillars(enclosure).length === 2).map(enclosureRoof);
}
