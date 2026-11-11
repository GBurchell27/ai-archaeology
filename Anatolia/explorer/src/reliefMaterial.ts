import * as THREE from "three";

const VERTEX_SHADER = `
attribute vec3 tint;
varying vec3 vNormal;
varying vec3 vColor;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vColor = tint;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D mapA;
uniform sampler2D mapB;
uniform float useA;
uniform float useB;
uniform float opacity;
uniform float compare;
uniform float split;
uniform vec2 resolution;
uniform vec3 lightDirection;
uniform float ambient;
varying vec3 vNormal;
varying vec3 vColor;
varying vec2 vUv;

vec3 toLinear(vec3 value) {
  return pow(max(value, vec3(0.0)), vec3(2.2));
}

void main() {
  vec3 baseColor = toLinear(vColor);
  vec3 colorA = mix(baseColor, toLinear(texture2D(mapA, vUv).rgb), useA);
  vec3 colorB = mix(baseColor, toLinear(texture2D(mapB, vUv).rgb), useB);
  colorA = mix(baseColor, colorA, opacity);
  colorB = mix(baseColor, colorB, opacity);
  float screenX = gl_FragCoord.x / resolution.x;
  vec3 albedo = colorA;
  if (compare > 0.5) {
    albedo = screenX < split ? colorA : colorB;
    if (abs(screenX - split) < 1.25 / resolution.x) {
      albedo = vec3(0.97, 0.94, 0.88);
    }
  }
  float lambert = max(dot(normalize(vNormal), normalize(lightDirection)), 0.0);
  vec3 lit = albedo * (ambient + (1.0 - ambient) * lambert);
  gl_FragColor = vec4(pow(lit, vec3(1.0 / 2.2)), 1.0);
}
`;

export function createBlankTexture(): THREE.Texture {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

export function createReliefMaterial(blank: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      mapA: { value: blank },
      mapB: { value: blank },
      useA: { value: 0 },
      useB: { value: 0 },
      opacity: { value: 1 },
      compare: { value: 0 },
      split: { value: 0.5 },
      resolution: { value: new THREE.Vector2(1, 1) },
      lightDirection: { value: new THREE.Vector3(0.4, 0.8, -0.4) },
      ambient: { value: 0.42 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
}

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

export function applyReliefView(
  material: THREE.ShaderMaterial,
  azimuth: number,
  altitude: number,
  opacity: number,
  compare: boolean,
  split: number,
  resolution: THREE.Vector2,
): void {
  material.uniforms.lightDirection.value.copy(sunDirection(azimuth, altitude));
  material.uniforms.opacity.value = opacity;
  material.uniforms.compare.value = compare ? 1 : 0;
  material.uniforms.split.value = split;
  material.uniforms.resolution.value.copy(resolution);
}

export function showLayerTexture(
  material: THREE.ShaderMaterial,
  slot: "a" | "b",
  texture: THREE.Texture | null,
  blank: THREE.Texture,
): void {
  const mapName = slot === "a" ? "mapA" : "mapB";
  const useName = slot === "a" ? "useA" : "useB";
  material.uniforms[mapName].value = texture ?? blank;
  material.uniforms[useName].value = texture ? 1 : 0;
}
