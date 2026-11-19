/**
 * A site cut down into bedrock: a rock terrace whose surface is y = 0, rooms sunk into it, and lower ground beside it.
 * Pure types and maths, shared by any such site. Local metres, plan points are [east, south], y is up.
 */

import type { Block, PlanPoint, StoneBox } from "./enclosureModel";
import type { HypothesisLayerId } from "./hypothesisLayers";
import type { LandmarkPlace } from "./landmarks";
import { outlineBounds, pointInOutline, scaledOutline, type Outline, type OutlineBounds } from "./planOutline";
import type { Vec3 } from "./walkMovement";
import type { Obstacle } from "./walkObstacles";

/** A room cut into the terrace. Its outline must lie wholly inside the terrace outline. */
export type SunkenRoom = { id: string; outline: Outline; floorM: number };

/** A flat floor to draw, which need not be a sunken room: a building half outside the terrace has one too. */
export type FloorPatch = { id: string; outline: Outline; heightM: number };

/** A see-through upright block over an outline: a fill of earth, or a cover. */
export type Prism = { id: string; outline: Outline; bottomM: number; topM: number; colour: string; opacity: number };

/**
 * A plain rounded form carved in the round, with no feature on it. A head is fuller above its middle and narrows to the
 * chin: `size` is its depth, height and width. A neck is the rock it grows from, lying level along its own first axis,
 * broad at one end and drawn in at the other: `size` is its length, and its height and width at the broad end.
 */
export type RoundedForm = Block & { profile: "head" | "neck" };

/** Solid rock left standing over an outline when the rock around it was cut away: a bench, a ledge, a step, a kerb. */
export type RockMass = { id: string; outline: Outline; bottomM: number; topM: number };

/**
 * A round hole bored level through the rock from one cut face to another. Each skew is the slope of the rock face at
 * that end: how far it runs along the bore for each metre to the side, the side being east for a bore that runs south.
 */
export type Bore = { id: string; from: Vec3; to: Vec3; radiusM: number; fromSkew: number; toSkew: number };

/** A point on the rim of a bore where it meets the rock face at one end. `turnRad` 0 is the side, a quarter turn the top. */
export function boreRimPoint(bore: Bore, end: "from" | "to", turnRad: number): Vec3 {
  const [east, south] = [bore.to[0] - bore.from[0], bore.to[2] - bore.from[2]];
  const lengthM = Math.hypot(east, south);
  const [alongEast, alongSouth] = [east / lengthM, south / lengthM];
  const sideM = bore.radiusM * Math.cos(turnRad);
  const alongM = sideM * (end === "from" ? bore.fromSkew : bore.toSkew);
  const [centreEast, centreUp, centreSouth] = bore[end];
  // The side of a bore that runs south (0, 1) is east (1, 0).
  return [centreEast + sideM * alongSouth + alongM * alongEast, centreUp + bore.radiusM * Math.sin(turnRad), centreSouth - sideM * alongEast + alongM * alongSouth];
}

/** What one conjectural layer adds to the scene. */
export type LayerDrawing = { boxes: readonly StoneBox[]; prisms: readonly Prism[] };

export type RockCutModel = {
  /** Bedrock stands to y = 0 inside this outline. Outside it the ground lies at `lowGroundM`. */
  terraceOutline: Outline;
  lowGroundM: number;
  rooms: readonly SunkenRoom[];
  floors: readonly FloorPatch[];
  boxes: readonly StoneBox[];
  /** Pillars left standing in the rock, round with a domed top. `size` is [diameter, height, diameter]. */
  roundPillars: readonly Block[];
  bosses: readonly RoundedForm[];
  rockMasses: readonly RockMass[];
  /** Laid stonework a walker stands on, such as a built bench. Its stones are drawn from `boxes`, not from here. */
  laidGround: readonly RockMass[];
  /** What a walker cannot pass: laid walls and standing pillars. A rock face stops them by its height instead. */
  obstacles: readonly Obstacle[];
  bores: readonly Bore[];
  /** Where a landmark stands, by the `placeId` it names. */
  landmarkPlaces: Readonly<Record<string, LandmarkPlace>>;
  layerDrawings: Readonly<Partial<Record<HypothesisLayerId, LayerDrawing>>>;
};

