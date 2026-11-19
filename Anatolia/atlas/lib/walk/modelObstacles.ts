/**
 * The obstacles of a walk model, derived once from the figures its stones are drawn from: a handful of footprints for
 * walls and pillars, not the thousands of stones. Pure.
 */

import { enclosurePillars, openingBearingDeg, pointAtBearing, yawFacingOut, type Enclosure, type PillarPlacement, type PlanPoint, type WalkModel, type WallGap } from "./enclosureModel";
import type { Obstacle } from "./walkObstacles";

const DEGREE = Math.PI / 180;
/** A curved wall is a chain of straight pieces no longer than this, which stay within 2 cm of a 7 m curve. */
const LONGEST_WALL_PIECE_M = 1;

/** A stretch of a ring wall left open: where its middle is, clockwise from north, and how wide along the wall. */
export type WallBreak = { bearingDeg: number; widthM: number };

/** The shaft of a T-pillar. Its head is longer, and above a walker's head. */
export const pillarObstacle = ({ centre, yawRad, size }: PillarPlacement): Obstacle => ({
  centre,
  halfSizeM: [size.thicknessM / 2, size.shaftWidthM / 2],
  yawRad,
  roundM: 0,
});

/**
 * A stretch of ring wall, clockwise from one bearing to another, as straight pieces of its middle line swollen to half
 * its thickness. Whatever is nearer the middle line than that is pushed straight out through the nearer face, never
 * along the wall into the next piece. Each end of the stretch is round, and reaches as far as the wall does.
 */
function wallStretch(centre: PlanPoint, midRadiusM: number, thicknessM: number, wallFromDeg: number, wallToDeg: number): Obstacle[] {
  const endDeg = thicknessM / 2 / midRadiusM / DEGREE;
  const [fromDeg, toDeg] = [wallFromDeg + endDeg, wallToDeg - endDeg];
  if (toDeg <= fromDeg) return [];
  const count = Math.ceil(((toDeg - fromDeg) * DEGREE * midRadiusM) / LONGEST_WALL_PIECE_M);
  const spanDeg = (toDeg - fromDeg) / count;
  return Array.from({ length: count }, (_, index) => {
    const bearingDeg = fromDeg + (index + 0.5) * spanDeg;
    const halfLengthM = midRadiusM * Math.tan((spanDeg * DEGREE) / 2);
    return { centre: pointAtBearing(centre, midRadiusM, bearingDeg), halfSizeM: [halfLengthM, 0], yawRad: yawFacingOut(bearingDeg), roundM: thicknessM / 2 };
  });
}

/** The wall of a ring wherever it stands: all of it but the gap and the breaks, each measured along the middle of the wall. */
export function ringWallObstacles(centre: PlanPoint, gap: WallGap, midRadiusM: number, thicknessM: number, breaks: readonly WallBreak[] = []): Obstacle[] {
  const open = [{ bearingDeg: gap.gapBearingDeg, widthM: gap.gapWidthM }, ...breaks]
    // Clockwise from the gap, so the gap comes first.
    .map(({ bearingDeg, widthM }) => ({ midDeg: gap.gapBearingDeg + ((((bearingDeg - gap.gapBearingDeg) % 360) + 360) % 360), halfDeg: widthM / 2 / midRadiusM / DEGREE }))
    .sort((first, second) => first.midDeg - second.midDeg);
  return open.flatMap((from, index) => {
    const to = open[index + 1] ?? { midDeg: open[0].midDeg + 360, halfDeg: open[0].halfDeg };
    return wallStretch(centre, midRadiusM, thicknessM, from.midDeg + from.halfDeg, to.midDeg - to.halfDeg);
  });
}

/** The walls and pillar shafts of one enclosure. Its benches and pedestals are low and are not obstacles. */
export function enclosureObstacles(enclosure: Enclosure): Obstacle[] {
  const walls = enclosure.rings.flatMap((ring) => {
    const breaks = (ring.openings ?? []).map((opening) => ({ bearingDeg: openingBearingDeg(ring, opening), widthM: opening.widthM }));
    return ringWallObstacles(enclosure.centre, ring, ring.innerRadiusM + ring.wallThicknessM / 2, ring.wallThicknessM, breaks);
  });
  return [...walls, ...enclosurePillars(enclosure).map(pillarObstacle)];
}

export function modelObstacles(model: WalkModel): Obstacle[] {
  return [...model.enclosures.flatMap(enclosureObstacles), ...(model.rockCut?.obstacles ?? [])];
}
