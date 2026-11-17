// WGS84 globe math for the globe view.
//
// Frame: the globe scene IS Earth-centred Earth-fixed (ECEF), in metres, and the
// 3d-tiles-renderer tiles group is left unrotated (identity transform), so these
// numbers are scene coordinates directly:
//   +X leaves the Earth at 0°E 0°N, +Y at 90°E 0°N, +Z at the north pole.
// "Up" on screen is therefore +Z, not three's usual +Y. Equatorial radius is
// 6 378 137 m. This matches `Ellipsoid.getCartographicToPosition` in
// 3d-tiles-renderer (which takes radians; everything here takes degrees).

export type ScenePoint = [x: number, y: number, z: number];

export interface LonLat {
  longitude: number;
  latitude: number;
}

export interface GlobeLook extends LonLat {
  /** Camera height above the ellipsoid, metres. */
  altitude: number;
}

export const WGS84_EQUATORIAL_RADIUS = 6378137;
export const WGS84_POLAR_RADIUS = 6356752.314245;
const ECCENTRICITY_SQUARED = 1 - (WGS84_POLAR_RADIUS / WGS84_EQUATORIAL_RADIUS) ** 2;
const RADIANS = Math.PI / 180;

export function lonLatHeightToScene(longitude: number, latitude: number, height = 0): ScenePoint {
  const lon = longitude * RADIANS;
  const lat = latitude * RADIANS;
  const primeVertical = WGS84_EQUATORIAL_RADIUS / Math.sqrt(1 - ECCENTRICITY_SQUARED * Math.sin(lat) ** 2);
  const ring = (primeVertical + height) * Math.cos(lat);
  return [
    ring * Math.cos(lon),
    ring * Math.sin(lon),
    (primeVertical * (1 - ECCENTRICITY_SQUARED) + height) * Math.sin(lat),
  ];
}

export function sceneToLonLatHeight(point: ScenePoint): LonLat & { height: number } {
  const [x, y, z] = point;
  const ring = Math.hypot(x, y);
  let lat = Math.atan2(z, ring * (1 - ECCENTRICITY_SQUARED));
  let primeVertical = WGS84_EQUATORIAL_RADIUS;
  // Fixed-point iteration; five rounds are below a millimetre anywhere above the core.
  for (let round = 0; round < 5; round += 1) {
    primeVertical = WGS84_EQUATORIAL_RADIUS / Math.sqrt(1 - ECCENTRICITY_SQUARED * Math.sin(lat) ** 2);
    lat = Math.atan2(z + ECCENTRICITY_SQUARED * primeVertical * Math.sin(lat), ring);
  }
  const height = Math.abs(lat) < Math.PI / 4
    ? ring / Math.cos(lat) - primeVertical
    : z / Math.sin(lat) - primeVertical * (1 - ECCENTRICITY_SQUARED);
  return { longitude: Math.atan2(y, x) / RADIANS, latitude: lat / RADIANS, height };
}

/** Outward unit normal of the ellipsoid at a lon/lat (the local "up"). */
export function surfaceNormal(longitude: number, latitude: number): ScenePoint {
  const lon = longitude * RADIANS;
  const lat = latitude * RADIANS;
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

export function cameraAltitude(cameraPosition: ScenePoint): number {
  return sceneToLonLatHeight(cameraPosition).height;
}

/** Nearest point where a ray meets the ellipsoid surface, or null when it misses. */
export function intersectRayWithEllipsoid(origin: ScenePoint, direction: ScenePoint): ScenePoint | null {
  // Scale space so the ellipsoid becomes a unit sphere, then solve the quadratic.
  const scale = [WGS84_EQUATORIAL_RADIUS, WGS84_EQUATORIAL_RADIUS, WGS84_POLAR_RADIUS];
  const o = origin.map((value, axis) => value / scale[axis]);
  const d = direction.map((value, axis) => value / scale[axis]);
  const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const b = 2 * (o[0] * d[0] + o[1] * d[1] + o[2] * d[2]);
  const c = o[0] * o[0] + o[1] * o[1] + o[2] * o[2] - 1;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const near = (-b - root) / (2 * a);
  const distance = near >= 0 ? near : (-b + root) / (2 * a);
  if (distance < 0) return null;
  return [
    origin[0] + direction[0] * distance,
    origin[1] + direction[1] * distance,
    origin[2] + direction[2] * distance,
  ];
}

/** Central angle between two places, radians (haversine on the sphere). */
export function greatCircleAngle(from: LonLat, to: LonLat): number {
  const lat1 = from.latitude * RADIANS;
  const lat2 = to.latitude * RADIANS;
  const halfLat = Math.sin((lat2 - lat1) / 2);
  const halfLon = Math.sin((to.longitude - from.longitude) * RADIANS / 2);
  const chord = halfLat * halfLat + Math.cos(lat1) * Math.cos(lat2) * halfLon * halfLon;
  return 2 * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function greatCircleMetres(from: LonLat, to: LonLat): number {
  return greatCircleAngle(from, to) * WGS84_EQUATORIAL_RADIUS;
}

/** Point a fraction of the way along the great circle between two places. */
export function interpolateGreatCircle(from: LonLat, to: LonLat, fraction: number): LonLat {
  const angle = greatCircleAngle(from, to);
  // Antipodes have no unique great circle; nearly identical points need no arc.
  if (angle < 1e-9 || Math.PI - angle < 1e-9) return fraction < 1 ? from : to;
  const start = surfaceNormal(from.longitude, from.latitude);
  const end = surfaceNormal(to.longitude, to.latitude);
  const weightStart = Math.sin((1 - fraction) * angle) / Math.sin(angle);
  const weightEnd = Math.sin(fraction * angle) / Math.sin(angle);
  const x = start[0] * weightStart + end[0] * weightEnd;
  const y = start[1] * weightStart + end[1] * weightEnd;
  const z = start[2] * weightStart + end[2] * weightEnd;
  return { longitude: Math.atan2(y, x) / RADIANS, latitude: Math.atan2(z, Math.hypot(x, y)) / RADIANS };
}
