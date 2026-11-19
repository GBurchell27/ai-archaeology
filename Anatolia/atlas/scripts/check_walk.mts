import { register } from "node:module";
import { MOVE_KEYS, intentFromKeys } from "../lib/walk/walkKeys.ts";
import { LONGEST_COUNTED_FRAME_MS, SHUT_WHEEL_GATE, WHEEL_GRACE_MS, WHEEL_STILL_MS, climbAfterWheel, climbThisFrame, easeToward, moveLimits, moveStep, standingAt, startPosition, wheelGateAfterFrame, wheelGateAfterWheel, wishVelocity } from "../lib/walk/walkMovement.ts";
import type { MoveMode, MoveState, Vec3 } from "../lib/walk/walkMovement.ts";
import { WALK_SITES, findWalkSite } from "../lib/walk/walkSites.ts";
import { centralPillars, findPillar, modelBoxes, openingBearingDeg, perimeterPillars, pillarRingRadiusM, pointAtBearing } from "../lib/walk/enclosureModel.ts";
import type { Enclosure, PlanPoint } from "../lib/walk/enclosureModel.ts";

// The walk library files import each other without an extension; teach Node to add it. Files that do so load below.
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);
const { GOBEKLI_TEPE_MODEL } = await import("../lib/walk/gobekliTepeLayout.ts");
const { GOBEKLI_TEPE_LANDMARKS } = await import("../lib/walk/gobekliTepeLandmarks.ts");
const { nearestLandmark, placeOnModel, placeOnPhotographs } = await import("../lib/walk/landmarks.ts");
const { placedLandmarks } = await import("../lib/walk/walkLandmarks.ts");
const { hypothesisFootnote, toggledLayers } = await import("../lib/walk/hypothesisLayers.ts");
const { LIMB_TAPER, armPath, reliefBoxes } = await import("../lib/walk/pillarRelief.ts");
const { bevelInset, bevelledBlock } = await import("../lib/walk/blockBevel.ts");
const { modelRoofs } = await import("../lib/walk/roofModel.ts");
const { steppePlants, tuftBladeCorners } = await import("../lib/walk/steppePlants.ts");
const { markerName, nameWidthPx, unclutteredNameIds } = await import("../lib/walk/markerNames.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const near = (a: number, b: number, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;
const keys = (...codes: string[]) => intentFromKeys(new Set(codes));
const speed = (velocity: Vec3) => Math.hypot(...velocity);

// Keys
check("W walks forward", keys("KeyW").forward === 1 && keys("KeyW").strafe === 0);
check("opposite keys cancel", keys("KeyW", "ArrowDown").forward === 0);
check("D strafes right, A left", keys("KeyD").strafe === 1 && keys("KeyA").strafe === -1);
check("the left and right arrows turn the view and do not strafe", keys("ArrowLeft").turn === -1 && keys("ArrowRight").turn === 1 && keys("ArrowLeft").strafe === 0 && keys("ArrowLeft", "ArrowRight").turn === 0 && keys("KeyA").turn === 0);
check("the up and down arrows still move, and Page Up and Page Down tilt the view", keys("ArrowUp").forward === 1 && keys("ArrowDown").forward === -1 && keys("PageUp").tilt === 1 && keys("PageDown").tilt === -1 && MOVE_KEYS.has("PageUp") && MOVE_KEYS.has("ArrowLeft"));
check("E rises, Q sinks", keys("KeyE").rise === 1 && keys("KeyQ").rise === -1);
check("either Shift is fast", keys("ShiftRight").fast && keys("ShiftLeft").fast && !keys("KeyW").fast);
check("mode and reset keys are not movement keys", !MOVE_KEYS.has("KeyF") && !MOVE_KEYS.has("KeyR") && MOVE_KEYS.has("KeyE"));

// Wished velocity. three.js looks down -z by default, and right of that is +x.
const LOOK_NORTH: Vec3 = [0, 0, -1];
const LOOK_UP_NORTH: Vec3 = [0, 1, -1];
const walkAhead = wishVelocity("walk", LOOK_NORTH, keys("KeyW"));
check("walking forward follows the look direction", near(walkAhead[0], 0) && walkAhead[2] < 0 && walkAhead[1] === 0);
const walkRight = wishVelocity("walk", LOOK_NORTH, keys("KeyD"));
check("right of -z is +x", walkRight[0] > 0 && near(walkRight[2], 0));
check("a diagonal is no faster", near(speed(wishVelocity("walk", LOOK_NORTH, keys("KeyW", "KeyD"))), speed(walkAhead)));
const tilted = wishVelocity("walk", LOOK_UP_NORTH, keys("KeyW"));
check("a tilted look walks at full speed on the floor", tilted[1] === 0 && near(speed(tilted), speed(walkAhead)));
check("walking while looking straight down stands still", speed(wishVelocity("walk", [0, -1, 0], keys("KeyW"))) === 0);
check("walkers cannot rise", speed(wishVelocity("walk", LOOK_NORTH, keys("KeyE"))) === 0);
check("Shift is faster", speed(wishVelocity("walk", LOOK_NORTH, keys("KeyW", "ShiftLeft"))) > speed(walkAhead) * 2);
const flyAhead = wishVelocity("fly", LOOK_UP_NORTH, keys("KeyW"));
check("flying forward follows the full look direction", near(flyAhead[1], -flyAhead[2]) && flyAhead[1] > 0);
check("flying is faster than walking", speed(flyAhead) > speed(walkAhead));
check("flying straight up works", wishVelocity("fly", [0, 1, 0], keys("KeyW"))[1] > 0);
const flyUp = wishVelocity("fly", LOOK_NORTH, keys("KeyE"));
check("E flies along world up", flyUp[1] > 0 && near(flyUp[0], 0) && near(flyUp[2], 0));
check("forward and up together are no faster", near(speed(wishVelocity("fly", [0, 1, 0], keys("KeyW", "KeyE"))), speed(flyUp)));

// Easing
check("easing does not depend on the frame rate", near(easeToward(easeToward(0, 1, 0.05, 0.2), 1, 0.05, 0.2), easeToward(0, 1, 0.1, 0.2)));

// Steps
const LIMITS = moveLimits(1.65, 10);
const REST: Vec3 = [0, 0, 0];

function simulate(start: MoveState, mode: MoveMode, look: Vec3, codes: string[], seconds: number, frameS = 1 / 60): MoveState {
  let state = start;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameS) state = moveStep(state, mode, look, keys(...codes), LIMITS, frameS);
  return state;
}

const standing: MoveState = { position: [0, 1.65, 0], velocity: REST };
const firstFrame = moveStep(standing, "walk", LOOK_NORTH, keys("KeyW"), LIMITS, 1 / 60);
check("a walker accelerates instead of starting at full speed", speed(firstFrame.velocity) > 0 && speed(firstFrame.velocity) < speed(walkAhead) / 2);
const strolling = simulate(standing, "walk", LOOK_NORTH, ["KeyW"], 1);
check("a walker reaches full speed", near(speed(strolling.velocity), speed(walkAhead), 0.01));
const coasting = moveStep(strolling, "walk", LOOK_NORTH, keys(), LIMITS, 1 / 60);
check("a walker coasts to a stop", speed(coasting.velocity) > 0 && speed(coasting.velocity) < speed(strolling.velocity));
check("a stopped walker stays put", simulate(standing, "walk", LOOK_NORTH, [], 1).position.join() === "0,1.65,0");
const slowFrames = simulate(standing, "walk", LOOK_NORTH, ["KeyW"], 1, 1 / 20);
check("distance barely depends on the frame rate", near(slowFrames.position[2], strolling.position[2], 0.08));
const fenced = simulate(standing, "walk", LOOK_NORTH, ["KeyW", "ShiftLeft"], 10);
check("the walker stops at the radius", near(fenced.position[2], -10) && fenced.position[1] === 1.65);

const owed = climbAfterWheel(0, 100);
check("scrolling down owes a climb, up a descent", owed > 0 && climbAfterWheel(0, -100) < 0);
check("a wild wheel cannot owe more than 20 m", climbAfterWheel(0, 1e6) === 20);

