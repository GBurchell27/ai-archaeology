import * as THREE from "three";
import { WGS84_EQUATORIAL_RADIUS, WGS84_POLAR_RADIUS } from "@/lib/globe/ellipsoid";
import { MODEL_RAMP, NO_BASIS_HATCH, RASTER_NO_BASIS, hexToRgb } from "./modelRamp";

// The mesh is a unit sphere scaled to the ellipsoid, so `position` is already the direction that
// gives longitude and (after the polar ratio) geodetic latitude: no per-vertex UVs, no seam.
const VERTEX = /* glsl */ `
  varying vec3 vUnit;
  void main() {
    vUnit = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Mirrors rasterUv in modelRaster.ts. The texture is NEAREST and each value is a class, so a cell
// is one flat colour with hard edges: nothing here may blend between neighbours.
const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D raster;
  uniform vec3 ramp[10];
  uniform vec3 hatchLine;
  uniform float opacity;
  uniform float fade;
  uniform float pixelRatio;
  varying vec3 vUnit;
  const float POLAR_RATIO = ${(WGS84_POLAR_RADIUS / WGS84_EQUATORIAL_RADIUS).toFixed(10)};
  const float PI = 3.141592653589793;
  void main() {
    vec3 unit = normalize(vUnit);
    float longitude = atan(unit.y, unit.x);
    float latitude = atan(unit.z, POLAR_RATIO * length(unit.xy));
    vec2 uv = vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);
    float value = floor(texture2D(raster, uv).r * 255.0 + 0.5);
    if (value < 0.5) discard; // ocean
    if (value > 10.5) {
      // No basis: a dim veil and a screen-space hatch. Texture, not a colour, so it cannot be read as a rank.
      if (value < ${(RASTER_NO_BASIS - 0.5).toFixed(1)}) discard;
      vec2 pixel = gl_FragCoord.xy / pixelRatio;
      float line = step(mod(pixel.x + pixel.y, ${NO_BASIS_HATCH.spacingPx.toFixed(1)}), 1.0);
      float veil = ${NO_BASIS_HATCH.veilAlpha.toFixed(2)};
      float alpha = veil + line * ${NO_BASIS_HATCH.lineAlpha.toFixed(2)};
      gl_FragColor = vec4(hatchLine * line * ${NO_BASIS_HATCH.lineAlpha.toFixed(2)} / alpha, alpha * opacity * fade);
      return;
    }
    gl_FragColor = vec4(ramp[int(value) - 1], opacity * fade);
  }
`;

export function createModelOverlayMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      raster: { value: null },
      ramp: { value: MODEL_RAMP.map((hex) => new THREE.Vector3(...hexToRgb(hex))) },
      hatchLine: { value: new THREE.Vector3(...hexToRgb(NO_BASIS_HATCH.line)) },
      opacity: { value: 1 },
      fade: { value: 1 },
      pixelRatio: { value: 1 },
    },
    transparent: true,
    // The shell lies on the surface itself. Front faces of a convex shell are exactly the near
    // side, so culling stands in for depth (as the horizon test does for the site points) and the
    // logarithmic depth buffer is neither read nor written.
    side: THREE.FrontSide,
    depthTest: false,
    depthWrite: false,
  });
}

/** A layer PNG as class values: no filtering, no mipmaps, no colour conversion. */
export function configureRasterTexture(texture: THREE.Texture): THREE.Texture {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
