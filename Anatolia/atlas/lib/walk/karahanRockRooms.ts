/**
 * What stands inside the two rock-cut rooms at Karahan Tepe. Structure AB: the ledge and the carved head on the west
 * wall, the pillars left in the rock, the porthole and its steps, the exit steps and the channel. Structure AA: the
 * bench and its two steps. Pure; positions the layout does not give come from its block of estimates. Whatever was left
 * standing when the rock was cut away is a rock mass or a round form; only the slab and the channel are boxes.
 */

import { beamBetween, type Block, type PlanPoint, type StoneBox } from "./enclosureModel";
import { centreOf, FLOOR_M, radiusOf, roomWalls, ROOTED_IN_ROCK_M, stepCountOf, structure } from "./karahanPlan";
import { KARAHAN_TEPE_CONNECTIONS, KARAHAN_TEPE_DRAWING_ESTIMATES as ESTIMATES, type PillarGroup } from "./karahanTepeLayout";
import { rectangleOutline } from "./planOutline";
import type { Bore, RockCutModel, RockMass, RoundedForm } from "./rockCutModel";
import type { Vec3 } from "./walkMovement";

export type RockRoomParts = Pick<RockCutModel, "boxes" | "roundPillars" | "bosses" | "rockMasses" | "bores">;

const AB_WALLS = roomWalls("AB");
const AA_WALLS = roomWalls("AA");
const [AB_EAST, AB_SOUTH] = centreOf("AB");
const CHANNEL_STEPS = 12;
const CHANNEL_TURNS = 1.25;
/** The channel is a dark strip this thick lying on the rock. */
const CHANNEL_THICKNESS_M = 0.03;
/** The head juts out past the front of the ledge and stands above its top by these shares of its depth and height. */
const HEAD_PAST_LEDGE_SHARE = 0.55;
const HEAD_ABOVE_LEDGE_SHARE = 0.8;
const DEGREE = Math.PI / 180;

/** A block of rock with upright sides, its plan a rectangle: `centre` and `size` are [east, south]. */
function rockBlock(id: string, centre: PlanPoint, size: PlanPoint, bottomM: number, topM: number): RockMass {
  return { id, outline: rectangleOutline(centre, size[0], size[1]), bottomM, topM };
}

/** A bench left along a west wall: it stands `depthM` out from the wall and is rooted in the rock behind it. */
function westWallBench(id: string, wallEast: number, south: number, depthM: number, lengthM: number, bottomM: number, topM: number): RockMass {
  return rockBlock(id, [wallEast + (depthM - ROOTED_IN_ROCK_M) / 2, south], [depthM + ROOTED_IN_ROCK_M, lengthM], bottomM, topM);
}

function abPillarGroup(groupId: string): PillarGroup {
  const group = structure("AB").pillarGroups.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error(`Pillar group ${groupId} is not in Structure AB`);
  return group;
}

/** Where the pillars of one row stand: a line along the west wall, with the place in front of the head left empty. */
export function abRowPoints(row: "front" | "back"): PlanPoint[] {
  if (row === "front") return ESTIMATES.abFrontRowAlongWallM.map((northM) => [AB_WALLS.westM + ESTIMATES.abFrontRowFromWestWallM, AB_SOUTH - northM]);
  const { count } = abPillarGroup("ab-back-row");
  return Array.from({ length: count }, (_, slot) => [AB_WALLS.westM + ESTIMATES.abBackRowFromWestWallM, AB_SOUTH - (slot - (count - 1) / 2) * ESTIMATES.abBackRowSpacingM]);
}

function roundPillars(row: "front" | "back"): Block[] {
  const { heightM, widthM } = abPillarGroup(row === "front" ? "ab-front-row" : "ab-back-row");
  return abRowPoints(row).map(([east, south]) => ({ centre: [east, FLOOR_M.AB + heightM / 2, south], size: [widthM, heightM, widthM], yawRad: 0, shade: 1 }));
}