// The wheel gate: the zoom that entered the walk must not lift the walker off
const FRAME_MS = 16;
type GateStep = number | "wheel";
/** The gate after a run of frames (each a duration in ms) and wheel events, from shut. */
const gateAfter = (...steps: GateStep[]) => steps.reduce((gate, step) => (step === "wheel" ? wheelGateAfterWheel(gate) : wheelGateAfterFrame(gate, step)), SHUT_WHEEL_GATE);
const frames = (forMs: number): GateStep[] => Array.from({ length: Math.ceil(forMs / FRAME_MS) }, () => FRAME_MS);
/** A wheel still turning: one notch every `everyMs`, for `forMs`. */
const turning = (everyMs: number, forMs: number): GateStep[] => Array.from({ length: Math.floor(forMs / everyMs) }, () => [...frames(everyMs), "wheel" as const]).flat();
check("the gate starts shut", !SHUT_WHEEL_GATE.open);
check("a wheel still turning as the walk appears never opens the gate, however long it turns", [16, 200, 700].every((everyMs) => !gateAfter(...turning(everyMs, 8000)).open));
check("a wheel event inside the grace period does not count, even after a pause", WHEEL_STILL_MS < WHEEL_GRACE_MS && !gateAfter(...frames(WHEEL_GRACE_MS - 2 * FRAME_MS), "wheel").open);
check("the first wheel event after the grace period counts when the wheel was still before it", gateAfter(...frames(WHEEL_GRACE_MS), "wheel").open);
const zoomTail = turning(16, WHEEL_GRACE_MS + 400);
check("after the tail of a zoom, a pause shorter than a moment is still the same gesture", !gateAfter(...zoomTail, ...frames(WHEEL_STILL_MS - 2 * FRAME_MS), "wheel").open);
check("after the tail of a zoom and a pause, the wheel counts", gateAfter(...zoomTail, ...frames(WHEEL_STILL_MS), "wheel").open);
check("once open the gate stays open through fast scrolling", gateAfter(...frames(WHEEL_GRACE_MS), "wheel", FRAME_MS, "wheel", "wheel").open);
const STALL_MS = 6000;
check("a stalled frame is not a pause: wheel events held up behind it do not open the gate", STALL_MS > WHEEL_GRACE_MS + WHEEL_STILL_MS && !gateAfter(...zoomTail, STALL_MS, "wheel").open && !gateAfter(STALL_MS, "wheel").open && LONGEST_COUNTED_FRAME_MS < WHEEL_STILL_MS);
const glide = climbThisFrame(owed, 1 / 60);
check("a wheel notch glides instead of jumping", glide > 0 && glide < owed / 2);
check("a flier climbs by the wheel", near(moveStep(standing, "fly", LOOK_NORTH, keys(), LIMITS, 1 / 60, 0.5).position[1], 2.15));
check("a walker ignores the wheel", moveStep(standing, "walk", LOOK_NORTH, keys(), LIMITS, 1 / 60, 0.5).position[1] === 1.65);

const climbed = simulate(standing, "fly", LOOK_NORTH, ["KeyE", "ShiftLeft"], 10);
check("flying stops at the ceiling", climbed.position[1] === LIMITS.flyCeilingM && LIMITS.flyCeilingM === 20);
check("the ceiling is capped for large sites", moveLimits(1.65, 25).flyCeilingM === 40);
const dived = simulate(climbed, "fly", LOOK_NORTH, ["KeyQ", "ShiftLeft"], 10);
check("flying stops above the floor", dived.position[1] === LIMITS.flyFloorM && LIMITS.flyFloorM > 0);
const farOut = simulate(standing, "fly", LOOK_NORTH, ["KeyW", "ShiftLeft"], 10);
check("flying stops at the dome", near(farOut.position[2], -30) && LIMITS.flyRadiusM === 30);

const highAndFar: MoveState = { position: [0, 20, -30], velocity: [0, -5, 0] };
const landingStart = moveStep(highAndFar, "walk", LOOK_NORTH, keys(), LIMITS, 1 / 60);
check("leaving fly mode eases down, not snaps", landingStart.position[1] < 20 && landingStart.position[1] > 18);
const landed = simulate(highAndFar, "walk", LOOK_NORTH, [], 3);
check("the walker lands at eye height", near(landed.position[1], 1.65, 0.01) && landed.velocity[1] === 0);
check("landing outside the walk radius does not drag the walker in", near(landed.position[2], -30));
check("but they cannot walk further out", near(simulate(landed, "walk", LOOK_NORTH, ["KeyW"], 1).position[2], -30));
check("and they can walk back in", simulate(landed, "walk", LOOK_NORTH, ["KeyS"], 1).position[2] > -29);

// Sites
check("site ids are unique", new Set(WALK_SITES.map((site) => site.id)).size === WALK_SITES.length);
check("a known site is found", findWalkSite("karahan-tepe")?.name === "Karahan Tepe");
check("an unknown site is not", findWalkSite("../etc") === null && findWalkSite(undefined) === null);

