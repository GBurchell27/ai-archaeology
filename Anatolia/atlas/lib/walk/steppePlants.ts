/**
 * A conjectural scatter of plants round a model: widely spaced low trees in small stands, and grass tufts between
 * them, after the open pistachio-almond forest-steppe that Neef 2003 reconstructs for Göbekli Tepe. The species mix
 * is published; where any plant stood is not, so every position here is invented from a fixed seed.
 */

import { outerRadiusM, seededRandom, type Block, type Enclosure, type PlanPoint } from "./enclosureModel";

/** Unit shapes scaled per plant: a trunk cylinder, a crown ball, a tuft of blades (`tuftBladeCorners`). */
export type SteppePlants = { trunks: Block[]; crowns: Block[]; tufts: Block[] };

const PLANT_SEED = 9500;
const STAND_COUNT = 18;
const NEAREST_STAND_M = 20;
const FARTHEST_STAND_M = 150;
const STAND_SPREAD_M = 10;
const LARGEST_STAND = 4;
const TUFT_COUNT = 2600;
const TUFT_REACH_M = 75;
const TREE_CLEARANCE_M = 4;
const TUFT_CLEARANCE_M = 0.4;

function isClearOfEnclosures(enclosures: readonly Enclosure[], [east, south]: PlanPoint, clearanceM: number): boolean {
  return enclosures.every((enclosure) => Math.hypot(east - enclosure.centre[0], south - enclosure.centre[1]) > outerRadiusM(enclosure) + clearanceM);
}

function pointAround(centre: PlanPoint, radiusM: number, random: () => number): PlanPoint {
  const angle = random() * 2 * Math.PI;
  return [centre[0] + radiusM * Math.cos(angle), centre[1] + radiusM * Math.sin(angle)];
}

/** A low, broad-crowned tree 3 to 6 m tall, as wild pistachio and almond grow in open stands. */
function treeBlocks([east, south]: PlanPoint, random: () => number): { trunk: Block; crown: Block } {
  const heightM = 3 + 3 * random();
  const crownHeightM = heightM * (0.5 + 0.15 * random());
  const crownWidthM = heightM * (0.75 + 0.35 * random());
  const trunkHeightM = heightM - crownHeightM * 0.8;
  const yawRad = random() * Math.PI;
  return {
    trunk: { centre: [east, trunkHeightM / 2, south], size: [0.28, trunkHeightM, 0.28], yawRad, shade: 0.8 + 0.3 * random() },
    crown: { centre: [east, heightM - crownHeightM / 2, south], size: [crownWidthM, crownHeightM, crownWidthM * (0.8 + 0.3 * random())], yawRad, shade: 0.75 + 0.4 * random() },
  };
}

function standPoints(random: () => number): PlanPoint[] {
  const centre = pointAround([0, 0], NEAREST_STAND_M + (FARTHEST_STAND_M - NEAREST_STAND_M) * random(), random);
  const treeCount = 1 + Math.floor(random() * LARGEST_STAND);
  return Array.from({ length: treeCount }, () => pointAround(centre, STAND_SPREAD_M * random(), random));
}

function tuftBlock([east, south]: PlanPoint, random: () => number): Block {
  const heightM = 0.25 + 0.4 * random();
  const widthM = 0.35 + 0.45 * random();
  return { centre: [east, heightM / 2, south], size: [widthM, heightM, widthM], yawRad: random() * Math.PI, shade: 0.7 + 0.45 * random() };
}

/** The same plants on every visit, none of them inside or against an enclosure. */
export function steppePlants(enclosures: readonly Enclosure[]): SteppePlants {
  const random = seededRandom(PLANT_SEED);
  const trees = Array.from({ length: STAND_COUNT }, () => standPoints(random))
    .flat()
    .filter((point) => isClearOfEnclosures(enclosures, point, TREE_CLEARANCE_M))
    .map((point) => treeBlocks(point, random));
  const tufts = Array.from({ length: TUFT_COUNT }, () => pointAround([0, 0], TUFT_REACH_M * Math.sqrt(random()), random))
    .filter((point) => isClearOfEnclosures(enclosures, point, TUFT_CLEARANCE_M))
    .map((point) => tuftBlock(point, random));
  return { trunks: trees.map((tree) => tree.trunk), crowns: trees.map((tree) => tree.crown), tufts };
}

const TUFT_BLADES = 6;
const BLADE_ROOT_M = 0.07;
const BLADE_HALF_WIDTH_M = 0.045;
const GOLDEN_ANGLE_RAD = 2.4;

/** One blade as three triangles: a strip from the root to a bend, then a point that leans further out. */
function bladeCorners(angleRad: number, heightM: number, leanM: number): number[] {
  const [outEast, outSouth] = [Math.cos(angleRad), Math.sin(angleRad)];
  const corner = (outM: number, upM: number, sideM: number) => [outM * outEast - sideM * outSouth, upM - 0.5, outM * outSouth + sideM * outEast];
  const bendOutM = BLADE_ROOT_M + leanM * 0.35;
  const [rootLeft, rootRight] = [corner(BLADE_ROOT_M, 0, -BLADE_HALF_WIDTH_M), corner(BLADE_ROOT_M, 0, BLADE_HALF_WIDTH_M)];
  const [bendLeft, bendRight] = [corner(bendOutM, heightM * 0.6, -BLADE_HALF_WIDTH_M * 0.7), corner(bendOutM, heightM * 0.6, BLADE_HALF_WIDTH_M * 0.7)];
  const tip = corner(BLADE_ROOT_M + leanM, heightM, 0);
  return [rootLeft, rootRight, bendRight, rootLeft, bendRight, bendLeft, bendLeft, bendRight, tip].flat();
}

/**
 * The unit grass tuft: a few thin blades fanning out from one root, as triangle corners [x, y, z] inside the unit box
 * a `Block` scales (y from -0.5 at the ground to 0.5). A cone read as a spike at eye level; blades read as grass.
 */
export function tuftBladeCorners(): number[] {
  const random = seededRandom(PLANT_SEED + 1);
  return Array.from({ length: TUFT_BLADES }, (_, blade) => {
    const heightM = blade === 0 ? 1 : 0.55 + 0.45 * random();
    return bladeCorners(blade * GOLDEN_ANGLE_RAD + random() * 0.5, heightM, 0.12 + 0.3 * random());
  }).flat();
}
