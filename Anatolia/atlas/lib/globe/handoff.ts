// When the globe gives way to the Turkey terrain atlas, and how each view's
// camera maps onto the other's.

import type { GlobeLook, LonLat } from "./ellipsoid";

export interface AtlasLook extends LonLat {
  /** Distance from the atlas camera to its target, metres. */
  cameraDistance: number;
}

export const TURKEY_ATLAS_BOUNDS = { west: 25.5, east: 45, south: 35.8, north: 42.2 };
export const OFFER_ATLAS_ALTITUDE = 900_000;
export const ENTER_ATLAS_ALTITUDE = 450_000;
export const GLOBE_RETURN_ALTITUDE = 1_500_000;

export type HandoffStage = "none" | "offer" | "enter";

export function isInsideAtlasBounds(place: LonLat): boolean {
  const { west, east, south, north } = TURKEY_ATLAS_BOUNDS;
  return place.longitude >= west && place.longitude <= east && place.latitude >= south && place.latitude <= north;
}

/** "offer" shows the affordance; "enter" means the user kept zooming and the atlas takes over. */
export function handoffStage(look: GlobeLook): HandoffStage {
  if (!isInsideAtlasBounds(look) || look.altitude >= OFFER_ATLAS_ALTITUDE) return "none";
  return look.altitude < ENTER_ATLAS_ALTITUDE ? "enter" : "offer";
}

export function atlasLookFromGlobe(look: GlobeLook): AtlasLook {
  // Never arrive further out than the altitude that triggers the handoff, or the atlas would open on a speck.
  return {
    longitude: look.longitude,
    latitude: look.latitude,
    cameraDistance: Math.min(look.altitude, ENTER_ATLAS_ALTITUDE),
  };
}

export function globeLookFromAtlas(look: LonLat): GlobeLook {
  // Above the offer threshold, so coming back does not immediately offer the atlas again.
  return { longitude: look.longitude, latitude: look.latitude, altitude: GLOBE_RETURN_ALTITUDE };
}