// The modelled enclosures
const { enclosures, walkRadiusM } = GOBEKLI_TEPE_MODEL;
const apart = (a: PlanPoint, b: PlanPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const outerRadiusM = (enclosure: Enclosure) => Math.max(...enclosure.rings.map((ring) => ring.innerRadiusM + ring.wallThicknessM));
check("enclosures A to D are modelled", enclosures.map((enclosure) => enclosure.id).sort().join("") === "ABCD");
enclosures.forEach((enclosure, index) => {
  const { id, centre } = enclosure;
  for (const ring of enclosure.rings) {
    const pillars = perimeterPillars(enclosure, ring);
    const entrance: PlanPoint = [centre[0], centre[1] + pillarRingRadiusM(ring)];
    check(`${id}: the pillar count matches the data`, pillars.length === ring.pillarCount);
    check(`${id}: pillars sit on their ring`, pillars.every((pillar) => near(apart(pillar.centre, centre), pillarRingRadiusM(ring))));
    check(`${id}: no pillar stands in the southern entrance`, pillars.every((pillar) => apart(pillar.centre, entrance) > ring.gapWidthM / 2));
    check(`${id}: the central pair is taller than the ring`, enclosure.centralPair.pillar.heightM > ring.pillar.heightM);
  }
  const pair = centralPillars(enclosure);
  check(`${id}: two central pillars straddle the centre`, pair.length === 2 && near(pair[0].centre[0] + pair[1].centre[0], 2 * centre[0]) && pair[0].centre[1] === centre[1]);
  check(`${id}: inside the walk radius`, apart(centre, [0, 0]) + outerRadiusM(enclosure) < walkRadiusM);
  for (const other of enclosures.slice(index + 1)) {
    check(`${id} and ${other.id} do not overlap`, apart(centre, other.centre) > outerRadiusM(enclosure) + outerRadiusM(other));
  }
});
const enclosureD = enclosures.find((enclosure) => enclosure.id === "D")!;
check("the walker starts inside Enclosure D, south of its central pillars", apart([0, 0], enclosureD.centre) < enclosureD.rings[0].innerRadiusM && enclosureD.centre[1] < 0);
const boxes = modelBoxes(enclosures);
check("every box rests on or above the floor", boxes.every((box) => box.centre[1] - box.size[1] / 2 >= -1e-9 && box.size.every((side) => side > 0)));
check("the tallest block is D's pillar on its pedestal", near(Math.max(...boxes.map((box) => box.centre[1] + box.size[1] / 2)), 5.75));
check("the layout is the same on every visit", JSON.stringify(modelBoxes(enclosures)) === JSON.stringify(boxes));
check("the model stays cheap to draw", boxes.length > 1000 && boxes.length < 8000);

// Wall stones: where two of a course meet, one stands clear of the other on both faces and on top.
type Stone = (typeof boxes)[number];
/** How far a plan point lies outside a stone's middle line. A wall stone's own third axis points into the ring. */
const outsideStoneM = (stone: Stone, east: number, south: number) => -(east - stone.centre[0]) * Math.sin(stone.yawRad) - (south - stone.centre[2]) * Math.cos(stone.yawRad);
/** The end of a stone's middle line nearest a plan point. */
function stoneEndNear(stone: Stone, east: number, south: number): [number, number] {
  const [alongEast, alongSouth] = [Math.cos(stone.yawRad), -Math.sin(stone.yawRad)];
  const halfM = (Math.sign((east - stone.centre[0]) * alongEast + (south - stone.centre[2]) * alongSouth) * stone.size[0]) / 2;
  return [stone.centre[0] + halfM * alongEast, stone.centre[2] + halfM * alongSouth];
}
/** The least step between two neighbouring stones over their overlap, on either face and on top. Faces that cross there count as no step. */
function leastJointStepM(first: Stone, second: Stone): number {
  const ends = [stoneEndNear(first, second.centre[0], second.centre[2]), stoneEndNear(second, first.centre[0], first.centre[2])];
  const faceSteps = [-0.5, 0.5].map((face) => {
    const steps = ends.map(([east, south]) => outsideStoneM(second, east, south) - face * second.size[2] - outsideStoneM(first, east, south) + face * first.size[2]);
    return Math.sign(steps[0]) === Math.sign(steps[1]) ? Math.min(...steps.map(Math.abs)) : 0;
  });
  const topStepM = Math.abs(first.centre[1] + first.size[1] / 2 - second.centre[1] - second.size[1] / 2);
  return Math.min(...faceSteps, topStepM);
}
const sameCourse = (first: Stone, second: Stone) => near(first.centre[1] - first.size[1] / 2, second.centre[1] - second.size[1] / 2) && Math.hypot(first.centre[0] - second.centre[0], first.centre[2] - second.centre[2]) < (first.size[0] + second.size[0]) / 2;
/** The least step at any joint of these walls, or nothing when too few joints were found for that to mean anything. */
function leastStepInWallsM(stones: readonly Stone[]): number {
  const steps = stones.slice(1).flatMap((stone, index) => (stone.kind === "stone" && stones[index].kind === "stone" && sameCourse(stones[index], stone) ? [leastJointStepM(stones[index], stone)] : []));
  return steps.length > 300 ? Math.min(...steps) : 0;
}
check("no two neighbouring wall stones share a face or cross within their overlap", leastStepInWallsM(boxes) > 0.003);
check("both sites name a model", WALK_SITES.filter((site) => site.modelId).map((site) => site.id).join() === "gobekli-tepe,karahan-tepe");

// Named pillars and landmarks
const { landmarks } = GOBEKLI_TEPE_LANDMARKS;
const onModel = placeOnModel(landmarks, GOBEKLI_TEPE_MODEL);
const placedById = (id: string) => onModel.find((placed) => placed.landmark.id === id)!;
check("landmark ids are unique", new Set(landmarks.map((landmark) => landmark.id)).size === landmarks.length);
check("every landmark has a name, a description and a source", landmarks.every((landmark) => landmark.name && landmark.description.length > 60 && landmark.source.label && landmark.source.url.startsWith("https://")));
check("every landmark stands in the model", onModel.length === landmarks.length);
for (const landmark of landmarks) {
  const enclosure = enclosures.find((candidate) => candidate.id === landmark.enclosureId);
  check(`${landmark.id}: its enclosure is modelled`, enclosure !== undefined);
  if (enclosure && landmark.pillarNumber !== undefined) check(`${landmark.id}: its pillar is in the layout`, findPillar(enclosure, landmark.pillarNumber) !== null);
}
check("each enclosure has a landmark of its own", enclosures.every((enclosure) => landmarks.some((landmark) => landmark.enclosureId === enclosure.id && landmark.pillarNumber === undefined)));
const pillarNumbers = enclosures.flatMap((enclosure) => [...enclosure.rings.flatMap((ring) => perimeterPillars(enclosure, ring)), ...centralPillars(enclosure)]).flatMap((pillar) => pillar.pillarNumber ?? []);
check("no pillar number is used twice", new Set(pillarNumbers).size === pillarNumbers.length);
const [pillar31, pillar18] = centralPillars(enclosureD);
check("Pillar 31 is D's western and Pillar 18 its eastern central pillar", pillar31.pillarNumber === 31 && pillar18.pillarNumber === 18 && pillar31.centre[0] < pillar18.centre[0]);
const pillar43 = findPillar(enclosureD, 43)!;
check("Pillar 43 stands in D's wall to the north-west", pillar43.centre[0] < enclosureD.centre[0] && pillar43.centre[1] < enclosureD.centre[1] && near(apart(pillar43.centre, enclosureD.centre), pillarRingRadiusM(enclosureD.rings[0])));
check("an unknown pillar number is not found", findPillar(enclosureD, 999) === null);

// The gap in D's northern wall
const ringD = enclosureD.rings[0];
const [northGap] = ringD.openings ?? [];
const northGapBearingDeg = openingBearingDeg(ringD, northGap);
const wallMidRadiusM = ringD.innerRadiusM + ringD.wallThicknessM / 2;
const northGapMiddle = pointAtBearing(enclosureD.centre, wallMidRadiusM, northGapBearingDeg);
const sealedD: Enclosure = { ...enclosureD, rings: [{ ...ringD, openings: [] }] };
const stonesLeftOut = modelBoxes([sealedD]).filter((sealed) => !modelBoxes([enclosureD]).some((box) => JSON.stringify(box) === JSON.stringify(sealed)));
check("D's wall is open in its northern section", northGapBearingDeg > 315 && northGapBearingDeg < 360 && stonesLeftOut.length > 20);
check("only stones in the gap are left out", stonesLeftOut.every((stone) => stone.kind === "stone" && apart([stone.centre[0], stone.centre[2]], northGapMiddle) < northGap.widthM / 2 + ringD.wallThicknessM));
check("no wall stone is left in the gap", boxes.every((box) => box.centre[1] < ringD.benchHeightM || apart([box.centre[0], box.centre[2]], northGapMiddle) > northGap.widthM / 4));
check("the bench runs on across the gap", boxes.some((box) => box.centre[1] < ringD.benchHeightM && apart([box.centre[0], box.centre[2]], pointAtBearing(enclosureD.centre, ringD.innerRadiusM - ringD.benchDepthM / 2, northGapBearingDeg)) < 0.5));
const besideGap = perimeterPillars(enclosureD, ringD).filter((pillar) => apart(pillar.centre, northGapMiddle) < northGap.widthM);
check("Pillar 43 stands beside the gap, west of it, with one pillar across it", besideGap.length === 2 && besideGap[0].pillarNumber === 43 && besideGap[0].centre[0] < besideGap[1].centre[0]);
check("both pillars stand clear of the gap", besideGap.every((pillar) => apart(pillar.centre, northGapMiddle) > northGap.widthM / 2 + ringD.pillar.thicknessM / 2));
check("the photographs show no landmark until a position is filled in", placeOnPhotographs(GOBEKLI_TEPE_LANDMARKS).length === Object.keys(GOBEKLI_TEPE_LANDMARKS.photographsPositionsM).length);
const filledIn = placeOnPhotographs({ landmarks, photographsPositionsM: { "pillar-43": [3, 1.6, -7] } });
check("a filled-in photographs position places just that landmark", filledIn.length === 1 && filledIn[0].landmark.id === "pillar-43" && filledIn[0].markerM[1] > 1.6);
check("an unknown site has no landmarks", placedLandmarks("nowhere", null).length === 0 && placedLandmarks("gobekli-tepe", GOBEKLI_TEPE_MODEL).length === landmarks.length);

// Which card shows
const EYE_M = 1.65;
const shownAt = (position: Vec3, look: Vec3) => nearestLandmark(onModel, position, look)?.landmark.id ?? null;
const [east43, , south43] = placedById("pillar-43").positionM;
const twoMetresInside: Vec3 = [east43 * 0.7, EYE_M, enclosureD.centre[1] + (south43 - enclosureD.centre[1]) * 0.7];
const towards43: Vec3 = [east43 - twoMetresInside[0], 0, south43 - twoMetresInside[2]];
check("the walker starts inside Enclosure D, so its card shows", shownAt([0, EYE_M, 0], LOOK_NORTH) === "enclosure-d");
check("walking up to Pillar 43 and facing it shows its card", shownAt(twoMetresInside, towards43) === "pillar-43");
check("looking along the wall instead, the enclosure's card shows", shownAt(twoMetresInside, [-towards43[2], 0, towards43[0]]) === "enclosure-d");
check("with their back to it, the central pillar they now face shows", shownAt(twoMetresInside, [-towards43[0], 0, -towards43[2]]) === "pillar-31");
check("right at a pillar its card shows whichever way they look", shownAt([east43, EYE_M, south43 + 1], [0, 0, 1]) === "pillar-43");
const between: Vec3 = [enclosureD.centre[0], EYE_M + 0.25, enclosureD.centre[1]];
check("between D's central pillars the faced one wins", shownAt(between, [1, 0, 0]) === "pillar-18" && shownAt(between, [-1, 0, 0]) === "pillar-31");
check("the nearer of two faced pillars wins", shownAt([enclosureD.centre[0] + 0.5, EYE_M, enclosureD.centre[1] + 2], LOOK_NORTH) === "pillar-18");
check("high above the site no card shows", shownAt([east43, 25, south43], [0, -1, 0]) === null);
check("far from every enclosure no card shows", shownAt([30, EYE_M, -25], LOOK_NORTH) === null);
check("no landmarks, no card", nearestLandmark([], [0, EYE_M, 0], LOOK_NORTH) === null);

// A card that shows holds on a little past its limits, so it does not flicker at the edge of its range
const keptAt = (position: Vec3, look: Vec3, shownId: string) => nearestLandmark(onModel, position, look, shownId)?.landmark.id ?? null;
const pillar43Range = placedById("pillar-43").rangeM;
const awayFrom43 = (awayM: number): Vec3 => [east43 + (awayM * -towards43[0]) / Math.hypot(towards43[0], towards43[2]), EYE_M, south43 + (awayM * -towards43[2]) / Math.hypot(towards43[0], towards43[2])];
const justOutside = awayFrom43(pillar43Range + 0.3);
check("just outside a pillar's range its card does not appear", shownAt(justOutside, towards43) !== "pillar-43");
check("but a card already showing there stays", keptAt(justOutside, towards43, "pillar-43") === "pillar-43");
check("and goes once the walker is well outside", keptAt(awayFrom43(pillar43Range + 1.5), towards43, "pillar-43") !== "pillar-43");
const alongWall: Vec3 = [-towards43[2] + 0.1 * towards43[0], 0, towards43[0] + 0.1 * towards43[2]];
check("turning a little past side-on keeps a showing card and does not start one", keptAt(twoMetresInside, alongWall, "pillar-43") === "pillar-43" && shownAt(twoMetresInside, alongWall) !== "pillar-43");
check("with their back to it a showing card still goes", keptAt(twoMetresInside, [-towards43[0], 0, -towards43[2]], "pillar-43") === "pillar-31");
const nearlyMidway: Vec3 = [enclosureD.centre[0] + 0.5, EYE_M, enclosureD.centre[1] + 2];
check("a showing card holds until another pillar is clearly nearer", keptAt([enclosureD.centre[0] + 0.1, EYE_M, enclosureD.centre[1] + 2], LOOK_NORTH, "pillar-31") === "pillar-31" && keptAt(nearlyMidway, LOOK_NORTH, "pillar-31") === "pillar-18");
check("a shown id that is not placed changes nothing", keptAt([0, EYE_M, 0], LOOK_NORTH, "nowhere") === "enclosure-d");

// Marker names that would cover one another
const tag = (id: string, xPx: number, yPx: number, distanceM: number) => ({ id, xPx, yPx, widthPx: nameWidthPx(id), distanceM });
check("a marker name is the part before the comma", markerName("Pillar 43, the Vulture Stone") === "Pillar 43" && markerName("Enclosure D") === "Enclosure D");
check("a longer name is wider", nameWidthPx("Enclosure D") > nameWidthPx("Pillar 9"));
check("names that are apart all show", unclutteredNameIds([tag("one", 100, 100, 30), tag("two", 400, 100, 20), tag("three", 100, 160, 10)]).length === 3);
check("of two names on top of each other the nearer shows", unclutteredNameIds([tag("far", 100, 100, 30), tag("near", 120, 104, 20)]).join() === "near");
check("names side by side on one line need room for both widths", unclutteredNameIds([tag("Enclosure D", 100, 100, 30), tag("Pillar 43", 170, 100, 20)]).length === 1 && unclutteredNameIds([tag("Enclosure D", 100, 100, 30), tag("Pillar 43", 210, 100, 20)]).length === 2);
check("a name hidden by one that is itself hidden still shows", unclutteredNameIds([tag("aa", 100, 100, 10), tag("bb", 130, 100, 20), tag("cc", 160, 100, 30)]).join() === "aa,cc");
check("a name already showing keeps its place against one barely nearer", unclutteredNameIds([tag("far", 100, 100, 21), tag("near", 120, 104, 20)], new Set(["far"])).join() === "far");
check("but not against one much nearer", unclutteredNameIds([tag("far", 100, 100, 30), tag("near", 120, 104, 20)], new Set(["far"])).join() === "near");
check("no names, nothing to show", unclutteredNameIds([]).length === 0);

// Range is measured on the floor: in the photographs the walker is on a walkway several metres above the pillars
const onPhotographs = placeOnPhotographs(GOBEKLI_TEPE_LANDMARKS);
const photographsCard = (position: Vec3, look: Vec3) => nearestLandmark(onPhotographs, position, look)?.landmark.id ?? null;
const splatSite = findWalkSite("gobekli-tepe")!;
const fromSplatStart = (placed: { positionM: Vec3 }) => Math.hypot(placed.positionM[0], placed.positionM[2]);
const walkwayOver = ({ positionM }: { positionM: Vec3 }, southM = 0): Vec3 => [positionM[0], splatSite.eyeHeightM, positionM[2] + southM];
const inPhotographs = (id: string) => onPhotographs.find((placed) => placed.landmark.id === id)!;
check("the photographs place landmarks well below the walkway", onPhotographs.length >= 8 && onPhotographs.every((placed) => splatSite.eyeHeightM - placed.positionM[1] > 4));
check("every landmark in the photographs can be reached on foot", onPhotographs.every((placed) => fromSplatStart(placed) < splatSite.walkRadiusM));
check("a walker on the walkway over a pillar gets its card whichever way they look", onPhotographs.filter((placed) => !placed.surrounds).every((placed) => [LOOK_NORTH, [1, 0, 0] as Vec3, [0, -1, 0] as Vec3].every((look) => photographsCard(walkwayOver(placed), look) === placed.landmark.id)));
check("a walker on the walkway over an enclosure gets a card", onPhotographs.filter((placed) => placed.surrounds).every((placed) => photographsCard(walkwayOver(placed), LOOK_NORTH) !== null));
check("over Enclosure C with their back to Pillar 27, the enclosure's card shows", photographsCard(walkwayOver(inPhotographs("enclosure-c")), [0, 0, 1]) === "enclosure-c");
check("three metres along the walkway from Pillar 18, facing it shows its card", photographsCard(walkwayOver(inPhotographs("pillar-18"), 3), LOOK_NORTH) === "pillar-18");
check("and facing away shows Enclosure D's", photographsCard(walkwayOver(inPhotographs("pillar-18"), 3), [0, 0, 1]) === "enclosure-d");
check("at the splat's start no card shows", photographsCard([0, splatSite.eyeHeightM, 0], LOOK_NORTH) === null);
check("a flyer far above a landmark gets no card", photographsCard([inPhotographs("pillar-18").positionM[0], 20, inPhotographs("pillar-18").positionM[2]], LOOK_NORTH) === null);
check("in the model a low flyer over Pillar 43 gets its card without facing it", shownAt([east43, 8, south43], [0, -1, 0]) === "pillar-43");

// The sketched relief and the conjectural layers
const relief = reliefBoxes(enclosures);
const tallestShaftM = enclosureD.centralPair.pedestalHeightM + enclosureD.centralPair.pillar.heightM;
check("only D's two central pillars carry relief", relief.length > 0 && relief.length % 2 === 0 && relief.every((box) => apart([box.centre[0], box.centre[2]], enclosureD.centre) < 3));
const arm = armPath();
check("an arm runs down from the shoulder and ends at the narrow front", arm.every((point, index) => index === 0 || point[1] < arm[index - 1][1]) && arm[arm.length - 1][0] === 1 && arm.every((point) => Math.abs(point[0]) <= 1));
const fingers = relief.filter((box) => box.size[1] < 0.03);
check("each of the four hands has five fingers that stay on the front of the pillar", fingers.length === 20 && fingers.every((finger) => finger.size[0] < enclosureD.centralPair.pillar.thicknessM / 2));
const armBars = relief.filter((box) => box.tiltRad !== undefined);
check("an arm narrows towards the wrist", armBars.length === 2 * (arm.length - 1) && armBars.slice(1, arm.length - 1).every((bar, index) => bar.size[1] < armBars[index].size[1]));
check("each limb narrows to its far end: the elbow is one width and the forearm ends as wide as the wrist", near(armBars[0].size[1] * LIMB_TAPER, armBars[1].size[1]) && near(armBars[1].size[1] * LIMB_TAPER, 0.11));
check("the relief stays on the shafts", relief.every((box) => box.centre[1] > enclosureD.centralPair.pedestalHeightM && box.centre[1] < tallestShaftM - enclosureD.centralPair.pillar.headHeightM));

// The block with worn edges
const wornBlock = bevelledBlock();
const wornVertexCount = wornBlock.positions.length / 3;
check("the worn block has three vertices at each corner, and 44 triangles", wornVertexCount === 24 && wornBlock.normals.length === 72 && wornBlock.triangles.length === 3 * 44);
const sidesOfTriangles = new Map<string, number>();
wornBlock.triangles.forEach((vertex, index) => {
  const next = wornBlock.triangles[index - (index % 3) + ((index + 1) % 3)];
  sidesOfTriangles.set(`${vertex}>${next}`, (sidesOfTriangles.get(`${vertex}>${next}`) ?? 0) + 1);
});
check(
  "the worn block is closed: every side is shared by two triangles that agree which way is out",
  [...sidesOfTriangles].every(([side, count]) => count === 1 && sidesOfTriangles.get(side.split(">").reverse().join(">")) === 1),
);
const wornVertexMoves = Array.from({ length: wornVertexCount }, (_, vertex) => {
  const corner = [0, 1, 2].map((axis) => Math.sign(wornBlock.positions[3 * vertex + axis])) as [number, number, number];
  const faceAxis = [0, 1, 2].find((axis) => wornBlock.normals[3 * vertex + axis] !== 0)!;
  return { corner, faceAxis, inset: bevelInset(corner, faceAxis), normal: wornBlock.normals[3 * vertex + faceAxis] };
});
check(
  "each vertex of the worn block faces out of its own face and moves inwards across it, never along its normal",
  wornVertexMoves.every(({ corner, faceAxis, inset, normal }) => normal === corner[faceAxis] && inset.every((move, axis) => move === (axis === faceAxis ? 0 : -corner[axis]))),
);

const { hypotheses } = GOBEKLI_TEPE_MODEL;
check("every hypothesis layer says whose it is and cites a source", hypotheses.length >= 2 && hypotheses.every((layer) => layer.note.length > 60 && layer.sources.length > 0 && layer.sources.every((source) => source.url.startsWith("https://"))));
check("toggling a layer switches it on and off", toggledLayers([], "roofs").join() === "roofs" && toggledLayers(["roofs", "surroundings"], "roofs").join() === "surroundings");
check("the footnote is silent with no layer on", hypothesisFootnote(hypotheses, []) === "");
check("the footnote names what is conjecture", hypothesisFootnote(hypotheses, ["roofs"]).includes("Roofs") && hypothesisFootnote(hypotheses, ["roofs"]).includes("conjecture"));
const roofs = modelRoofs(enclosures);
check("each enclosure gets one roof", roofs.length === enclosures.length);
roofs.forEach((roof, index) => {
  const enclosure = enclosures[index];
  const { cover, timbers } = roof;
  check(`${enclosure.id}: the roof rises from the wall to an opening over the centre`, cover.openingHeightM > cover.eavesHeightM && cover.openingRadiusM > 0 && cover.openingRadiusM < cover.eavesRadiusM);
  check(`${enclosure.id}: the eaves clear the ring pillars`, cover.eavesHeightM > enclosure.rings[0].pillar.heightM - 0.5 && cover.eavesRadiusM > pillarRingRadiusM(enclosure.rings[0]));
  check(`${enclosure.id}: a frame of four beams and a rafter for each ring pillar`, timbers.length === 4 + enclosure.rings[0].pillarCount && timbers.every((timber) => timber.kind === "timber"));
});
const plants = steppePlants(enclosures);
const insideAnEnclosure = (block: { centre: Vec3 }) => enclosures.some((enclosure) => apart([block.centre[0], block.centre[2]], enclosure.centre) < outerRadiusM(enclosure));
check("trees are few and widely spaced, grass is plenty", plants.crowns.length > 10 && plants.crowns.length < 90 && plants.trunks.length === plants.crowns.length && plants.tufts.length > 500 && plants.tufts.length < 3000);
check("no plant grows inside an enclosure", ![...plants.trunks, ...plants.tufts].some(insideAnEnclosure));
check("the plants are the same on every visit", JSON.stringify(steppePlants(enclosures)) === JSON.stringify(plants));
const bladeCorners = tuftBladeCorners();
const bladeHeights = bladeCorners.filter((_, index) => index % 3 === 1);
check("a tuft is whole triangles of thin blades", bladeCorners.length > 0 && bladeCorners.length % 9 === 0 && bladeCorners.every(Number.isFinite));
check("a tuft fills the unit box it is scaled from", near(Math.min(...bladeHeights), -0.5) && near(Math.max(...bladeHeights), 0.5) && bladeCorners.every((value) => Math.abs(value) <= 0.5 + 1e-9));
check("the tuft is the same on every visit", JSON.stringify(tuftBladeCorners()) === JSON.stringify(bladeCorners));

// Ground that is not flat: a sunken room 2 m down, west of x = 0
const stepped = moveLimits(1.65, 10, (x) => (x < 0 ? -2 : 0));
const steppedWalk = (start: MoveState, codes: string[], seconds: number) => {
  let state = start;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 1 / 60) state = moveStep(state, "walk", [-1, 0, 0], keys(...codes), stepped, 1 / 60);
  return state;
};
check("flat ground is the default", LIMITS.groundHeightM(3, 4) === 0);
check("the start is standing at the origin, and standing elsewhere is at eye height there", startPosition(LIMITS).join() === standingAt(LIMITS, 0, 0).join() && standingAt(LIMITS, 3, 4).join() === [3, LIMITS.eyeHeightM, 4].join());
const intoRoom = steppedWalk({ position: [1, 1.65, 0], velocity: REST }, ["KeyW"], 3);
check("a walker who steps into a sunken room stands at eye height above its floor", intoRoom.position[0] < -1 && near(intoRoom.position[1], -0.35, 0.01));
const firstStepDown = steppedWalk({ position: [-0.01, 1.65, 0], velocity: REST }, [], 1 / 60);
check("they glide down to it, not snap", firstStepDown.position[1] < 1.65 && firstStepDown.position[1] > 1.4);
const hovering = moveStep({ position: [5, 0.1, 0], velocity: REST }, "fly", LOOK_NORTH, keys(), stepped, 1 / 60);
const inTheRoom = moveStep({ position: [-5, -1.9, 0], velocity: REST }, "fly", LOOK_NORTH, keys(), stepped, 1 / 60);
check("a flier stays above the ground under them, in or out of a room", near(hovering.position[1], 0.4) && near(inTheRoom.position[1], -1.6));

