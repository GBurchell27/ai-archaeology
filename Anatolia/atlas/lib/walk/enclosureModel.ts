/**
 * Pure layout maths for a schematic model of pillar enclosures: ring walls of stones, benches and T-pillars.
 * Local metres on a flat floor at y = 0. Plan points are [east, south], which is three.js [x, z], so north is -z.
 */

import type { HypothesisLayer } from "./hypothesisLayers";
import type { PyramidField } from "./pyramidModel";
import type { RockCutModel } from "./rockCutModel";
import type { Vec3 } from "./walkMovement";
import type { WalkScale } from "./walkScale";

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
  /** Stretches of the wall left open between two neighbouring pillars, besides the gap. */
  openings?: readonly WallOpening[];
};

/** The wall is open for `widthM` halfway between the pillar in `afterSlot` and the next one clockwise. The bench runs on. */
export type WallOpening = { afterSlot: number; widthM: number };

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

export type ModelSource = { label: string; url: string; /** A second link, such as a licence, shown beside `url`. */ licenceUrl?: string };

export type WalkModel = {
  enclosures: readonly Enclosure[];
  /** The walker stays within this distance of the origin, which is also where they start, looking north. */
  walkRadiusM: number;
  /** One or two sentences for the footer: what is approximate and what is left out. */
  note: string;
  sources: readonly ModelSource[];
  /** Conjectural layers the visitor may switch on. Never shown by default. */
  hypotheses: readonly HypothesisLayer[];
  /** Buildings cut down into bedrock, for a site that is not rings standing on a flat floor. */
  rockCut?: RockCutModel;
  /** Pyramids standing on open ground, for a site that is neither. */
  pyramidField?: PyramidField;
  /** A prebuilt ground window the walker stands on. Absent on the flat floor of the pillar sites. */
  terrainId?: "giza";
  /** For a site far larger than a building: how fast it is crossed and how far its light and horizon reach. */
  scale?: Partial<WalkScale>;
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

/**
 * Rough wall stone, a large rough stone laid or set up on its own, a tapered pillar block, a plain box of the same
 * dressed limestone, a bar of it in relief that narrows towards its far end, a roof timber, a smooth block left
 * standing when bedrock was cut away, or the dark of an opening or a channel.
 */
export type StoneKind = "stone" | "slab" | "pillar" | "dressed" | "limb" | "timber" | "rock" | "dark";
export type StoneBox = Block & { kind: StoneKind };

/** One band of walling along a ring: a wall or a bench. `roughness` 0 is smooth and even, 1 is dry-stone. */
export type WallBand = { midRadiusM: number; depthM: number; heightM: number; raggedTop: boolean; roughness: number };

const DEGREE = Math.PI / 180;
/** Perimeter pillars stand in the wall with their front edge proud of its inner face. */
const PILLAR_INSET_M = 0.2;
const STONE_LENGTH_M = 0.5;
const STONE_COURSE_M = 0.22;
/** Dry-stone walling: how far a course may differ from the mean height, a stone from the mean length, and a stone from the wall face. */
const COURSE_HEIGHT_SPREAD = 1;
const STONE_LENGTH_SPREAD = 0.9;
const STONE_FACE_JITTER_M = 0.07;
/** A stone turns from the line of the wall by up to half of this. */
const STONE_SKEW_RAD = 0.07;
/** A stone runs this far past the joint at each end, so no joint is open to the low sun. */
const STONE_OVERLAP_M = 0.04;
/**
 * Where two stones of a course meet, one stands proud of the other by at least this on each wall face, and on top.
 * Faces that nearly agree would cross inside the overlap and show the hidden end of a stone as a thin broken line.
 */
const MIN_FACE_STEP_M = 0.014;
const MIN_TOP_STEP_M = 0.006;
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
export const yawFacingOut = (bearingDeg: number) => Math.PI - bearingDeg * DEGREE;

/** The stretch of a ring left without walling: where its middle is, clockwise from north, and how wide along the wall. */
export type WallGap = Pick<EnclosureRing, "gapBearingDeg" | "gapWidthM">;

/** `count` bearings spread evenly along the wall at this radius, keeping clear of the gap. */
function wallBearings(ring: WallGap, radiusM: number, count: number): number[] {
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

/** A point on a pillar: `alongM` towards its narrow front, `upM` above the floor, `acrossM` out of a broad face. */
export function pointOnPillar(pillar: PillarPlacement, alongM: number, upM: number, acrossM = 0): Vec3 {
  const [sine, cosine] = [Math.sin(pillar.yawRad), Math.cos(pillar.yawRad)];
  return [pillar.centre[0] + alongM * sine + acrossM * cosine, upM, pillar.centre[1] + alongM * cosine - acrossM * sine];
}

export const outerRadiusM = (enclosure: Enclosure) => Math.max(...enclosure.rings.map((ring) => ring.innerRadiusM + ring.wallThicknessM));

/** A straight bar from one point to another, `acrossM` wide and `deepM` deep. Its own third axis runs from `from` to `to`. */
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

/** `count` shares of a whole that differ from one another by up to `spread` of the mean and add up to 1. */
function unevenShares(count: number, spread: number, random: () => number): number[] {
  const weights = Array.from({ length: count }, () => 1 + (random() - 0.5) * spread);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

/** Course heights that differ from one another and still add up to the height of the band. */
function courseHeights(band: WallBand, random: () => number): number[] {
  const courseCount = Math.max(1, Math.round(band.heightM / STONE_COURSE_M));
  return unevenShares(courseCount, COURSE_HEIGHT_SPREAD * band.roughness, random).map((share) => share * band.heightM);
}

/** `value`, or the nearest value `stepM` clear of `other` on the side of `towards` when the two all but agree. */
function steppedClearOf(value: number, other: number, stepM: number, towards: number): number {
  return Math.abs(value - other) < stepM ? other + Math.sign(towards - other || -1) * stepM : value;
}

/** A stone's inner face: the bearings it runs between, clockwise, and how far it stands out from the band's own face at each end. */
type StoneFace = { fromDeg: number; toDeg: number; startM: number; endM: number };
type StoneSeat = StoneFace & { baseM: number; heightM: number; depthM: number };

/** One stone of a course. It overlaps its neighbours along the wall. */
function wallStone(centre: PlanPoint, band: WallBand, { fromDeg, toDeg, startM, endM, baseM, heightM, depthM }: StoneSeat, shade: number): StoneBox {
  const innerRadiusM = band.midRadiusM - band.depthM / 2;
  const start = pointAtBearing(centre, innerRadiusM + startM, fromDeg);
  const end = pointAtBearing(centre, innerRadiusM + endM, toDeg);
  const [east, south] = [end[0] - start[0], end[1] - start[1]];
  const lengthM = Math.hypot(east, south);
  // Clockwise along the wall, outwards is to the left: the middle of the stone is half its depth behind its inner face.
  const outwards = depthM / 2 / lengthM;
  return {
    kind: "stone",
    centre: [(start[0] + end[0]) / 2 + south * outwards, baseM + heightM / 2, (start[1] + end[1]) / 2 - east * outwards],
    size: [lengthM + 2 * STONE_OVERLAP_M, heightM, depthM],
    yawRad: Math.atan2(-south, east),
    shade,
  };
}

type CourseSeat = { baseM: number; courseM: number; stoneCount: number };

/**
 * The stones of one course, clockwise: uneven lengths, each a little out of line and turned a little. No stone
 * agrees with the one before it on either face or on top: see `MIN_FACE_STEP_M`.
 */
function courseStones(centre: PlanPoint, ring: WallGap, band: WallBand, { baseM, courseM, stoneCount }: CourseSeat, random: () => number): StoneBox[] {
  const gapDeg = ring.gapWidthM / band.midRadiusM / DEGREE;
  const wallLengthM = (360 - gapDeg) * DEGREE * band.midRadiusM;
  const rough = band.roughness;
  let before = { toDeg: ring.gapBearingDeg + gapDeg / 2, endM: Infinity, outerM: Infinity, heightM: Infinity };
  return unevenShares(stoneCount, STONE_LENGTH_SPREAD * rough, random).map((share) => {
    const halfTurnM = ((random() - 0.5) * STONE_SKEW_RAD * rough * share * wallLengthM) / 2;
    const startM = steppedClearOf((random() - 0.5) * 2 * STONE_FACE_JITTER_M * rough - halfTurnM, before.endM, MIN_FACE_STEP_M, 0);
    const outerM = steppedClearOf(startM + band.depthM * (1 - 0.16 * random() * rough), before.outerM, MIN_FACE_STEP_M, -Infinity);
    // Taller than its course by a little, upwards only, so courses overlap and none sinks below the floor.
    const heightM = steppedClearOf(courseM * (1 + 0.12 * random()), before.heightM, MIN_TOP_STEP_M, Infinity);
    const face = { fromDeg: before.toDeg, toDeg: before.toDeg + share * (360 - gapDeg), startM, endM: startM + 2 * halfTurnM };
    before = { toDeg: face.toDeg, endM: face.endM, outerM: face.endM + outerM - startM, heightM };
    return wallStone(centre, band, { ...face, baseM, heightM, depthM: outerM - startM }, 0.8 + 0.24 * random());
  });
}

/** Uneven courses of uneven stones along one band of a ring. Alternate courses hold one stone more, so joints stagger. */
export function bandStones(centre: PlanPoint, ring: WallGap, band: WallBand, random: () => number): StoneBox[] {
  const wallLengthM = 2 * Math.PI * band.midRadiusM - ring.gapWidthM;
  const courses = courseHeights(band, random);
  const stones: StoneBox[] = [];
  let baseM = 0;
  courses.forEach((courseM, course) => {
    const stoneCount = Math.round(wallLengthM / STONE_LENGTH_M) + (course % 2);
    const isRagged = band.raggedTop && course === courses.length - 1;
    for (const stone of courseStones(centre, ring, band, { baseM, courseM, stoneCount }, random)) {
      if (!isRagged || random() > MISSING_TOP_STONES) stones.push(stone);
    }
    baseM += courseM;
  });
  return stones;
}

/** Where the middle of an opening is, clockwise from north. */
export function openingBearingDeg(ring: EnclosureRing, opening: WallOpening): number {
  const bearings = wallBearings(ring, pillarRingRadiusM(ring), ring.pillarCount);
  return (bearings[opening.afterSlot] + bearings[opening.afterSlot + 1]) / 2;
}

/** True for a stone whose middle lies in one of the ring's openings, measured along the wall at the stone's own radius. */
function isInOpening(centre: PlanPoint, ring: EnclosureRing, stone: StoneBox): boolean {
  const [east, south] = [stone.centre[0] - centre[0], stone.centre[2] - centre[1]];
  const bearingDeg = Math.atan2(east, -south) / DEGREE;
  return (ring.openings ?? []).some((opening) => {
    const offDeg = ((((bearingDeg - openingBearingDeg(ring, opening)) % 360) + 540) % 360) - 180;
    return Math.abs(offDeg) * DEGREE * Math.hypot(east, south) < opening.widthM / 2;
  });
}

function ringStones(centre: PlanPoint, ring: EnclosureRing, random: () => number): StoneBox[] {
  const wall = { midRadiusM: ring.innerRadiusM + ring.wallThicknessM / 2, depthM: ring.wallThicknessM, heightM: ring.wallHeightM, raggedTop: true, roughness: 1 };
  const bench = { midRadiusM: ring.innerRadiusM - ring.benchDepthM / 2, depthM: ring.benchDepthM, heightM: ring.benchHeightM, raggedTop: false, roughness: 0.4 };
  // Stones are laid first and taken out after, so an opening changes no other stone of the model.
  const wallStones = bandStones(centre, ring, wall, random).filter((stone) => !isInOpening(centre, ring, stone));
  return [...wallStones, ...bandStones(centre, ring, bench, random)];
}

/** Every box of the model: walls, benches, perimeter pillars and the central pairs. */
export function modelBoxes(enclosures: readonly Enclosure[]): StoneBox[] {
  const random = seededRandom(LAYOUT_SEED);
  return enclosures.flatMap((enclosure) => [
    ...enclosure.rings.flatMap((ring) => ringStones(enclosure.centre, ring, random)),
    ...enclosurePillars(enclosure).flatMap(pillarBoxes),
  ]);
}
