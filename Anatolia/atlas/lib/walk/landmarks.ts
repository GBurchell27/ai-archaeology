/**
 * Landmarks of a walk: things worth a card when the walker comes near. The text of a landmark is held apart from
 * where it stands, because each source (the model, the photographs) has its own positions. World metres, y up.
 */

import { centralPillars, findPillar, type Enclosure, type ModelSource, type WalkModel } from "./enclosureModel";
import type { Vec3 } from "./walkMovement";

export type Landmark = {
  id: string;
  name: string;
  /** The enclosure it belongs to, as named in the model's layout. */
  enclosureId: string;
  /** The excavation number of the pillar described. Absent when the landmark is the enclosure itself. */
  pillarNumber?: number;
  /** For a model that lists its own places (`RockCutModel.landmarkPlaces`): the id of the place it stands at. */
  placeId?: string;
  /** Two to four sentences of published fact. An interpretation is worded as one. */
  description: string;
  source: ModelSource;
};

export type SiteLandmarks = {
  landmarks: readonly Landmark[];
  /** Where each landmark stands in the photographs source, by landmark id, after the site's splat alignment. */
  photographsPositionsM: Readonly<Record<string, Vec3>>;
};

export type PlacedLandmark = {
  landmark: Landmark;
  /** The point a visitor looks at, about eye height. */
  positionM: Vec3;
  /** Where the marker floats so it shows from the air. */
  markerM: Vec3;
  /** The card shows within this distance of `positionM`, measured on the floor. */
  rangeM: number;
  /** True when the walker stands inside it (a building), so there is nothing to face and anything faced in it wins. */
  surrounds: boolean;
};

/** Where a landmark stands, before it is joined to its text. */
export type LandmarkPlace = Omit<PlacedLandmark, "landmark">;

const LOOK_HEIGHT_M = 1.6;
const PILLAR_RANGE_M = 4.5;
/** Used where no ring gives the size of an enclosure, which is every landmark in the photographs. */
const OPEN_RANGE_M = 6;
const MARKER_ABOVE_PILLAR_M = 0.5;
const MARKER_ABOVE_ENCLOSURE_M = 3;
const MARKER_ABOVE_PHOTOGRAPH_POINT_M = 2;
/** Closer than this the walker need not face a pillar: they are standing at it. */
const TOUCHING_M = 1.5;
/** Cosine of the widest angle, on the floor, between the look direction and a pillar that still counts as faced. */
const FACING_COSINE = 0.25;

function placeEnclosure(landmark: Landmark, enclosure: Enclosure): PlacedLandmark {
  const [east, south] = enclosure.centre;
  const { pillar, pedestalHeightM } = enclosure.centralPair;
  return {
    landmark,
    positionM: [east, LOOK_HEIGHT_M, south],
    markerM: [east, pedestalHeightM + pillar.heightM + MARKER_ABOVE_ENCLOSURE_M, south],
    rangeM: Math.min(...enclosure.rings.map((ring) => ring.innerRadiusM)),
    surrounds: true,
  };
}

function placeOnEnclosure(landmark: Landmark, enclosure: Enclosure): PlacedLandmark | null {
  if (landmark.pillarNumber === undefined) return placeEnclosure(landmark, enclosure);
  const pillar = findPillar(enclosure, landmark.pillarNumber);
  if (!pillar) return null;
  const [east, south] = pillar.centre;
  return {
    landmark,
    positionM: [east, pillar.baseM + LOOK_HEIGHT_M, south],
    markerM: [east, pillar.baseM + pillar.size.heightM + MARKER_ABOVE_PILLAR_M, south],
    rangeM: PILLAR_RANGE_M,
    surrounds: false,
  };
}