// Karahan Tepe: the rock-cut model
const { KARAHAN_TEPE_MODEL } = await import("../lib/walk/karahanModel.ts");
const { KARAHAN_TEPE_LANDMARKS } = await import("../lib/walk/karahanTepeLandmarks.ts");
const karahanLayout = await import("../lib/walk/karahanTepeLayout.ts");
const { structureOutline, FLOOR_M } = await import("../lib/walk/karahanPlan.ts");
const { adAsRing } = await import("../lib/walk/karahanMainBuilding.ts");
const { boreRimPoint, groundHeightM, wallFootings } = await import("../lib/walk/rockCutModel.ts");
type WallFooting = ReturnType<typeof wallFootings>[number];
const { outlineBounds, outlineGapM, pointInOutline, rectangleOutline, ringSectorOutline, smoothedPath } = await import("../lib/walk/planOutline.ts");

const site = KARAHAN_TEPE_MODEL.rockCut!;
const structures = karahanLayout.KARAHAN_TEPE_STRUCTURES;
const outlines = Object.fromEntries(structures.map((structure) => [structure.id, structureOutline(structure.id)])) as Record<string, PlanPoint[]>;
const inside = (id: string, point: PlanPoint) => pointInOutline(outlines[id], point);
const fromStart = (point: PlanPoint) => Math.hypot(point[0], point[1]);
const groupCount = (structureId: string, kind: string) => structures.find((structure) => structure.id === structureId)!.pillarGroups.filter((group) => group.kind === kind).reduce((sum, group) => sum + group.count, 0);
check("Structures AA to AD are in the layout", structures.map((structure) => structure.id).sort().join() === "AA,AB,AC,AD");
const adRing = adAsRing();
check("AD has the layout's 16 wall pillars and its central pair", perimeterPillars(adRing, adRing.rings[0]).length === 16 && centralPillars(adRing).length === 2 && groupCount("AD", "t-pillar") === 18);
check("AD's pillars stay below the rock face", [adRing.rings[0].pillar, adRing.centralPair.pillar].every((pillar) => pillar.heightM <= -FLOOR_M.AD));
check("AB has the layout's ten bedrock pillars and one slab", site.roundPillars.length === 10 && groupCount("AB", "phallic-bedrock-pillar") === 10 && site.boxes.filter((box) => box.kind === "dressed").length === groupCount("AB", "free-standing-slab"));
const standingInAb = [...site.roundPillars, ...site.bosses, ...site.boxes.filter((box) => box.kind === "dressed")];
check("AB's pillars, slab and carved head lie inside AB's footprint", standingInAb.every((block) => inside("AB", [block.centre[0], block.centre[2]])));
check("AB's pillars stand on its floor", site.roundPillars.every((pillar) => near(pillar.centre[1] - pillar.size[1] / 2, FLOOR_M.AB)));
const [porthole] = site.bores;
const turns = [0, 1, 2, 3, 4, 5, 6, 7].map((eighth) => (eighth * Math.PI) / 4);
const adCentre = adRing.centre;
check("the porthole is one bore, the layout's 0.7 m across, wholly below the rock surface", site.bores.length === 1 && near(2 * porthole.radiusM, 0.7) && porthole.from[1] + porthole.radiusM < 0 && near(porthole.from[1], porthole.to[1]));
check("it runs from AB's south wall to AD's wall", near(porthole.from[2], Math.max(...outlines.AB.map((point) => point[1]))) && near(Math.hypot(porthole.to[0] - adCentre[0], porthole.to[2] - adCentre[1]), 11.5));
check("its rim lies on AB's flat wall at one end", turns.every((turn) => near(boreRimPoint(porthole, "from", turn)[2], porthole.from[2])));
check("and on AD's round wall at the other, to within two centimetres", turns.every((turn) => { const [east, , south] = boreRimPoint(porthole, "to", turn); return near(Math.hypot(east - adCentre[0], south - adCentre[1]), 11.5, 0.02); }));
check("the rim is a circle of the bore's radius seen along the bore", turns.every((turn) => { const [east, up] = boreRimPoint(porthole, "from", turn); return near(Math.hypot(east - porthole.from[0], up - porthole.from[1]), porthole.radiusM); }));
check("the head is a head and a neck, the head turned a little south, the neck joined to the west wall", site.bosses.map((boss) => boss.profile).join() === "head,neck" && site.bosses[0].yawRad < 0 && site.bosses[0].yawRad > -0.5 && near(site.bosses[1].centre[0] - site.bosses[1].size[0] / 2, Math.min(...outlines.AB.map((point) => point[0]))));
const massIds = site.rockMasses.map((mass) => mass.id);
check("what was left in the rock is drawn as rock: AD's two bench steps, AC's kerb, AB's ledge and nine steps, AA's bench and two steps", massIds.length === 16 && new Set(massIds).size === 16 && ["ad-rock-bench-1", "ac-rock-kerb", "ab-west-ledge", "ab-entry-step-4", "ab-exit-step-3", "aa-west-bench", "aa-outside-step-1"].every((id) => massIds.includes(id)));
check("every rock mass stands on a floor or the low ground and stays below the rock surface", site.rockMasses.every((mass) => mass.topM > mass.bottomM && mass.topM <= 1e-9 && [site.lowGroundM, FLOOR_M.AB, FLOOR_M.AA].some((floorM) => mass.bottomM >= floorM - 1e-9)));
check("AB's five entry steps climb to the sill of the porthole", near(Math.max(...site.rockMasses.filter((mass) => mass.id.startsWith("ab-entry-step")).map((mass) => mass.topM)), porthole.from[1] - porthole.radiusM));
check("every entry step runs back into the wall behind it, so no joint shows between step and rock", site.rockMasses.filter((mass) => mass.id.startsWith("ab-entry-step")).every((mass) => outlineBounds(mass.outline).southM > porthole.from[2]));
check("the neck is broader at the wall than the head it carries", site.bosses[1].size[2] > site.bosses[0].size[2]);
check("no rock is drawn as jointed blocks", site.boxes.every((box) => box.kind !== "rock"));