const highestTopM = (masses: readonly RockMass[], point: PlanPoint, aboveM: number) =>
  masses.reduce((highestM, mass) => (mass.topM > highestM && pointInOutline(mass.outline, point) ? mass.topM : highestM), aboveM);

/**
 * The height a walker stands on: the floor of the room they are in, the terrace, or the low ground beside it, and
 * above those the top of any bench, ledge or step over the point.
 */
export function groundHeightM(site: RockCutModel, east: number, south: number): number {
  const point: PlanPoint = [east, south];
  const room = site.rooms.find((candidate) => pointInOutline(candidate.outline, point));
  const floorM = room ? room.floorM : pointInOutline(site.terraceOutline, point) ? 0 : site.lowGroundM;
  return highestTopM(site.laidGround, point, highestTopM(site.rockMasses, point, floorM));
}

/** Rock walls that stand on a floor of their own: the bounds within which a cut face belongs to that room, and its floor. */
export type WallFooting = OutlineBounds & { floorM: number };

/** A room's footing reaches this far beyond its outline, so its whole wall is inside. Less than rooms stand apart. */
const FOOTING_MARGIN_M = 0.2;

/** The footing of each sunken room. A cut face in none of them stands on the low ground. */
export function wallFootings(rooms: readonly SunkenRoom[]): WallFooting[] {
  return rooms.map((room) => {
    const { westM, eastM, northM, southM } = outlineBounds(room.outline);
    return { westM: westM - FOOTING_MARGIN_M, eastM: eastM + FOOTING_MARGIN_M, northM: northM - FOOTING_MARGIN_M, southM: southM + FOOTING_MARGIN_M, floorM: room.floorM };
  });
}

/** The same boxes moved up (or, with a negative figure, down). */
export function liftedBy<Box extends Block>(boxes: readonly Box[], upM: number): Box[] {
  return boxes.map((box) => ({ ...box, centre: [box.centre[0], box.centre[1] + upM, box.centre[2]] as Vec3 }));
}

export type SlabSize = { lengthM: number; widthM: number; thicknessM: number };

function slabAt(centre: PlanPoint, topM: number, slab: SlabSize, random: () => number): StoneBox {
  return {
    kind: "slab",
    centre: [centre[0], topM - slab.thicknessM / 2, centre[1]],
    // A little longer than its place, so neighbours overlap instead of leaving slots.
    size: [slab.lengthM * (1.02 + 0.12 * random()), slab.thicknessM * (0.8 + 0.4 * random()), slab.widthM * (1.02 + 0.12 * random())],
    yawRad: (random() - 0.5) * 0.3,
    shade: 0.8 + 0.25 * random(),
  };
}

/** A capping stone may rest with its middle this far out over the rim, as a share of the room's size. */
const CAP_RIM_REACH = 1.12;

/**
 * Large flat stones laid in staggered rows over an outline, their tops at `topM`. A stone is laid where its middle is
 * over the room or just over its rim, and `covers` agrees, so a cap can be left open on one side.
 */
export function cappingSlabs(room: Outline, topM: number, slab: SlabSize, random: () => number, covers: (centre: PlanPoint) => boolean = () => true): StoneBox[] {
  const bounds = outlineBounds(room);
  const outline = scaledOutline(room, [(bounds.westM + bounds.eastM) / 2, (bounds.northM + bounds.southM) / 2], CAP_RIM_REACH);
  const { westM, eastM, northM, southM } = outlineBounds(outline);
  const slabs: StoneBox[] = [];
  for (let row = 0, south = northM + slab.widthM / 2; south < southM; row += 1, south += slab.widthM) {
    const firstEastM = westM + (row % 2 === 0 ? slab.lengthM / 2 : 0);
    for (let east = firstEastM; east < eastM; east += slab.lengthM) {
      const centre: PlanPoint = [east, south];
      if (pointInOutline(outline, centre) && covers(centre)) slabs.push(slabAt(centre, topM, slab, random));
    }
  }
  return slabs;
}
