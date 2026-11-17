// Horizon and frustum culling of a short list of places (featured monuments, bucket counts)
// down to the ones on screen. The full point cloud is culled in its shader instead.

import { Vector3, type Camera } from "three";
import type { ScreenPin } from "../pinCluster";

const EQUATORIAL_RADIUS = 6378137;
const POLAR_RADIUS = 6356752.314245;
/** Stretches z so the ellipsoid becomes a sphere of the equatorial radius. */
export const POLAR_STRETCH = EQUATORIAL_RADIUS / POLAR_RADIUS;

/** True when a point on the ellipsoid surface is on the camera's side of the horizon. */
export function isOnNearSide(x: number, y: number, z: number, cameraX: number, cameraY: number, cameraZ: number): boolean {
  const stretch = POLAR_STRETCH * POLAR_STRETCH;
  return x * cameraX + y * cameraY + z * cameraZ * stretch > EQUATORIAL_RADIUS * EQUATORIAL_RADIUS;
}

const projected = new Vector3();

/**
 * Writes screen positions into the pins and returns those in front of the horizon and inside
 * the viewport (plus a margin), in input order, at most `limit` of them.
 */
export function projectVisiblePins<Pin extends ScreenPin>(
  pins: readonly Pin[],
  camera: Camera,
  size: { width: number; height: number },
  limit: number,
  marginPx = 0,
): Pin[] {
  const eye = camera.position;
  const visible: Pin[] = [];
  for (const pin of pins) {
    pin.visible = false;
    if (visible.length >= limit) continue;
    if (!isOnNearSide(pin.x, pin.y, pin.z, eye.x, eye.y, eye.z)) continue;
    projected.set(pin.x, pin.y, pin.z).project(camera);
    pin.screenX = (projected.x * 0.5 + 0.5) * size.width;
    pin.screenY = (-projected.y * 0.5 + 0.5) * size.height;
    pin.visible = Math.abs(projected.z) <= 1
      && pin.screenX >= -marginPx && pin.screenX <= size.width + marginPx
      && pin.screenY >= -marginPx && pin.screenY <= size.height + marginPx;
    if (pin.visible) visible.push(pin);
  }
  return visible;
}
