import * as THREE from "three";
import { WGS84_EQUATORIAL_RADIUS } from "@/lib/globe/ellipsoid";
import { POLAR_STRETCH } from "@/lib/globe/visibleSites";

export type SitePointsKind = "sites" | "featured";

const NEAR_ALTITUDE = 150_000;
const ORBIT_ALTITUDE = 9_000_000;

// Culling happens here, per vertex, so no JavaScript ever walks the point list per frame:
// a point past the horizon, or filtered out, is thrown outside the clip volume.
const VERTEX = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 tint;
  attribute float size;
  attribute float shown;
  #ifdef FEATURED
    attribute float quiet;
    varying float vQuiet;
  #endif
  uniform float pixelSize;
  uniform float opacity;
  varying vec3 vTint;
  varying float vAlpha;
  const vec3 STRETCH = vec3(1.0, 1.0, ${POLAR_STRETCH.toFixed(8)});
  const float RADIUS = ${WGS84_EQUATORIAL_RADIUS.toFixed(1)};
  void main() {
    // In stretched space the ellipsoid is a sphere: 1 under the camera, 0 on the horizon.
    vec3 place = position * STRETCH / RADIUS;
    vec3 eye = cameraPosition * STRETCH / RADIUS;
    float nearSide = (dot(place, eye) - 1.0) / max(length(eye) - 1.0, 1e-5);
    vAlpha = shown * opacity * smoothstep(0.0, 0.07, nearSide);
    vTint = tint;
    #ifdef FEATURED
      vQuiet = quiet;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    gl_PointSize = size * pixelSize;
    if (vAlpha < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;

// Premultiplied output with a separate coverage alpha: coverage 0 adds light (the orbit glow),
// coverage 1 paints an opaque dot (distinct places close up).
const SITES_FRAGMENT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float solidity;
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    #include <logdepthbuf_fragment>
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    float glow = (1.0 - radius) * (1.0 - radius);
    float disc = smoothstep(1.0, 0.84, radius);
    // A dark rim keeps a dot legible over pale desert imagery.
    float rim = smoothstep(0.58, 0.76, radius) * solidity;
    float strength = mix(glow, disc, solidity) * vAlpha;
    gl_FragColor = vec4(mix(vTint, vec3(0.05, 0.035, 0.02), rim * 0.92) * strength, strength * solidity);
  }
`;

// Accepted monuments: a white-hot core in a soft halo. Contested ones: a quiet hollow ring.
const FEATURED_FRAGMENT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying vec3 vTint;
  varying float vAlpha;
  varying float vQuiet;
  void main() {
    #include <logdepthbuf_fragment>
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    float core = smoothstep(0.27, 0.19, radius);
    float edge = smoothstep(0.34, 0.27, radius) - core;
    float halo = pow(1.0 - radius, 1.7) * 0.9;
    vec3 lit = mix(vTint, vec3(1.0, 0.97, 0.9), 0.62) * core + vTint * halo;
    float ring = 1.0 - smoothstep(0.04, 0.1, abs(radius - 0.27));
    vec3 colour = mix(lit, vTint * ring * 0.6, vQuiet);
    float coverage = mix(core + edge * 0.85, ring * 0.35, vQuiet);
    gl_FragColor = vec4(colour * vAlpha, coverage * vAlpha);
  }
`;

export function createSitePointsMaterial(kind: SitePointsKind): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: kind === "featured" ? FEATURED_FRAGMENT : SITES_FRAGMENT,
    defines: kind === "featured" ? { FEATURED: "" } : {},
    uniforms: { pixelSize: { value: 4 }, opacity: { value: 1 }, solidity: { value: 1 } },
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    // The surface sits at the same height as the points; the horizon test stands in for depth.
    depthTest: false,
    depthWrite: false,
  });
}

/** 0 close to the ground, 1 from orbit, even steps per doubling of altitude. */
export function orbitFraction(altitude: number): number {
  const fraction = Math.log(Math.max(altitude, 1) / NEAR_ALTITUDE) / Math.log(ORBIT_ALTITUDE / NEAR_ALTITUDE);
  return THREE.MathUtils.clamp(fraction, 0, 1);
}

/** Orbit: small, translucent, additive, so density glows. Close: larger opaque dots. */
export function tuneSitePointsMaterial(
  material: THREE.ShaderMaterial,
  kind: SitePointsKind,
  altitude: number,
  devicePixelRatio: number,
): void {
  const orbit = orbitFraction(altitude);
  const pixels = kind === "featured" ? THREE.MathUtils.lerp(34, 20, orbit) : THREE.MathUtils.lerp(10.5, 3, orbit);
  material.uniforms.pixelSize.value = pixels * devicePixelRatio;
  material.uniforms.opacity.value = kind === "featured" ? 1 : THREE.MathUtils.lerp(1, 0.8, orbit);
  material.uniforms.solidity.value = 1 - 0.8 * THREE.MathUtils.smoothstep(orbit, 0.55, 1);
}
