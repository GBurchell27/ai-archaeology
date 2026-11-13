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
uniform sampler2D backdrop;
uniform float mapEdge;
uniform float mapWater;
uniform float useB;
uniform float compare;
uniform float split;
uniform float opacity;
uniform float surfaceAlpha;
uniform float edgeFeather;
uniform float surfacePart;
uniform vec2 resolution;
uniform vec3 lightDirection;
uniform float ambient;
uniform float hazeNear;
uniform float hazeFar;
uniform float hazeStrength;
uniform vec3 hazeColor;
uniform vec4 clipRect;
uniform float clipOn;
uniform vec4 regionClipRect;
uniform float regionClipOn;
uniform float night;
uniform float fastShade;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorld;

vec3 toLinear(vec3 value) {
  return pow(max(value, vec3(0.0)), vec3(2.2));
}

bool inRect(vec4 rect) {
  return vWorld.x > rect.x && vWorld.x < rect.z && vWorld.z > rect.y && vWorld.z < rect.w;
}

void main() {
  if ((clipOn > 0.5 && inRect(clipRect)) || (regionClipOn > 0.5 && inRect(regionClipRect))) {
    discard;
  }
  vec2 edge = min(vUv, vec2(1.0) - vUv);
  float edgeDistance = min(edge.x, edge.y);
  if (surfacePart == 1.0 && edgeDistance < edgeFeather) discard;
  if (surfacePart == 2.0 && edgeDistance >= edgeFeather) discard;
  vec3 baseColor = vec3(0.72, 0.64, 0.52);
  vec3 rawA = texture2D(mapA, vUv).rgb;
  vec3 albedo = mix(baseColor, fastShade > 0.5 ? rawA : toLinear(rawA), opacity);
  float screenX = gl_FragCoord.x / resolution.x;
  if (compare > 0.5 && useB > 0.5) {
    if (screenX >= split) {
      vec3 rawB = texture2D(mapB, vUv).rgb;
      albedo = mix(baseColor, fastShade > 0.5 ? rawB : toLinear(rawB), opacity);
    }
    if (abs(screenX - split) < 1.25 / resolution.x) {
      albedo = vec3(0.96, 0.94, 0.9);
    }
  }
  float lambert = max(dot(normalize(vNormal), normalize(mat3(viewMatrix) * lightDirection)), 0.0);
  vec3 lit = albedo * (ambient + (1.0 - ambient) * lambert);
  lit = mix(lit, lit * vec3(0.58, 0.66, 0.78), night);
  float depth = distance(cameraPosition, vWorld);
  float haze = smoothstep(hazeNear, hazeFar, depth) * hazeStrength;
  vec3 fog = fastShade > 0.5 ? hazeColor : pow(hazeColor, vec3(2.2));
  lit = mix(lit, fog, clamp(haze, 0.0, 0.8));
  float alpha = surfaceAlpha;
  if (surfacePart == 2.0) alpha *= smoothstep(0.0, edgeFeather, edgeDistance);
  vec3 color = fastShade > 0.5 ? lit : pow(lit, vec3(1.0 / 2.2));
  if (mapEdge > 0.0) {
    vec3 background = texture2D(backdrop, vec2(0.5, gl_FragCoord.y / resolution.y)).rgb;
    float water = smoothstep(0.018, 0.12, rawA.b - rawA.r) * mapWater;
    color = mix(color, mix(background, vec3(0.11, 0.17, 0.21), 0.55), water);
    color = mix(background, color, smoothstep(0.0, mapEdge, edgeDistance));
  }
  gl_FragColor = vec4(color, alpha);
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
      backdrop: { value: blank },
      mapEdge: { value: 0 },
      mapWater: { value: 0 },
      useB: { value: 0 },
      compare: { value: 0 },
      split: { value: 0.5 },
      opacity: { value: 1 },
      surfaceAlpha: { value: 1 },
      edgeFeather: { value: 0 },
      surfacePart: { value: 0 },
      resolution: { value: new THREE.Vector2(1, 1) },
      lightDirection: { value: new THREE.Vector3(0.3, 0.8, -0.4) },
      ambient: { value: 0.62 },
      hazeNear: { value: 520000 },
      hazeFar: { value: 1450000 },
      hazeStrength: { value: 0.5 },
      hazeColor: { value: new THREE.Vector3(203 / 255, 184 / 255, 154 / 255) },
      clipRect: { value: new THREE.Vector4(0, 0, 0, 0) },
      clipOn: { value: 0 },
      regionClipRect: { value: new THREE.Vector4(0, 0, 0, 0) },
      regionClipOn: { value: 0 },
      night: { value: 0 },
      fastShade: { value: 0 },
    },
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
  });
}

export function prepareTexture(texture: THREE.Texture, anisotropy = 1): THREE.Texture {
  if (texture.minFilter !== THREE.LinearMipmapLinearFilter || texture.anisotropy !== anisotropy) {
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = anisotropy;
    texture.needsUpdate = true;
  }
  return texture;
}