const connected = new Set(karahanLayout.KARAHAN_TEPE_CONNECTIONS.filter((connection) => connection.from !== "outside" && connection.to !== "outside").map((connection) => [connection.from, connection.to].sort().join()));
structures.forEach((structure, index) => {
  for (const other of structures.slice(index + 1)) {
    const [first, second] = [outlines[structure.id], outlines[other.id]];
    const pair = [structure.id, other.id].sort().join();
    const gapM = outlineGapM(first, second);
    check(`${pair} do not overlap`, gapM > 0.5 && !first.some((point) => inside(other.id, point)) && !second.some((point) => inside(structure.id, point)));
    if (connected.has(pair)) check(`${pair} are connected in the layout, so they are neighbours`, gapM < 2.5);
  }
  check(`${structure.id}: inside the walk radius`, outlines[structure.id].every((point) => fromStart(point) < KARAHAN_TEPE_MODEL.walkRadiusM));
});
const square = rectangleOutline([2, 3], 4, 2);
check("a rectangle outline has its four corners", square.length === 4 && near(outlineBounds(square).westM, 0) && near(outlineBounds(square).southM, 4) && pointInOutline(square, [2, 3]));
const sector = ringSectorOutline([0, 0], 2, 3, 90, 270, 8);
check("a ring sector holds the points between its radii on its own side only", pointInOutline(sector, [0, 2.5]) && !pointInOutline(sector, [0, -2.5]) && !pointInOutline(sector, [0, 1]));
const corner: PlanPoint[] = [[0, 0], [4, 0], [4, 4]];
const curve = smoothedPath(corner, 12);
check("a smoothed path passes through every point it was given", curve.length === 25 && corner.every((point) => curve.some((other) => near(other[0], point[0]) && near(other[1], point[1]))));
const turnsAlong = (path: PlanPoint[]) => path.slice(2).map((point, index) => Math.abs(Math.atan2(point[1] - path[index + 1][1], point[0] - path[index + 1][0]) - Math.atan2(path[index + 1][1] - path[index][1], path[index + 1][0] - path[index][0])));
check("and turns a corner a little at a time", Math.max(...turnsAlong(curve)) < 0.5);
check("the sunken rooms lie wholly inside the rock terrace", site.rooms.every((room) => room.outline.every((point) => pointInOutline(site.terraceOutline, point))));
const groundAt = ([east, south]: PlanPoint) => groundHeightM(site, east, south);
const centreOfOutline = (id: string): PlanPoint => [0, 1].map((axis) => outlines[id].reduce((sum, point) => sum + point[axis], 0) / outlines[id].length) as unknown as PlanPoint;
check("the walker starts inside AD, on its floor, south of its centre", inside("AD", [0, 0]) && near(groundAt([0, 0]), -4.3) && centreOfOutline("AD")[1] < 0);
check("each room's floor is at its own depth", near(groundAt(centreOfOutline("AB")), -2.3) && near(groundAt(centreOfOutline("AA")), -1.1) && near(groundAt(centreOfOutline("AD")), -4.3));
check("the rock west of AD is the surface, and the ground east of it is AD's floor", groundAt([-20, -7]) === 0 && near(groundAt([20, 0]), -4.3) && near(groundAt(centreOfOutline("AC")), -4.3));
check("between AD and AB the walker is up on the rock", groundAt([centreOfOutline("AB")[0], Math.max(...outlines.AB.map((point) => point[1])) + 0.5]) === 0);
check("no block of the model hangs below the low ground or outside the walk radius", site.boxes.every((box) => box.centre[1] - box.size[1] / 2 >= site.lowGroundM - 1e-9 && box.size.every((side) => side > 0) && fromStart([box.centre[0], box.centre[2]]) < KARAHAN_TEPE_MODEL.walkRadiusM));
check("the Karahan model stays cheap to draw", site.boxes.length > 500 && site.boxes.length < 4000);
const inFooting = (footing: WallFooting, [east, south]: PlanPoint) => east > footing.westM && east < footing.eastM && south > footing.northM && south < footing.southM;
const footings = wallFootings(site.rooms);
check("each sunken room's walls stand in its own footing, at its own floor, and in no other", site.rooms.every((room, index) => footings[index].floorM === room.floorM && room.outline.every((point) => footings.every((footing, other) => inFooting(footing, point) === (other === index)))));
check("AD's rock face is in no room's footing, so it stands on the low ground", outlines.AD.every((point) => !footings.some((footing) => inFooting(footing, point))));
check("nor do two neighbouring stones of AD's built wall and bench", leastStepInWallsM(site.boxes) > 0.003);

