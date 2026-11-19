import * as THREE from "three";
import { SITES_FRAGMENT, SITE_POINTS_BLENDING } from "@/components/globe/sitePointsMaterial";
import type { CataloguePin } from "@/lib/cataloguePins";
import { hexToBytes } from "@/lib/globe/siteBlock";
import { worldSizeForPixels } from "@/lib/pinCluster";

/**
 * Dot diameter in CSS pixels and how solid the dot is. From the country overview the dots are small soft
 * motes, so density reads as a glow; over one valley each is a larger rimmed dot.
 */
const FAR_DOT = { distance: 1_400_000, pixels: 5.5, solidity: 0.4 };
const NEAR_DOT = { distance: 60_000, pixels: 12, solidity: 1 };
/** The dots are fully solid by this share of the way in. */
const SOLID_BY = 0.5;
/** An undated place is drawn smaller and fainter than a dated one, and fainter still from afar, so the periods carry the colour. */
const UNDATED = { size: 0.8, farAlpha: 0.5, nearAlpha: 0.88 };
/** At the overview the country is as wide as the screen, so on a narrow screen the markers shrink with it, to no less than this. */
const NARROW_SCREEN = { fullSizeWidthPx: 1000, smallest: 0.55 };
const HIT_RADIUS_PX = 9;

// The globe's vertex shader culls by the horizon of an ellipsoid; this map is flat, so it only places and sizes.
const VERTEX = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 tint;
  attribute float size;
  attribute float undated;
  uniform float pixelSize;
  uniform float undatedAlpha;
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    vTint = tint;
    vAlpha = mix(1.0, undatedAlpha, undated);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    gl_PointSize = size * pixelSize;
  }
`;

/** The globe's dot (tint inside a thin dark rim, softening to a mote from afar), for the flat terrain map. */
export function createCataloguePointsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: SITES_FRAGMENT,
    uniforms: {
      pixelSize: { value: FAR_DOT.pixels },
      undatedAlpha: { value: UNDATED.farAlpha },
      solidity: { value: FAR_DOT.solidity },
      orbit: { value: 0 },
    },
    ...SITE_POINTS_BLENDING,
  });
}

/** 0 at the country overview, 1 over one valley, in even steps per halving of the camera distance, as on the globe. */
export function cameraCloseness(cameraDistance: number): number {
  const fraction = Math.log(FAR_DOT.distance / Math.max(cameraDistance, 1)) / Math.log(FAR_DOT.distance / NEAR_DOT.distance);
  return THREE.MathUtils.clamp(fraction, 0, 1);
}

/** Straight-line distance from the camera to the point its controls orbit. */
export function cameraDistanceToTarget(camera: THREE.Camera, controls: unknown): number {
  const target = (controls as { target?: THREE.Vector3 } | null)?.target;
  return target ? camera.position.distanceTo(target) : camera.position.length();
}

/** How much smaller than usual a marker is drawn: below 1 only on a narrow screen, and only until the camera comes close. */
export function markerScale(closeness: number, viewportWidth: number): number {
  const narrow = THREE.MathUtils.clamp(viewportWidth / NARROW_SCREEN.fullSizeWidthPx, NARROW_SCREEN.smallest, 1);
  return THREE.MathUtils.lerp(narrow, 1, closeness);
}

/** Sizes and hardens the dots for the camera distance. `pixelRatio` is the canvas's, which the quality ladder changes. */
export function tuneCataloguePointsMaterial(
  material: THREE.ShaderMaterial,
  cameraDistance: number,
  pixelRatio: number,
  viewportWidth: number,
): void {
  const closeness = cameraCloseness(cameraDistance);
  const pixels = THREE.MathUtils.lerp(FAR_DOT.pixels, NEAR_DOT.pixels, closeness) * markerScale(closeness, viewportWidth);
  material.uniforms.pixelSize.value = pixels * pixelRatio;
  material.uniforms.undatedAlpha.value = THREE.MathUtils.lerp(UNDATED.farAlpha, UNDATED.nearAlpha, closeness);
  material.uniforms.solidity.value = THREE.MathUtils.lerp(FAR_DOT.solidity, NEAR_DOT.solidity, THREE.MathUtils.smoothstep(closeness, 0, SOLID_BY));
}

/** Every pin as one draw call. Row order is pin order, so a picked row is an index into `pins`. */
export function buildCatalogueGeometry(pins: readonly CataloguePin[]): THREE.BufferGeometry {
  const positions = new Float32Array(pins.length * 3);
  const tints = new Uint8Array(pins.length * 3);
  const sizes = new Float32Array(pins.length);
  const undated = new Float32Array(pins.length);
  pins.forEach((pin, row) => {
    positions.set([pin.x, pin.y, pin.z], row * 3);
    tints.set(hexToBytes(pin.color), row * 3);
    sizes[row] = pin.muted ? UNDATED.size : 1;
    undated[row] = pin.muted ? 1 : 0;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("tint", new THREE.BufferAttribute(tints, 3, true));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("undated", new THREE.BufferAttribute(undated, 1));
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
