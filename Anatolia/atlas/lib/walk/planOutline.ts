/** Pure plan geometry for closed outlines: loops of [east, south] points in local metres. */

import { pointAtBearing, type PlanPoint } from "./enclosureModel";

export type Outline = readonly PlanPoint[];

/** An arc of a circle as points, from one bearing to another (clockwise from north, in degrees), both ends included. */
export function arcPoints(centre: PlanPoint, radiusM: number, fromBearingDeg: number, toBearingDeg: number, segments: number): PlanPoint[] {
  return Array.from({ length: segments + 1 }, (_, step) => pointAtBearing(centre, radiusM, fromBearingDeg + (step / segments) * (toBearingDeg - fromBearingDeg)));
}

/** A circle as a loop that starts due south of the centre and runs by the west, the north and the east. */
export function circleOutline(centre: PlanPoint, radiusM: number, segments = 64): PlanPoint[] {
  return arcPoints(centre, radiusM, 180, 540, segments).slice(0, segments);
}

/** A plain rectangle with its sides running east-west and north-south. */
export function rectangleOutline([east, south]: PlanPoint, eastWestM: number, northSouthM: number): PlanPoint[] {
  const [halfEastM, halfSouthM] = [eastWestM / 2, northSouthM / 2];
  return [[east + halfEastM, south + halfSouthM], [east - halfEastM, south + halfSouthM], [east - halfEastM, south - halfSouthM], [east + halfEastM, south - halfSouthM]];
}

/** Part of a ring between two radii and two bearings: a curved bench or kerb seen in plan. */
export function ringSectorOutline(centre: PlanPoint, innerRadiusM: number, outerRadiusM: number, fromBearingDeg: number, toBearingDeg: number, segments: number): PlanPoint[] {
  return [...arcPoints(centre, outerRadiusM, fromBearingDeg, toBearingDeg, segments), ...arcPoints(centre, innerRadiusM, toBearingDeg, fromBearingDeg, segments)];
}

/** One point of a Catmull-Rom span from `from` to `to`, whose neighbours on either side set the direction at each end. */
function splinePoint(before: PlanPoint, from: PlanPoint, to: PlanPoint, after: PlanPoint, share: number): PlanPoint {
  const along = (axis: 0 | 1) => {
    const [a, b, c, d] = [before[axis], from[axis], to[axis], after[axis]];
    return 0.5 * (2 * b + (c - a) * share + (2 * a - 5 * b + 4 * c - d) * share ** 2 + (3 * b - a - 3 * c + d) * share ** 3);
  };
  return [along(0), along(1)];
}

/** A smooth open curve through every point given, both ends included, with `stepsPerSpan` points for each span. */
export function smoothedPath(points: readonly PlanPoint[], stepsPerSpan: number): PlanPoint[] {
  const at = (index: number) => points[Math.min(Math.max(index, 0), points.length - 1)];
  const spans = points.slice(1).flatMap((_, span) =>
    Array.from({ length: stepsPerSpan }, (_, step) => splinePoint(at(span - 1), at(span), at(span + 1), at(span + 2), step / stepsPerSpan)),
  );
  return [...spans, at(points.length - 1)];
}

const CORNER_SIGNS: readonly PlanPoint[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

/** A rectangle with quarter-circle corners, as a loop from the south-east corner by the south-west, north-west and north-east. */
export function roundedRectangleOutline(centre: PlanPoint, eastWestM: number, northSouthM: number, cornerRadiusM: number, stepsPerCorner = 6): PlanPoint[] {
  const [halfEastM, halfSouthM] = [eastWestM / 2 - cornerRadiusM, northSouthM / 2 - cornerRadiusM];
  return CORNER_SIGNS.flatMap(([eastSign, southSign], corner) =>
    Array.from({ length: stepsPerCorner + 1 }, (_, step): PlanPoint => {
      const angle = ((corner + step / stepsPerCorner) * Math.PI) / 2;
      return [centre[0] + eastSign * halfEastM + cornerRadiusM * Math.cos(angle), centre[1] + southSign * halfSouthM + cornerRadiusM * Math.sin(angle)];
    }),
  );
}

/** The outline shrunk or grown about a point, so two surfaces that would share a face do not. */
export function scaledOutline(outline: Outline, about: PlanPoint, factor: number): PlanPoint[] {
  return outline.map(([east, south]) => [about[0] + (east - about[0]) * factor, about[1] + (south - about[1]) * factor]);
}

/** Even-odd ray casting. A point exactly on an edge may fall either side. */
export function pointInOutline(outline: Outline, [east, south]: PlanPoint): boolean {
  let inside = false;
  for (let index = 0, previous = outline.length - 1; index < outline.length; previous = index, index += 1) {
    const [fromEast, fromSouth] = outline[index];
    const [toEast, toSouth] = outline[previous];
    const straddles = fromSouth > south !== toSouth > south;
    if (straddles && east < fromEast + ((south - fromSouth) / (toSouth - fromSouth)) * (toEast - fromEast)) inside = !inside;
  }
  return inside;
}

export type OutlineBounds = { westM: number; eastM: number; northM: number; southM: number };

export function outlineBounds(outline: Outline): OutlineBounds {
  const easts = outline.map((point) => point[0]);
  const souths = outline.map((point) => point[1]);
  return { westM: Math.min(...easts), eastM: Math.max(...easts), northM: Math.min(...souths), southM: Math.max(...souths) };
}

/** The shortest distance between the corners of two outlines: enough to tell that two finely drawn loops stay apart. */
export function outlineGapM(first: Outline, second: Outline): number {
  return Math.min(...first.flatMap(([east, south]) => second.map((other) => Math.hypot(east - other[0], south - other[1]))));
}