/** The eleventh pillar: a flat slab set in the floor, not cut from the rock. */
function abSlabPillar(): StoneBox {
  const { heightM, widthM, thicknessM = widthM } = abPillarGroup("ab-eleventh-pillar");
  const centre: Vec3 = [AB_WALLS.westM + ESTIMATES.abSlabFromWestWallM, FLOOR_M.AB + heightM / 2, AB_SOUTH - ESTIMATES.abSlabNorthOfCentreM];
  return { kind: "dressed", centre, size: [thicknessM, heightM, widthM], yawRad: 0, shade: 1 };
}

const abLedgeTopM = () => FLOOR_M.AB + structure("AB").benches[0].heightM;

function abLedge(): RockMass {
  const [ledge] = structure("AB").benches;
  const lengthM = structure("AB").footprint.northSouthM - 2 * ESTIMATES.roomCornerRadiusM;
  return westWallBench("ab-west-ledge", AB_WALLS.westM, AB_SOUTH, ledge.depthM, lengthM, FLOOR_M.AB, abLedgeTopM());
}

/** The middle of the carved head: it juts out of the upper front of the ledge, at the middle of the west wall. */
export function abHeadCentre(): Vec3 {
  const { deepM, highM } = ESTIMATES.abHeadBossM;
  const ledgeFrontM = AB_WALLS.westM + structure("AB").benches[0].depthM;
  return [ledgeFrontM + deepM * (HEAD_PAST_LEDGE_SHARE - 0.5), abLedgeTopM() + highM * (HEAD_ABOVE_LEDGE_SHARE - 0.5), AB_SOUTH];
}

/** The head as two plain rounded forms: the head itself, turned a little to the south, and the neck of rock it grows from. */
function abHead(): RoundedForm[] {
  const { abHeadBossM: head, abHeadNeckM: neck, abHeadTurnDeg } = ESTIMATES;
  const [headEast, headUp, south] = abHeadCentre();
  // The neck runs level from the wall, where it is broadest, to just past the middle of the head.
  const neckLengthM = headEast + neck.pastHeadMiddleM - AB_WALLS.westM;
  return [
    // Turning the scene's east axis toward the south is a negative turn about the upright axis.
    { profile: "head", centre: [headEast, headUp, south], size: [head.deepM, head.highM, head.wideM], yawRad: -abHeadTurnDeg * DEGREE, shade: 1 },
    { profile: "neck", centre: [AB_WALLS.westM + neckLengthM / 2, headUp, south], size: [neckLengthM, neck.highM, neck.wideM], yawRad: 0, shade: 1 },
  ];
}

const portholeDiameterM = () => KARAHAN_TEPE_CONNECTIONS.find((connection) => connection.id === "ad-to-ab-porthole")?.openingDiameterM ?? 0;
const portholeSillM = () => FLOOR_M.AB + stepCountOf("ad-to-ab-porthole") * ESTIMATES.portholeStepRiseM;

/** The middle of the porthole where it opens into AB, in the south wall. */
export function portholeCentre(): Vec3 {
  return [AB_EAST, portholeSillM() + portholeDiameterM() / 2, AB_WALLS.southM];
}

/** The porthole as a level bore through the rock between AB's straight south wall and AD's curved wall. */
export function portholeBore(): Bore {
  const [adEast, adSouth] = centreOf("AD");
  const [east, up, south] = portholeCentre();
  const adFaceBeyondCentreM = Math.sqrt(radiusOf("AD") ** 2 - (east - adEast) ** 2);
  // AD's wall is a circle, so where the bore meets it the face is not square to the bore.
  const adFaceSkew = (east - adEast) / adFaceBeyondCentreM;
  return { id: "ad-to-ab-porthole", from: [east, up, south], to: [east, up, adSouth - adFaceBeyondCentreM], radiusM: portholeDiameterM() / 2, fromSkew: 0, toSkew: adFaceSkew };
}

/**
 * A flight of solid steps against a north or south wall. `towardsRoom` is +1 where the room lies south of the wall.
 * `sideWall` says which flank stands against a wall of its own: +1 the east, -1 the west, 0 neither.
 */
type StepFlight = { id: string; east: number; wallSouth: number; towardsRoom: 1 | -1; sideWall: 1 | 0 | -1; count: number; riseM: number; treadM: number; floorM: number; firstRiseM?: number };

