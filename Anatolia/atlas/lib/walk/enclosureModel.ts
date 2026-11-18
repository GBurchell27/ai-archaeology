/**
 * Pure layout maths for a schematic model of pillar enclosures: ring walls of stones, benches and T-pillars.
 * Local metres on a flat floor at y = 0. Plan points are [east, south], which is three.js [x, z], so north is -z.
 */

import type { HypothesisLayer } from "./hypothesisLayers";
import type { Vec3 } from "./walkMovement";

export type PlanPoint = readonly [eastM: number, southM: number];

/** A T-pillar: a slab shaft under a longer head. The long axis is the broad face of the shaft. */
export type PillarSize = {
  heightM: number;
  shaftWidthM: number;
  thicknessM: number;
  headLengthM: number;
  headHeightM: number;
};

export type EnclosureRing = {
  innerRadiusM: number;
  wallThicknessM: number;
  wallHeightM: number;
  benchHeightM: number;
  benchDepthM: number;
  pillarCount: number;
  pillar: PillarSize;
  /** Where the wall is left open, clockwise from north, and how wide along the wall. */
  gapBearingDeg: number;
  gapWidthM: number;
  /** Excavation numbers of the pillars worth naming, keyed by place in the ring: 0 is the first clockwise from the gap. */
  numberedSlots?: Readonly<Record<number, number>>;
};

export type CentralPair = {
  pillar: PillarSize;
  spacingM: number;
  pedestalHeightM: number;
  /** Excavation numbers of the two pillars, west then east. */
  pillarNumbers?: readonly [west: number, east: number];
  /** True where arms, hands, a belt and a loincloth are published on the pair, so they are sketched in relief. */
  anthropomorphic?: boolean;
};

export type Enclosure = {
  id: string;
  name: string;
  /** The midpoint between the two central pillars. */
  centre: PlanPoint;
  rings: readonly EnclosureRing[];
  centralPair: CentralPair;
};

export type ModelSource = { label: string; url: string };

export type WalkModel = {
  enclosures: readonly Enclosure[];
  /** The walker stays within this distance of the origin, which is also where they start, looking north. */
  walkRadiusM: number;
  /** One or two sentences for the footer: what is approximate and what is left out. */
  note: string;
  sources: readonly ModelSource[];
  /** Conjectural layers the visitor may switch on. Never shown by default. */
  hypotheses: readonly HypothesisLayer[];
};

export type PillarPlacement = {
  centre: PlanPoint;
  yawRad: number;
  baseM: number;
  size: PillarSize;
  pillarNumber?: number;
  anthropomorphic?: boolean;
};

/** A box to draw. Unrotated, `size` is [along the wall, up, across the wall]. `tiltRad` pitches it about its first axis. */
export type Block = { centre: Vec3; size: Vec3; yawRad: number; tiltRad?: number; shade: number };

/** Rough wall stone, a tapered pillar block, a plain box of the same dressed limestone, or a roof timber. */
export type StoneKind = "stone" | "pillar" | "dressed" | "timber";
export type StoneBox = Block & { kind: StoneKind };

type WallBand = { midRadiusM: number; depthM: number; heightM: number; raggedTop: boolean; roughness: number };

const DEGREE = Math.PI / 180;
/** Perimeter pillars stand in the wall with their front edge proud of its inner face. */
const PILLAR_INSET_M = 0.2;
const STONE_LENGTH_M = 0.5;
const STONE_COURSE_M = 0.22;
const STONE_SKEW_RAD = 0.14;
/** Dry-stone walling: how far a course may differ from the mean height, and a stone from the wall face. */
const COURSE_HEIGHT_SPREAD = 0.7;
const STONE_FACE_JITTER_M = 0.07;
/** A pillar block is this much narrower at its foot than at its top, along its broad face. [EST] */
export const PILLAR_BASE_TAPER = 0.88;
const MISSING_TOP_STONES = 0.35;
const PEDESTAL_MARGIN_M = 0.6;
const LAYOUT_SEED = 9600;

