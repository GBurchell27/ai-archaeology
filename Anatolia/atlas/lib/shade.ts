import * as THREE from "three";

export const SURFACE_VERTEX = `
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SURFACE_FRAGMENT = `
precision highp float;
uniform sampler2D mapA;
uniform sampler2D mapB;
uniform float useB;
uniform float compare;
uniform float split;
uniform float opacity;
uniform vec2 resolution;
uniform vec3 lightDirection;
uniform float ambient;
uniform float hazeNear;
uniform float hazeFar;
uniform float hazeStrength;
uniform vec3 hazeColor;
uniform vec4 clipRect;
uniform float clipOn;
uniform float night;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorld;

vec3 toLinear(vec3 value) {
  return pow(max(value, vec3(0.0)), vec3(2.2));
}

void main() {
  if (clipOn > 0.5 && vWorld.x > clipRect.x && vWorld.x < clipRect.z && vWorld.z > clipRect.y && vWorld.z < clipRect.w) {
    discard;
  }
  vec3 baseColor = vec3(0.72, 0.64, 0.52);
  vec3 colorA = mix(baseColor, toLinear(texture2D(mapA, vUv).rgb), opacity);
  vec3 colorB = mix(baseColor, toLinear(texture2D(mapB, vUv).rgb), opacity);
  float screenX = gl_FragCoord.x / resolution.x;
  vec3 albedo = colorA;
  if (compare > 0.5 && useB > 0.5) {
    albedo = screenX < split ? colorA : colorB;
    if (abs(screenX - split) < 1.25 / resolution.x) {
      albedo = vec3(0.96, 0.94, 0.9);
    }
  }
  float lambert = max(dot(normalize(vNormal), normalize(lightDirection)), 0.0);
  vec3 lit = albedo * (ambient + (1.0 - ambient) * lambert);
  lit = mix(lit, lit * vec3(0.58, 0.66, 0.78), night);
  float depth = distance(cameraPosition, vWorld);
  float haze = smoothstep(hazeNear, hazeFar, depth) * hazeStrength;
  lit = mix(lit, pow(hazeColor, vec3(2.2)), clamp(haze, 0.0, 0.8));
  gl_FragColor = vec4(pow(lit, vec3(1.0 / 2.2)), 1.0);
}
`;

export function sunDirection(azimuthDegrees: number, altitudeDegrees: number): THREE.Vector3 {
  const azimuth = THREE.MathUtils.degToRad(azimuthDegrees);
  const altitude = THREE.MathUtils.degToRad(altitudeDegrees);
  const horizontal = Math.cos(altitude);
  return new THREE.Vector3(
    Math.sin(azimuth) * horizontal,
    Math.sin(altitude),
    -Math.cos(azimuth) * horizontal,
  ).normalize();
}

export function createSurfaceMaterial(): THREE.ShaderMaterial {
  const blank = new THREE.DataTexture(new Uint8Array([210, 190, 160, 255]), 1, 1);
  blank.needsUpdate = true;
  blank.colorSpace = THREE.NoColorSpace;
  return new THREE.ShaderMaterial({
    uniforms: {
      mapA: { value: blank },
      mapB: { value: blank },
      useB: { value: 0 },
      compare: { value: 0 },
      split: { value: 0.5 },
      opacity: { value: 1 },
      resolution: { value: new THREE.Vector2(1, 1) },
      lightDirection: { value: new THREE.Vector3(0.3, 0.8, -0.4) },
      ambient: { value: 0.62 },
      hazeNear: { value: 520000 },
      hazeFar: { value: 1450000 },
      hazeStrength: { value: 0.5 },
      hazeColor: { value: new THREE.Vector3(203 / 255, 184 / 255, 154 / 255) },
      clipRect: { value: new THREE.Vector4(0, 0, 0, 0) },
      clipOn: { value: 0 },
      night: { value: 0 },
    },
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
  });
}

export function prepareTexture(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = true;
  return texture;
}