/** Each landmark at the place, pillar or enclosure it names. One the model does not hold is left out. */
export function placeOnModel(landmarks: readonly Landmark[], model: WalkModel): PlacedLandmark[] {
  return landmarks.flatMap((landmark) => {
    const place = landmark.placeId ? model.rockCut?.landmarkPlaces[landmark.placeId] : undefined;
    if (place) return [{ landmark, ...place }];
    const enclosure = model.enclosures.find((candidate) => candidate.id === landmark.enclosureId);
    const placed = enclosure ? placeOnEnclosure(landmark, enclosure) : null;
    return placed ? [placed] : [];
  });
}

/** Only the landmarks whose position in the photographs has been filled in. */
export function placeOnPhotographs({ landmarks, photographsPositionsM }: SiteLandmarks): PlacedLandmark[] {
  return landmarks.flatMap((landmark) => {
    const positionM = photographsPositionsM[landmark.id];
    if (!positionM) return [];
    const markerM: Vec3 = [positionM[0], positionM[1] + MARKER_ABOVE_PHOTOGRAPH_POINT_M, positionM[2]];
    const surrounds = landmark.pillarNumber === undefined;
    return [{ landmark, positionM, markerM, rangeM: surrounds ? OPEN_RANGE_M : PILLAR_RANGE_M, surrounds }];
  });
}

/**
 * A landmark more than this far above or below the walker's eyes is out of reach whatever the distance on the floor.
 * Loose, because in the photographs the visitor stands on a walkway several metres above the pillars.
 */
const REACH_HEIGHT_M = 12;

/**
 * Distance on the floor (x and z only). Height is left out, so a walker on a walkway or a terrace above a landmark
 * is as near to it as one standing beside it.
 */
function floorDistanceM(from: Vec3, to: Vec3): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2]);
}

/** How squarely the look direction, flattened onto the floor, points at the landmark: 1 straight at it, -1 away. */
function facingCosine(position: Vec3, look: Vec3, target: Vec3): number {
  const [east, south] = [target[0] - position[0], target[2] - position[2]];
  const lengths = Math.hypot(east, south) * Math.hypot(look[0], look[2]);
  return lengths > 0 ? (east * look[0] + south * look[2]) / lengths : -1;
}

/** A card already showing holds on this much past each limit, so it does not flicker at the edge of its range. */
const KEEP_EXTRA_M = 0.6;
const KEEP_FACING_COSINE = 0;

function isNoticed(placed: PlacedLandmark, position: Vec3, look: Vec3, isShown: boolean): boolean {
  const awayM = floorDistanceM(position, placed.positionM);
  const extraM = isShown ? KEEP_EXTRA_M : 0;
  if (awayM > placed.rangeM + extraM || Math.abs(placed.positionM[1] - position[1]) > REACH_HEIGHT_M + extraM) return false;
  // The walker stands inside an enclosure, so there is nothing to face.
  if (placed.surrounds || awayM <= TOUCHING_M + extraM) return true;
  return facingCosine(position, look, placed.positionM) >= (isShown ? KEEP_FACING_COSINE : FACING_COSINE);
}

/**
 * The landmark whose card should show: the nearest one in range, measured on the floor, and within reach in height.
 * A pillar must be roughly faced unless the walker is right at it or over it, and any noticed pillar wins over the enclosure it stands in. The card showing now (`shownId`) is kept
 * a little past each limit and until another landmark is clearly nearer.
 */
export function nearestLandmark(placed: readonly PlacedLandmark[], position: Vec3, look: Vec3, shownId: string | null = null): PlacedLandmark | null {
  const isShown = (candidate: PlacedLandmark) => candidate.landmark.id === shownId;
  const noticed = placed.filter((candidate) => isNoticed(candidate, position, look, isShown(candidate)));
  const pillars = noticed.filter((candidate) => !candidate.surrounds);
  const candidates = pillars.length > 0 ? pillars : noticed;
  const rankM = (candidate: PlacedLandmark) => floorDistanceM(position, candidate.positionM) - (isShown(candidate) ? KEEP_EXTRA_M : 0);
  return candidates.reduce<PlacedLandmark | null>((best, candidate) => (best && rankM(best) <= rankM(candidate) ? best : candidate), null);
}
