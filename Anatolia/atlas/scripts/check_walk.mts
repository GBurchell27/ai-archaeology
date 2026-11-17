import { MOVE_KEYS, intentFromKeys } from "../lib/walk/walkKeys.ts";
import { easeToward, moveLimits, moveStep, wishVelocity } from "../lib/walk/walkMovement.ts";
import type { MoveMode, MoveState, Vec3 } from "../lib/walk/walkMovement.ts";
import { WALK_SITES, findWalkSite } from "../lib/walk/walkSites.ts";

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
check("D strafes right, A left", keys("KeyD").strafe === 1 && keys("ArrowLeft").strafe === -1);
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

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