/** The steps of a flight, the highest nearest the wall. Each runs back under the ones above it and into the rock behind. */
function flightSteps({ id, east, wallSouth, towardsRoom, sideWall, count, riseM, treadM, floorM, firstRiseM = 0 }: StepFlight): RockMass[] {
  const widthM = ESTIMATES.stepWidthM + Math.abs(sideWall) * ROOTED_IN_ROCK_M;
  return Array.from({ length: count }, (_, step) => {
    const heightM = firstRiseM + (count - step) * riseM;
    const reachM = (step + 1) * treadM + ROOTED_IN_ROCK_M;
    const middleSouth = wallSouth + towardsRoom * (reachM / 2 - ROOTED_IN_ROCK_M);
    return rockBlock(`${id}-${step}`, [east + (sideWall * ROOTED_IN_ROCK_M) / 2, middleSouth], [widthM, reachM], floorM, floorM + heightM);
  });
}

function abSteps(): RockMass[] {
  const { portholeStepRiseM, portholeStepTreadM, exitStepTreadM, stepWidthM, abDrawnDepthM } = ESTIMATES;
  const exitCount = stepCountOf("ab-exit-stairs");
  const down: StepFlight = { id: "ab-entry-step", east: AB_EAST, wallSouth: AB_WALLS.southM, towardsRoom: -1, sideWall: 0, count: stepCountOf("ad-to-ab-porthole"), riseM: portholeStepRiseM, treadM: portholeStepTreadM, floorM: FLOOR_M.AB };
  const out: StepFlight = { id: "ab-exit-step", east: AB_WALLS.eastM - stepWidthM / 2, wallSouth: AB_WALLS.northM, towardsRoom: 1, sideWall: 1, count: exitCount, riseM: abDrawnDepthM / (exitCount + 1), treadM: exitStepTreadM, floorM: FLOOR_M.AB };
  return [...flightSteps(down), ...flightSteps(out)];
}

/** The line of the serpentine channel on the rock surface, from AB's north wall northwards. */
export function channelPath(): PlanPoint[] {
  const { lengthM, swingM } = ESTIMATES.channel;
  return Array.from({ length: CHANNEL_STEPS + 1 }, (_, step) => {
    const along = step / CHANNEL_STEPS;
    return [AB_EAST + swingM * Math.sin(along * CHANNEL_TURNS * 2 * Math.PI), AB_WALLS.northM - along * lengthM];
  });
}

function channelBoxes(): StoneBox[] {
  const onRock = ([east, south]: PlanPoint): Vec3 => [east, CHANNEL_THICKNESS_M / 2, south];
  const path = channelPath();
  return path.slice(1).map((point, index) => beamBetween(onRock(path[index]), onRock(point), ESTIMATES.channel.widthM, CHANNEL_THICKNESS_M, "dark"));
}

/** AA's bench along the west wall, and the steps at its south end that climb to the rock surface. */
function aaRockMasses(): RockMass[] {
  const [bench] = structure("AA").benches;
  const [, south] = centreOf("AA");
  const lengthM = bench.lengthM ?? 0;
  const count = stepCountOf("aa-outside-steps");
  const benchEndSouth = south + lengthM / 2;
  const riseM = (-FLOOR_M.AA - bench.heightM) / (count + 1);
  const treadM = (AA_WALLS.southM - benchEndSouth) / count;
  const steps: StepFlight = { id: "aa-outside-step", east: AA_WALLS.westM + ESTIMATES.stepWidthM / 2, wallSouth: AA_WALLS.southM, towardsRoom: -1, sideWall: -1, count, riseM, treadM, floorM: FLOOR_M.AA, firstRiseM: bench.heightM };
  const benchMass = westWallBench("aa-west-bench", AA_WALLS.westM, south, bench.depthM, lengthM, FLOOR_M.AA, FLOOR_M.AA + bench.heightM);
  return [benchMass, ...flightSteps(steps)];
}

/** Everything inside AB and AA. */
export function rockRoomParts(): RockRoomParts {
  return {
    boxes: [abSlabPillar(), ...channelBoxes()],
    roundPillars: [...roundPillars("front"), ...roundPillars("back")],
    bosses: abHead(),
    rockMasses: [abLedge(), ...abSteps(), ...aaRockMasses()],
    bores: [portholeBore()],
  };
}
