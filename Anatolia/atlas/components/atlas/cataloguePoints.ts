import * as THREE from "three";
import { SITES_FRAGMENT, SITE_POINTS_BLENDING } from "@/components/globe/sitePointsMaterial";
import type { CataloguePin } from "@/lib/cataloguePins";
import { hexToBytes } from "@/lib/globe/siteBlock";
import { worldSizeForPixels } from "@/lib/pinCluster";

/** Dot diameter in CSS pixels: small from the country overview so density reads, larger over one valley. */
const FAR_DOT = { distance: 1_400_000, pixels: 6.5 };
const NEAR_DOT = { distance: 60_000, pixels: 12 };
/** An undated place is drawn smaller and fainter than a dated one. */
const UNDATED = { size: 0.8, alpha: 0.88 };
const HIT_RADIUS_PX = 9;

// The globe's vertex shader culls by the horizon of an ellipsoid; this map is flat, so it only places and sizes.
const VERTEX = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 tint;
  attribute float size;
  attribute float shown;
  uniform float pixelSize;
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    vTint = tint;
    vAlpha = shown;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    gl_PointSize = size * pixelSize;
  }
`;

/** The globe's solid dot (tint inside a thin dark rim), for the flat terrain map. */
export function createCataloguePointsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: SITES_FRAGMENT,
    uniforms: { pixelSize: { value: FAR_DOT.pixels }, solidity: { value: 1 }, orbit: { value: 0 } },
    ...SITE_POINTS_BLENDING,
  });
}

/** Even steps per halving of the camera distance, as on the globe. */
export function cataloguePointPixels(cameraDistance: number): number {
  const fraction = Math.log(FAR_DOT.distance / Math.max(cameraDistance, 1)) / Math.log(FAR_DOT.distance / NEAR_DOT.distance);
  return THREE.MathUtils.lerp(FAR_DOT.pixels, NEAR_DOT.pixels, THREE.MathUtils.clamp(fraction, 0, 1));
}

/** Every pin as one draw call. Row order is pin order, so a picked row is an index into `pins`. */
export function buildCatalogueGeometry(pins: readonly CataloguePin[]): THREE.BufferGeometry {
  const positions = new Float32Array(pins.length * 3);
  const tints = new Uint8Array(pins.length * 3);
  const sizes = new Float32Array(pins.length);
  const shown = new Float32Array(pins.length);
  pins.forEach((pin, row) => {
    positions.set([pin.x, pin.y, pin.z], row * 3);
    tints.set(hexToBytes(pin.color), row * 3);
    sizes[row] = pin.muted ? UNDATED.size : 1;
    shown[row] = pin.muted ? UNDATED.alpha : 1;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("tint", new THREE.BufferAttribute(tints, 3, true));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("shown", new THREE.BufferAttribute(shown, 1));
  return geometry;
}

/**
 * Row of the pin nearest the ray, within a fixed reach in screen pixels, or -1.
 * Points have no world size, so three's own point picking (a world-space threshold) would
 * be far too generous from the overview and far too tight close up.
 */
export function pickCataloguePin(
  pins: readonly CataloguePin[],
  ray: THREE.Ray,
  fovDegrees: number,
  viewportHeight: number,
): number {
  // Reach grows with distance from the eye; compare squared lengths so the loop has no square root.
  const reachPerMetre = worldSizeForPixels(1, fovDegrees, viewportHeight, HIT_RADIUS_PX);
  let best = -1;
  let bestMiss = reachPerMetre * reachPerMetre;
  for (let row = 0; row < pins.length; row += 1) {
    const pin = pins[row];
    const dx = pin.x - ray.origin.x;
    const dy = pin.y - ray.origin.y;
    const dz = pin.z - ray.origin.z;
    const along = dx * ray.direction.x + dy * ray.direction.y + dz * ray.direction.z;
    if (along <= 0) continue;
    const distanceSq = dx * dx + dy * dy + dz * dz;
    const miss = (distanceSq - along * along) / distanceSq;
    if (miss < bestMiss) {
      bestMiss = miss;
      best = row;
    }
  }
  return best;
}