export const pillarRingRadiusM = (ring: EnclosureRing) => ring.innerRadiusM + PILLAR_INSET_M;

export function pointAtBearing(centre: PlanPoint, radiusM: number, bearingDeg: number): PlanPoint {
  const bearing = bearingDeg * DEGREE;
  return [centre[0] + radiusM * Math.sin(bearing), centre[1] - radiusM * Math.cos(bearing)];
}

/** Turns a box so its depth points away from the centre at this bearing. */
const yawFacingOut = (bearingDeg: number) => Math.PI - bearingDeg * DEGREE;

/** `count` bearings spread evenly along the wall at this radius, keeping clear of the gap. */
function wallBearings(ring: EnclosureRing, radiusM: number, count: number): number[] {
  const gapDeg = ring.gapWidthM / radiusM / DEGREE;
  const firstDeg = ring.gapBearingDeg + gapDeg / 2;
  return Array.from({ length: count }, (_, index) => firstDeg + ((index + 0.5) / count) * (360 - gapDeg));
}

export function perimeterPillars(enclosure: Enclosure, ring: EnclosureRing): PillarPlacement[] {
  const radiusM = pillarRingRadiusM(ring);
  return wallBearings(ring, radiusM, ring.pillarCount).map((bearingDeg, slot) => ({
    centre: pointAtBearing(enclosure.centre, radiusM, bearingDeg),
    yawRad: yawFacingOut(bearingDeg),
    baseM: 0,
    size: ring.pillar,
    pillarNumber: ring.numberedSlots?.[slot],
  }));
}

/** Two pillars side by side, east and west of the centre, their narrow fronts to the south. */
export function centralPillars(enclosure: Enclosure): PillarPlacement[] {
  const { pillar, spacingM, pedestalHeightM, pillarNumbers, anthropomorphic } = enclosure.centralPair;
  return [-1, 1].map((side, index) => ({
    centre: [enclosure.centre[0] + (side * spacingM) / 2, enclosure.centre[1]],
    yawRad: 0,
    baseM: pedestalHeightM,
    size: pillar,
    pillarNumber: pillarNumbers?.[index],
    anthropomorphic,
  }));
}

export function enclosurePillars(enclosure: Enclosure): PillarPlacement[] {
  return [...enclosure.rings.flatMap((ring) => perimeterPillars(enclosure, ring)), ...centralPillars(enclosure)];
}

/** The pillar with this excavation number, if the layout names one. */
export function findPillar(enclosure: Enclosure, pillarNumber: number): PillarPlacement | null {
  return enclosurePillars(enclosure).find((pillar) => pillar.pillarNumber === pillarNumber) ?? null;
}

/** A point on a pillar: `alongM` towards its narrow front, `upM` above the floor. */
export function pointOnPillar(pillar: PillarPlacement, alongM: number, upM: number): Vec3 {
  return [pillar.centre[0] + alongM * Math.sin(pillar.yawRad), upM, pillar.centre[1] + alongM * Math.cos(pillar.yawRad)];
}

/** A straight bar from one point to another, `acrossM` wide and `deepM` deep. */
export function beamBetween(from: Vec3, to: Vec3, acrossM: number, deepM: number, kind: StoneKind): StoneBox {
  const [east, up, south] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const flatM = Math.hypot(east, south);
  return {
    kind,
    centre: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
    size: [acrossM, deepM, Math.hypot(flatM, up)],
    yawRad: Math.atan2(east, south),
    tiltRad: Math.atan2(-up, flatM),
    shade: 1,
  };
}

export function pillarBoxes({ centre, yawRad, baseM, size }: PillarPlacement): StoneBox[] {
  const shaftHeightM = size.heightM - size.headHeightM;
  const block = (kind: StoneKind, midHeightM: number, heightM: number, lengthM: number, thicknessM = size.thicknessM): StoneBox => ({
    kind,
    centre: [centre[0], midHeightM, centre[1]],
    size: [thicknessM, heightM, lengthM],
    yawRad,
    shade: 1,
  });
  const boxes = [
    block("pillar", baseM + shaftHeightM / 2, shaftHeightM, size.shaftWidthM),
    block("pillar", baseM + shaftHeightM + size.headHeightM / 2, size.headHeightM, size.headLengthM),
  ];
  if (baseM > 0) boxes.push(block("dressed", baseM / 2, baseM, size.shaftWidthM + PEDESTAL_MARGIN_M, size.thicknessM + PEDESTAL_MARGIN_M));
  return boxes;
}

