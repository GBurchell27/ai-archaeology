/** Screen-space catalogue clustering. Pure: no three.js and no DOM. */

export const CLUSTER_CELL_PX = 108;
export const SINGLE_PIN_PX = 15;
export const MIN_CAMERA_DISTANCE_M = 7000;
export const ATLAS_FOV_DEGREES = 38;

/** Camera distance divided by how far {@link lookPose} actually sits the camera. */
export function lookPoseArgument(cameraDistance: number): number {
  return cameraDistance / Math.hypot(0.16, 0.34, 0.63);
}

export interface ScreenPin {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  longitude: number;
  latitude: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  muted?: boolean;
}

export interface PinCluster {
  key: string;
  ids: string[];
  count: number;
  name: string | null;
  x: number;
  y: number;
  z: number;
  longitude: number;
  latitude: number;
  screenX: number;
  screenY: number;
  spanM: number;
  muted: boolean;
}

export function clusterByScreen(pins: readonly ScreenPin[], cellPx: number): PinCluster[] {
  if (!(cellPx > 0)) {
    throw new Error("cluster cell must be positive");
  }
  const bins = new Map<string, ScreenPin[]>();
  for (const pin of pins) {
    if (!pin.visible) continue;
    const key = cellKey(pin.screenX, pin.screenY, cellPx);
    const members = bins.get(key);
    if (members) members.push(pin);
    else bins.set(key, [pin]);
  }
  return [...bins.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, members]) => summarizeCluster(key, members));
}

export function clusterSignature(clusters: readonly PinCluster[]): string {
  return clusters.map((cluster) => `${cluster.key}:${cluster.count}:${cluster.ids[0]}`).join("|");
}

/** Diagonal of the members' ground footprint, in the same metres as x/z. */
export function footprintMetres(members: readonly { x: number; z: number }[]): number {
  if (members.length === 0) return 0;
  let minX = members[0].x;
  let maxX = members[0].x;
  let minZ = members[0].z;
  let maxZ = members[0].z;
  for (const member of members) {
    minX = Math.min(minX, member.x);
    maxX = Math.max(maxX, member.x);
    minZ = Math.min(minZ, member.z);
    maxZ = Math.max(maxZ, member.z);
  }
  return Math.hypot(maxX - minX, maxZ - minZ);
}

/**
 * Camera distance that opens a cluster.
 * A click always moves closer, and it stops at {@link MIN_CAMERA_DISTANCE_M}
 * so the next click can land on a single place.
 */
export function approachDistance(currentDistance: number, spanMetres: number, fovDegrees: number): number {
  const half = (fovDegrees * Math.PI) / 360;
  const fit = spanMetres / (2 * Math.tan(half) * 0.42);
  const stepped = currentDistance * 0.5;
  const closer = Math.min(stepped, Number.isFinite(fit) && fit > 0 ? fit : stepped);
  return Math.max(MIN_CAMERA_DISTANCE_M, Math.min(currentDistance, closer));
}

/** World size of a screen-space pin so it stays the same number of pixels. */
export function worldSizeForPixels(
  distance: number,
  fovDegrees: number,
  viewportHeight: number,
  pixels: number,
): number {
  if (!(distance > 0) || !(viewportHeight > 0)) return 0;
  const half = (fovDegrees * Math.PI) / 360;
  return distance * 2 * Math.tan(half) * (pixels / viewportHeight);
}

function cellKey(screenX: number, screenY: number, cellPx: number): string {
  return `${Math.floor(screenX / cellPx)}:${Math.floor(screenY / cellPx)}`;
}

function summarizeCluster(key: string, members: readonly ScreenPin[]): PinCluster {
  const count = members.length;
  let x = 0;
  let y = 0;
  let z = 0;
  let longitude = 0;
  let latitude = 0;
  let screenX = 0;
  let screenY = 0;
  const ids: string[] = [];
  for (const member of members) {
    x += member.x;
    y += member.y;
    z += member.z;
    longitude += member.longitude;
    latitude += member.latitude;
    screenX += member.screenX;
    screenY += member.screenY;
    ids.push(member.id);
  }
  return {
    key,
    ids,
    count,
    name: count === 1 ? members[0].name : null,
    x: x / count,
    y: y / count,
    z: z / count,
    longitude: longitude / count,
    latitude: latitude / count,
    screenX: screenX / count,
    screenY: screenY / count,
    spanM: footprintMetres(members),
    muted: members.every((member) => member.muted === true),
  };
}