// Karahan Tepe: landmarks
const karahanLandmarks = KARAHAN_TEPE_LANDMARKS.landmarks;
const onKarahan = placeOnModel(karahanLandmarks, KARAHAN_TEPE_MODEL);
const layoutElementIds = new Set<string>([
  ...structures.flatMap((structure) => [structure.id, ...structure.pillarGroups.map((group) => group.id), ...structure.benches.map((bench) => bench.id)]),
  ...karahanLayout.KARAHAN_TEPE_CONNECTIONS.map((connection) => connection.id),
  // The channel has no dimensions in the sources, so it lives in the layout's drawing estimates.
  ...("channel" in karahanLayout.KARAHAN_TEPE_DRAWING_ESTIMATES ? ["ab-serpentine-channel"] : []),
]);
check("Karahan landmark ids are unique", new Set(karahanLandmarks.map((landmark) => landmark.id)).size === karahanLandmarks.length);
check("every Karahan landmark has a name, a description and a source", karahanLandmarks.every((landmark) => landmark.name && landmark.description.length > 60 && landmark.source.label && landmark.source.url.startsWith("https://")));
check("every Karahan landmark with a place names a layout element", karahanLandmarks.every((landmark) => landmark.placeId === undefined || layoutElementIds.has(landmark.placeId)));
check("nine landmarks stand in the model and the two finds with no known building do not", onKarahan.length === 9 && karahanLandmarks.length === 11 && onKarahan.every((placed) => placed.landmark.placeId !== undefined));
check("no two Karahan landmarks stand in the same place", new Set(onKarahan.map((placed) => placed.positionM.join())).size >= onKarahan.length - 1);
check("every Karahan landmark is inside the walk radius", onKarahan.every((placed) => fromStart([placed.positionM[0], placed.positionM[2]]) < KARAHAN_TEPE_MODEL.walkRadiusM));
check("the Karahan photographs show no landmark", placedLandmarks("karahan-tepe", null).length === 0 && placedLandmarks("karahan-tepe", KARAHAN_TEPE_MODEL).length === 9);
const karahanCard = (position: Vec3, look: Vec3) => nearestLandmark(onKarahan, position, look)?.landmark.id ?? null;
const [abEast, abSouth] = centreOfOutline("AB");
const [adEast, adSouth] = centreOfOutline("AD");
const eyeIn = (id: "AB" | "AD", east: number, south: number): Vec3 => [east, FLOOR_M[id] + EYE_M, south];
check("at the start the card is AD's", karahanCard(eyeIn("AD", 0, 0), LOOK_NORTH) === "ad-rock-cut-wall");
check("walking up to AD's central pair shows their card", karahanCard(eyeIn("AD", adEast, adSouth + 3), LOOK_NORTH) === "ad-central-pillars");
check("in the middle of AB, facing west, the card is the carved head's", karahanCard(eyeIn("AB", abEast, abSouth), [-1, 0, 0]) === "ab-carved-head");
check("facing north along the rows instead, it is the pillars'", karahanCard(eyeIn("AB", abEast + 0.5, abSouth), LOOK_NORTH) === "ab-bedrock-pillars");
check("just inside AB's entrance the card is the porthole's", karahanCard(eyeIn("AB", abEast, abSouth + 3), LOOK_NORTH) === "ab-porthole-entrance");
check("high above Karahan no card shows", karahanCard([abEast, 30, abSouth], [0, -1, 0]) === null);
check("on the terrace above AB, facing west, the carved head's card still shows", karahanCard([abEast, EYE_M, abSouth], [-1, 0, 0]) === "ab-carved-head");
const compass: Vec3[] = Array.from({ length: 8 }, (_, turn) => [Math.sin((turn * Math.PI) / 4), 0, -Math.cos((turn * Math.PI) / 4)]);
check("from the start in AD no card of another building shows, whichever way the walker looks", compass.every((look) => karahanCard(eyeIn("AD", 0, 0), look)?.startsWith("ad-")));