/** Small seeded generator (mulberry32), so the stones are the same on every visit. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Course heights that differ from one another and still add up to the height of the band. */
function courseHeights(band: WallBand, random: () => number): number[] {
  const courseCount = Math.max(1, Math.round(band.heightM / STONE_COURSE_M));
  const weights = Array.from({ length: courseCount }, () => 1 + (random() - 0.5) * COURSE_HEIGHT_SPREAD * band.roughness);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (weight / total) * band.heightM);
}

type StoneSeat = { bearingDeg: number; pitchM: number; baseM: number; courseM: number };

/** One stone of a course. It overlaps its neighbours: an open joint would let the low sun through as stripes on the floor. */
function wallStone(centre: PlanPoint, band: WallBand, seat: StoneSeat, random: () => number): StoneBox {
  const rough = band.roughness;
  const radiusM = band.midRadiusM + (random() - 0.5) * 2 * STONE_FACE_JITTER_M * rough;
  const [east, south] = pointAtBearing(centre, radiusM, seat.bearingDeg);
  return {
    kind: "stone",
    centre: [east, seat.baseM + seat.courseM / 2, south],
    size: [seat.pitchM * (1.05 + 0.45 * random() * rough), seat.courseM * (1 + 0.12 * random()), band.depthM * (1 - 0.16 * random() * rough)],
    yawRad: yawFacingOut(seat.bearingDeg) + (random() - 0.5) * STONE_SKEW_RAD * rough,
    shade: 0.68 + 0.37 * random(),
  };
}

/** Uneven courses of uneven stones along one band of a ring. Alternate courses hold one stone more, so joints stagger. */
function bandStones(centre: PlanPoint, ring: EnclosureRing, band: WallBand, random: () => number): StoneBox[] {
  const wallLengthM = 2 * Math.PI * band.midRadiusM - ring.gapWidthM;
  const courses = courseHeights(band, random);
  const stones: StoneBox[] = [];
  let baseM = 0;
  courses.forEach((courseM, course) => {
    const stoneCount = Math.round(wallLengthM / STONE_LENGTH_M) + (course % 2);
    const isRagged = band.raggedTop && course === courses.length - 1;
    for (const bearingDeg of wallBearings(ring, band.midRadiusM, stoneCount)) {
      const stone = wallStone(centre, band, { bearingDeg, pitchM: wallLengthM / stoneCount, baseM, courseM }, random);
      if (!isRagged || random() > MISSING_TOP_STONES) stones.push(stone);
    }
    baseM += courseM;
  });
  return stones;
}

function ringStones(centre: PlanPoint, ring: EnclosureRing, random: () => number): StoneBox[] {
  const wall = { midRadiusM: ring.innerRadiusM + ring.wallThicknessM / 2, depthM: ring.wallThicknessM, heightM: ring.wallHeightM, raggedTop: true, roughness: 1 };
  const bench = { midRadiusM: ring.innerRadiusM - ring.benchDepthM / 2, depthM: ring.benchDepthM, heightM: ring.benchHeightM, raggedTop: false, roughness: 0.4 };
  return [...bandStones(centre, ring, wall, random), ...bandStones(centre, ring, bench, random)];
}

/** Every box of the model: walls, benches, perimeter pillars and the central pairs. */
export function modelBoxes(enclosures: readonly Enclosure[]): StoneBox[] {
  const random = seededRandom(LAYOUT_SEED);
  return enclosures.flatMap((enclosure) => [
    ...enclosure.rings.flatMap((ring) => ringStones(enclosure.centre, ring, random)),
    ...enclosurePillars(enclosure).flatMap(pillarBoxes),
  ]);
}
