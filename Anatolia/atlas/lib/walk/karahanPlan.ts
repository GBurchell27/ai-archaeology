/**
 * The Karahan Tepe layout turned into walk metres: where each structure lies from the walker's start, how deep its
 * floor is, its outline, and the edge of the rock terrace. Pure. Every figure comes from karahanTepeLayout.ts.
 */

import { pointAtBearing, type PlanPoint } from "./enclosureModel";
import {
  KARAHAN_TEPE_CONNECTIONS,
  KARAHAN_TEPE_DRAWING_ESTIMATES as ESTIMATES,
  KARAHAN_TEPE_STRUCTURES,
  KARAHAN_TEPE_WALKER_START,
  type PlanPosition,
  type Structure,
} from "./karahanTepeLayout";
import { arcPoints, circleOutline, roundedRectangleOutline, smoothedPath, type Outline } from "./planOutline";
import type { SunkenRoom } from "./rockCutModel";

/** The terrace runs out to the far hills of the backdrop. */
const TERRACE_FAR_RADIUS_M = 296;
export const HALF_CIRCLE_SEGMENTS = 32;
/** Rock left standing against a rock face runs this far back into it, so no gap shows between the two. */
export const ROOTED_IN_ROCK_M = 0.1;
const EDGE_STEPS_PER_SPAN = 8;
const NORTH = 0;
const SOUTH = 180;

const START = KARAHAN_TEPE_WALKER_START.position;

/** A layout position (east and north of AD's centre) as a walk point (east and south of the walker's start). */
export const toWalkPoint = ({ eastM, northM }: PlanPosition): PlanPoint => [eastM - START.eastM, START.northM - northM];

export function structure(id: Structure["id"]): Structure {
  const found = KARAHAN_TEPE_STRUCTURES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Structure ${id} is not in the Karahan Tepe layout`);
  return found;
}

/** How many steps the layout gives a connection, or none where it gives no count. */
export const stepCountOf = (connectionId: string) => KARAHAN_TEPE_CONNECTIONS.find((connection) => connection.id === connectionId)?.stepCount ?? 0;

export const centreOf = (id: Structure["id"]) => toWalkPoint(structure(id).centre);
export const radiusOf = (id: "AD" | "AC") => structure(id).footprint.eastWestM / 2;

/** AD's floor, which is also the ground east of the terrace. */
export const LOW_GROUND_M = -(structure("AD").footprint.depthBelowBedrockM ?? 0);

/** The floor of each structure as drawn. AC stands on the low ground: its interior is not excavated. */
export const FLOOR_M: Record<Structure["id"], number> = {
  AD: LOW_GROUND_M,
  AB: -ESTIMATES.abDrawnDepthM,
  AA: -(structure("AA").footprint.depthBelowBedrockM ?? 0),
  AC: LOW_GROUND_M,
};

/** The four walls of a room drawn as a rounded rectangle, in walk metres. South is the larger number. */
export type RoomWalls = { westM: number; eastM: number; northM: number; southM: number };

export function roomWalls(id: "AB" | "AA"): RoomWalls {
  const [east, south] = centreOf(id);
  const { eastWestM, northSouthM } = structure(id).footprint;
  return { westM: east - eastWestM / 2, eastM: east + eastWestM / 2, northM: south - northSouthM / 2, southM: south + northSouthM / 2 };
}

export function structureOutline(id: Structure["id"]): Outline {
  const { footprint } = structure(id);
  if (id === "AD" || id === "AC") return circleOutline(centreOf(id), footprint.eastWestM / 2);
  return roundedRectangleOutline(centreOf(id), footprint.eastWestM, footprint.northSouthM, ESTIMATES.roomCornerRadiusM);
}

/** The rooms cut wholly into the terrace. AD is not one: its west half is a bite out of the terrace's edge. */
export function sunkenRooms(): SunkenRoom[] {
  return (["AB", "AA"] as const).map((id) => ({ id, outline: structureOutline(id), floorM: FLOOR_M[id] }));
}

function edgePoints(points: readonly PlanPosition[]): PlanPoint[] {
  const adCentre = structure("AD").centre;
  return points.map(({ eastM, northM }) => toWalkPoint({ eastM: adCentre.eastM + eastM, northM: adCentre.northM + northM }));
}

/**
 * The rock terrace: AD's western half-circle from its south point round to its north point, the edge curving on
 * north through the estimated points, a far arc round the west, and the edge curving back from the south.
 */
export function terraceOutline(): Outline {
  const adCentre = centreOf("AD");
  const adPoint = (bearingDeg: number) => pointAtBearing(adCentre, radiusOf("AD"), bearingDeg);
  // AD's own north and south points are the arc's last and first, so they are dropped from the two curves.
  const northEdge = smoothedPath([adPoint(NORTH), ...edgePoints(ESTIMATES.terraceEdgeNorthOfAd)], EDGE_STEPS_PER_SPAN).slice(1);
  const southEdge = smoothedPath([...edgePoints(ESTIMATES.terraceEdgeSouthOfAd), adPoint(SOUTH)], EDGE_STEPS_PER_SPAN).slice(0, -1);
  return [...arcPoints(adCentre, radiusOf("AD"), SOUTH, 360, HALF_CIRCLE_SEGMENTS), ...northEdge, ...arcPoints(adCentre, TERRACE_FAR_RADIUS_M, 350, 190, 16), ...southEdge];
}
