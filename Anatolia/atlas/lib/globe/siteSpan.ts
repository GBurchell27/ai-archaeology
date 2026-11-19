// Where to look to see several sites at once: the middle of them, and how far the farthest lies from it.

import { greatCircleMetres, type LonLat } from "./ellipsoid";

export interface SiteSpan extends LonLat {
  /** Ground distance from the centre to the farthest site, in metres. */
  reachMetres: number;
}

const RADIANS = Math.PI / 180;
/** Camera altitude per metre of reach that keeps the farthest site inside the view. Chosen by eye. */
const ALTITUDE_PER_REACH = 3;

/** The mean direction of the sites on the sphere, so a group across the date line is centred the short way. Null for no sites. */
export function spanOfSites(sites: readonly LonLat[]): SiteSpan | null {
  if (!sites.length) return null;
  let x = 0, y = 0, z = 0;
  for (const { longitude, latitude } of sites) {
    x += Math.cos(latitude * RADIANS) * Math.cos(longitude * RADIANS);
    y += Math.cos(latitude * RADIANS) * Math.sin(longitude * RADIANS);
    z += Math.sin(latitude * RADIANS);
  }
  // Sites that cancel out (opposite sides of the Earth) have no middle: look at the first.
  const balanced = Math.hypot(x, y, z) < 1e-9;
  const centre: LonLat = balanced
    ? { longitude: sites[0].longitude, latitude: sites[0].latitude }
    : { longitude: Math.atan2(y, x) / RADIANS, latitude: Math.atan2(z, Math.hypot(x, y)) / RADIANS };
  return { ...centre, reachMetres: Math.max(...sites.map((site) => greatCircleMetres(centre, site))) };
}

/** The lowest camera altitude that still shows every site of the span. */
export function altitudeToSee(span: SiteSpan): number {
  return span.reachMetres * ALTITUDE_PER_REACH;
}
