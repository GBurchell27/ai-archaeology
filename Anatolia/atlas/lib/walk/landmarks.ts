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
  /** The card shows within this distance of `positionM`. */
  rangeM: number;
};

const LOOK_HEIGHT_M = 1.6;
const PILLAR_RANGE_M = 4.5;
/** Used where no ring gives the size of an enclosure, which is every landmark in the photographs. */
const OPEN_RANGE_M = 6;
const MARKER_ABOVE_PILLAR_M = 0.5;
const MARKER_ABOVE_ENCLOSURE_M = 1.6;
const MARKER_ABOVE_PHOTOGRAPH_POINT_M = 2;
/** Closer than this the walker need not face a pillar: they are standing at it. */
const TOUCHING_M = 1.5;
/** Cosine of the widest angle, on the floor, between the look direction and a pillar that still counts as faced. */
const FACING_COSINE = 0.25;

const isEnclosureLandmark = (placed: PlacedLandmark) => placed.landmark.pillarNumber === undefined;

function placeEnclosure(landmark: Landmark, enclosure: Enclosure): PlacedLandmark {
  const [east, south] = enclosure.centre;
  const { pillar, pedestalHeightM } = enclosure.centralPair;
  return {
    landmark,
    positionM: [east, LOOK_HEIGHT_M, south],
    markerM: [east, pedestalHeightM + pillar.heightM + MARKER_ABOVE_ENCLOSURE_M, south],
    rangeM: Math.min(...enclosure.rings.map((ring) => ring.innerRadiusM)),
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
  };
}

/** Each landmark at the pillar or enclosure it names. One the layout does not hold is left out. */
export function placeOnModel(landmarks: readonly Landmark[], model: WalkModel): PlacedLandmark[] {
  return landmarks.flatMap((landmark) => {
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
    return [{ landmark, positionM, markerM, rangeM: landmark.pillarNumber === undefined ? OPEN_RANGE_M : PILLAR_RANGE_M }];
  });
}

function distanceM(from: Vec3, to: Vec3): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

/** True when the look direction, flattened onto the floor, points roughly at the landmark. */
function facesLandmark(position: Vec3, look: Vec3, target: Vec3): boolean {
  const [east, south] = [target[0] - position[0], target[2] - position[2]];
  const lengths = Math.hypot(east, south) * Math.hypot(look[0], look[2]);
  return lengths > 0 && (east * look[0] + south * look[2]) / lengths >= FACING_COSINE;
}

function isNoticed(placed: PlacedLandmark, position: Vec3, look: Vec3): boolean {
  const awayM = distanceM(position, placed.positionM);
  if (awayM > placed.rangeM) return false;
  // The walker stands inside an enclosure, so there is nothing to face.
  return isEnclosureLandmark(placed) || awayM <= TOUCHING_M || facesLandmark(position, look, placed.positionM);
}

/**
 * The landmark whose card should show: the nearest one in range. A pillar must be roughly faced unless the walker is
 * right at it, and any noticed pillar wins over the enclosure it stands in.
 */
export function nearestLandmark(placed: readonly PlacedLandmark[], position: Vec3, look: Vec3): PlacedLandmark | null {
  const noticed = placed.filter((candidate) => isNoticed(candidate, position, look));
  const pillars = noticed.filter((candidate) => !isEnclosureLandmark(candidate));
  const candidates = pillars.length > 0 ? pillars : noticed;
  return candidates.reduce<PlacedLandmark | null>(
    (best, candidate) => (best && distanceM(position, best.positionM) <= distanceM(position, candidate.positionM) ? best : candidate),
    null,
  );
}