// Karahan Tepe: conjectural layers
const karahanLayers = KARAHAN_TEPE_MODEL.hypotheses;
check("Karahan offers backfilling and a cover over AB, and no vegetation", karahanLayers.map((layer) => layer.id).join() === "backfill,roofs");
check("every Karahan layer says whose reading it is and cites a source", karahanLayers.every((layer) => layer.note.includes("Karul") && layer.sources.length > 0 && layer.sources.every((source) => source.url.startsWith("https://"))));
check("every Karahan layer has something to draw", karahanLayers.every((layer) => (site.layerDrawings[layer.id]?.boxes.length ?? 0) > 0 && (site.layerDrawings[layer.id]?.prisms.length ?? 0) > 0));
const backfill = site.layerDrawings.backfill!;
check("the fill lies between a room's floor and the rock surface", backfill.prisms.every((prism) => prism.bottomM >= FLOOR_M.AB - 1e-9 && prism.topM > prism.bottomM && prism.topM <= 0));
check("AB's fill is the published 0.45 m of soil under 1.5 m of dark fill", near(backfill.prisms[0].topM - backfill.prisms[0].bottomM, 0.45) && near(backfill.prisms[1].topM - backfill.prisms[1].bottomM, 1.5));
const capStones = backfill.boxes.filter((box) => box.centre[1] > -0.3);
check("the capping stones leave the southern half of AB and AA open", capStones.length > 6 && capStones.every((stone) => stone.centre[2] < abSouth));
check("stones stand on each of AB's six shorter pillars", backfill.boxes.length - capStones.length === 18);
const cover = site.layerDrawings.roofs!;
check("the cover lies over AB only, above the rock", cover.prisms.length === 1 && cover.prisms[0].bottomM > 0 && cover.boxes.every((beam) => beam.kind === "timber" && beam.centre[1] > 0 && inside("AB", [beam.centre[0], beam.centre[2]])));
// Both layers are out of sight from the start inside AD, so each says where it is and gives a place to stand.
const karahanLimits = moveLimits(1.65, KARAHAN_TEPE_MODEL.walkRadiusM, (x, z) => groundHeightM(site, x, z));
for (const layer of karahanLayers) {
  const { standAt, lookAt } = layer.viewpoint ?? { standAt: [NaN, NaN], lookAt: [NaN, NaN, NaN] };
  const eye = standingAt(karahanLimits, standAt[0], standAt[1]);
  const drawn = site.layerDrawings[layer.id]!;
  const reachM = Math.max(...[...drawn.boxes.map((box) => [box.centre[0], box.centre[2]]), ...drawn.prisms.flatMap((prism) => prism.outline)].map(([east, south]) => Math.hypot(east - eye[0], south - eye[2])));
  check(`${layer.id}: says which structure it is drawn in`, /Structures? A[AB]/.test(layer.where ?? ""));
  check(`${layer.id}: the viewpoint is on the terrace, inside the walk radius`, groundAt([standAt[0], standAt[1]]) === 0 && fromStart([standAt[0], standAt[1]]) < KARAHAN_TEPE_MODEL.walkRadiusM);
  check(`${layer.id}: the viewpoint is outside every building`, (["AD", "AB", "AA"] as const).every((id) => !inside(id, [standAt[0], standAt[1]])));
  check(`${layer.id}: the viewpoint looks north and down at the layer, all of it within 15 m`, lookAt[2] < eye[2] && lookAt[1] < eye[1] && reachM < 15);
}
check("the Göbekli layers show from the start and need no viewpoint", hypotheses.every((layer) => layer.viewpoint === undefined));
check("the Karahan footnote names the layer shown", hypothesisFootnote(karahanLayers, ["backfill"]).includes("Buried on purpose"));

// Turning by the keys, for a visitor without a mouse
const { lookStep } = await import("../lib/walk/walkMovement.ts");
type LookState = Parameters<typeof lookStep>[0];
const STILL_VIEW: LookState = { yawRad: 0, pitchRad: 0, yawRadPerS: 0, pitchRadPerS: 0 };
const lookFor = (codes: string[], seconds: number, frameS = 1 / 60, from = STILL_VIEW) => {
  let view = from;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameS) view = lookStep(view, keys(...codes), frameS);
  return view;
};
const turnedRight = lookFor(["ArrowRight"], 1);
check("the right arrow turns the view to the right, which three.js counts as a negative turn", turnedRight.yawRad < -1 && turnedRight.pitchRad === 0 && lookFor(["ArrowLeft"], 1).yawRad > 1);
check("a turn eases in instead of starting at full speed", Math.abs(lookFor(["ArrowRight"], 1 / 60).yawRadPerS) < Math.abs(turnedRight.yawRadPerS) / 2);
check("a turn barely depends on the frame rate", near(lookFor(["ArrowRight"], 1, 1 / 20).yawRad, turnedRight.yawRad, 0.08));
const settled = lookFor([], 3, 1 / 60, turnedRight);
check("a released turn coasts to exactly still, so a view at rest is left to the mouse", settled.yawRadPerS === 0 && settled.yawRad < turnedRight.yawRad && lookStep(STILL_VIEW, keys("KeyW"), 1 / 60).yawRad === 0);
check("Page Up tilts the view up and stops short of straight up", lookFor(["PageUp"], 5).pitchRad > 1.4 && lookFor(["PageUp"], 5).pitchRad < Math.PI / 2 && lookFor(["PageDown"], 5).pitchRad < -1.4);
check("a steeper tilt set by the mouse is kept", lookStep({ ...STILL_VIEW, pitchRad: 1.55 }, keys(), 1 / 60).pitchRad === 1.55);

// Collision: a walker is kept out of walls and pillars, a flyer is not
const { modelObstacles } = await import("../lib/walk/modelObstacles.ts");
const { HIGHEST_STEP_M, WALKER_RADIUS_M, obstructedBy, pushedOut } = await import("../lib/walk/walkObstacles.ts");
type Obstacles = ReturnType<typeof modelObstacles>;
type Limits = ReturnType<typeof moveLimits>;
const isClearOf = (obstacles: Obstacles, [east, south]: PlanPoint) => obstacles.every((obstacle) => { const [toEast, toSouth] = pushedOut([east, south], obstacle); return near(toEast, east, 1e-6) && near(toSouth, south, 1e-6); });
/** Every frame of someone holding W from a plan point, looking one way. */
function journey(limits: Limits, from: PlanPoint, look: Vec3, seconds: number, mode: MoveMode = "walk"): PlanPoint[] {
  let state: MoveState = { position: standingAt(limits, from[0], from[1]), velocity: REST };
  return Array.from({ length: Math.round(seconds * 60) }, () => {
    state = moveStep(state, mode, look, keys("KeyW"), limits, 1 / 60);
    return [state.position[0], state.position[2]] as PlanPoint;
  });
}
const endOf = (path: PlanPoint[]) => path[path.length - 1];
const LOOK_EAST: Vec3 = [1, 0, 0];
const LOOK_SOUTH: Vec3 = [0, 0, 1];
const gobekliObstacles = modelObstacles(GOBEKLI_TEPE_MODEL);
const FLAT = () => 0;
const gobekliLimits = moveLimits(EYE_M, walkRadiusM, FLAT, obstructedBy(gobekliObstacles, FLAT));
const fromCentreD = (point: PlanPoint) => apart(point, enclosureD.centre);
check("the obstacles are a few footprints, not the thousands of stones", gobekliObstacles.length > 50 && gobekliObstacles.length < 400 && site.obstacles.length < 100);
check("the start is free in both models", isClearOf(gobekliObstacles, [0, 0]) && isClearOf(site.obstacles, [0, 0]));
const southOfCentre: PlanPoint = [enclosureD.centre[0], enclosureD.centre[1] + 2];
const intoWall = journey(gobekliLimits, southOfCentre, LOOK_EAST, 8);
check("a walker heading into D's wall never enters it or a pillar", intoWall.every((point) => isClearOf(gobekliObstacles, point) && fromCentreD(point) < ringD.innerRadiusM));
check("and slides along it instead of stopping dead", endOf(intoWall)[0] > southOfCentre[0] + 4 && Math.abs(endOf(intoWall)[1] - southOfCentre[1]) > 0.3);
check("a flyer on the same course passes through", fromCentreD(endOf(journey(gobekliLimits, southOfCentre, LOOK_EAST, 8, "fly"))) > ringD.innerRadiusM + ringD.wallThicknessM);
const [, pillar18Shaft] = centralPillars(enclosureD);
const besidePillar18: PlanPoint = [pillar18Shaft.centre[0] + pillar18Shaft.size.thicknessM / 2 + 0.05, pillar18Shaft.centre[1] + 3];
const roundPillar = journey(gobekliLimits, besidePillar18, LOOK_NORTH, 4);
check("a walker who clips the corner of Pillar 18 is turned aside round it and walks on", roundPillar.every((point) => isClearOf(gobekliObstacles, point)) && endOf(roundPillar)[1] < pillar18Shaft.centre[1] - 1 && endOf(roundPillar)[0] > besidePillar18[0] + 0.1);
const headOn = journey(gobekliLimits, [pillar18Shaft.centre[0], pillar18Shaft.centre[1] + 3], LOOK_NORTH, 4);
check("a walker who meets Pillar 18 head on stops a radius short of it", near(endOf(headOn)[1], pillar18Shaft.centre[1] + pillar18Shaft.size.shaftWidthM / 2 + WALKER_RADIUS_M, 1e-6));
const towardsGap = pointAtBearing([0, 0], 1, northGapBearingDeg);
const beforeGap = pointAtBearing(enclosureD.centre, ringD.innerRadiusM - 3, northGapBearingDeg);
const throughGap = journey(gobekliLimits, beforeGap, [towardsGap[0], 0, towardsGap[1]], 5);
check("the gap in D's northern wall is walked through", fromCentreD(endOf(throughGap)) > ringD.innerRadiusM + ringD.wallThicknessM + 1 && throughGap.every((point) => isClearOf(gobekliObstacles, point)));
const sealedLimits = moveLimits(EYE_M, walkRadiusM, FLAT, obstructedBy(modelObstacles({ ...GOBEKLI_TEPE_MODEL, enclosures: [sealedD] }), FLAT));
check("and with the gap walled up the same walk stops at the wall", fromCentreD(endOf(journey(sealedLimits, beforeGap, [towardsGap[0], 0, towardsGap[1]], 5))) < ringD.innerRadiusM);
check("the walker can leave D by the southern entrance they start in", endOf(journey(gobekliLimits, [0, 0], LOOK_SOUTH, 3))[1] > 3);
const insideTheWall = pointAtBearing(enclosureD.centre, wallMidRadiusM - 0.2, 90);
check("a flyer who lands inside a wall is put down beside it", isClearOf(gobekliObstacles, endOf(journey(gobekliLimits, insideTheWall, LOOK_NORTH, 1 / 60))) && !isClearOf(gobekliObstacles, insideTheWall));

// Collision at Karahan Tepe: a rock face blocks, the drawn steps are climbed
const { roomWalls } = await import("../lib/walk/karahanPlan.ts");
const karahanGround = (x: number, z: number) => groundHeightM(site, x, z);
const karahanWalkLimits = moveLimits(EYE_M, KARAHAN_TEPE_MODEL.walkRadiusM, karahanGround, obstructedBy(site.obstacles, karahanGround));
const adBenchTopM = FLOOR_M.AD + structures.find((structure) => structure.id === "AD")!.benches[0].heightM;
const sixteenWays: Vec3[] = Array.from({ length: 16 }, (_, turn) => [Math.sin((turn * Math.PI) / 8), 0, -Math.cos((turn * Math.PI) / 8)]);
const roundAd = sixteenWays.map((look) => journey(karahanWalkLimits, [0, 0], look, 25));
check("whichever way they walk from the start, AD's rock face and built wall keep the walker inside AD", roundAd.every((path) => path.every((point) => inside("AD", point) && groundAt(point) <= adBenchTopM + 1e-9 && isClearOf(site.obstacles, point))));
check("on the way they step up AD's bench, built or rock-cut", roundAd.filter((path) => near(groundAt(endOf(path)), adBenchTopM)).length >= 8);
check("a flyer leaves AD over the rock", !inside("AD", endOf(journey(karahanWalkLimits, [0, 0], [-1, 0, 0], 5, "fly"))));
const abWalls = roomWalls("AB");
const aaWalls = roomWalls("AA");
const halfStepWidthM = karahanLayout.KARAHAN_TEPE_DRAWING_ESTIMATES.stepWidthM / 2;
check("a step is under a metre, and AB's ledge is too tall to be one", HIGHEST_STEP_M < 1 && site.rockMasses.find((mass) => mass.id === "ab-west-ledge")!.topM - FLOOR_M.AB > HIGHEST_STEP_M);
const upExitSteps = journey(karahanWalkLimits, [abWalls.eastM - halfStepWidthM, abWalls.northM + 3], LOOK_NORTH, 6);
check("AB's exit steps are climbed from its floor to the rock surface", near(groundAt(upExitSteps[0]), FLOOR_M.AB) && groundAt(endOf(upExitSteps)) === 0 && endOf(upExitSteps)[1] < abWalls.northM - 1);
const toPorthole = journey(karahanWalkLimits, [abEast, abWalls.southM - 3], LOOK_SOUTH, 6);
check("the steps below the porthole are climbed to its sill, and the wall behind them stops the walker", near(groundAt(endOf(toPorthole)), porthole.from[1] - porthole.radiusM) && endOf(toPorthole)[1] < abWalls.southM);
const besideExitSteps = journey(karahanWalkLimits, [abEast, abWalls.northM + 3], LOOK_NORTH, 6);
check("beside the steps AB's rock wall stops them a radius short", near(groundAt(endOf(besideExitSteps)), FLOOR_M.AB) && near(endOf(besideExitSteps)[1], abWalls.northM + WALKER_RADIUS_M, 0.05));
const ontoAaBench = journey(karahanWalkLimits, [aaWalls.westM + 2, (aaWalls.northM + aaWalls.southM) / 2], [-1, 0, 0], 3);
const upAaSteps = journey(karahanWalkLimits, endOf(ontoAaBench), LOOK_SOUTH, 8);
check("AA's bench is stepped onto, and the two steps at its south end climb to the rock surface", groundAt(endOf(ontoAaBench)) > FLOOR_M.AA && groundAt(endOf(upAaSteps)) === 0 && endOf(upAaSteps)[1] > aaWalls.southM + 1);
check("a walker may step off the terrace down into AB", groundAt([abEast, abWalls.southM + 1]) === 0 && groundAt(endOf(journey(karahanWalkLimits, [abEast, abWalls.southM + 1], LOOK_NORTH, 2))) < -1);

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
