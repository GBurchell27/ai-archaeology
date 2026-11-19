"use client";

import { useMemo } from "react";
import { BackSide, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { EVENING_LIGHT, EVENING_SKY } from "./eveningLight";

const HILL_RADIUS_M = 300;
const SKY_RADIUS_M = 450;

const SKY_VERTEX = /* glsl */ `
  varying vec3 skyDirection;
  void main() {
    skyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Every term falls away smoothly with the angle from the sun and the sum stays below white outside the disc,
// so the glow has no edge. Colours are display values: a shader material is neither tone mapped nor colour converted.
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 sunDirection;
  uniform vec3 zenith;
  uniform vec3 horizonAway;
  uniform vec3 horizonSunward;
  uniform vec3 glow;
  uniform vec3 sunDisc;
  uniform vec2 sunDiscRad;
  varying vec3 skyDirection;
  void main() {
    vec3 direction = normalize(skyDirection);
    float height = clamp(direction.y, 0.0, 1.0);
    float facingSun = 0.5 + 0.5 * dot(normalize(direction.xz + 1e-5), normalize(sunDirection.xz));
    float alongSun = clamp(dot(direction, sunDirection), 0.0, 1.0);
    vec3 horizon = mix(horizonAway, horizonSunward, facingSun * facingSun * facingSun * facingSun);
    vec3 sky = mix(horizon, zenith, pow(height, 0.55));
    sky += glow * (0.25 * pow(alongSun, 6.0) + 0.45 * pow(alongSun, 48.0));
    sky = mix(sky, sunDisc, smoothstep(sunDiscRad.y, sunDiscRad.x, acos(alongSun)));
    gl_FragColor = vec4(sky, 1.0);
  }
`;

/** A colour as the display shows it, for a shader that writes display values. */
const displayColour = (hex: string) => new Color(hex).convertLinearToSRGB();

function skyUniforms() {
  const { zenith, horizonAway, horizonSunward, glow, sunDisc, sunDiscRad } = EVENING_SKY;
  return {
    sunDirection: { value: EVENING_LIGHT.sun.direction },
    zenith: { value: displayColour(zenith) },
    horizonAway: { value: displayColour(horizonAway) },
    horizonSunward: { value: displayColour(horizonSunward) },
    glow: { value: displayColour(glow) },
    sunDisc: { value: displayColour(sunDisc) },
    sunDiscRad: { value: [sunDiscRad.full, sunDiscRad.gone] },
  };
}

function SkyDome() {
  const uniforms = useMemo(skyUniforms, []);
  return (
    <mesh>
      <sphereGeometry args={[SKY_RADIUS_M, 48, 24]} />
      <shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} uniforms={uniforms} side={BackSide} depthWrite={false} />
    </mesh>
  );
}

/** The colour of a hill at its crest or its foot: paler into the haze lower down, and warmer where it stands under the sun. */
function hillShade(around: number, isCrest: boolean): Color {
  const { sun, haze, hillColour, hillHaze } = EVENING_LIGHT;
  const facingSun = 0.5 + 0.5 * Math.cos(around - Math.atan2(sun.direction.z, sun.direction.x));
  const sunset = facingSun ** 4 * (isCrest ? hillHaze.sunsetOnCrest : hillHaze.sunsetAtFoot);
  return new Color(hillColour).lerp(new Color(haze.colour), isCrest ? 0 : hillHaze.atFoot).lerp(new Color(EVENING_SKY.horizonSunward), sunset);
}

/** A far ring of rolling silhouettes: an open cylinder whose top edge follows a few summed waves. */
function hillRingGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(HILL_RADIUS_M, HILL_RADIUS_M, 1, 180, 1, true);
  const positions = geometry.attributes.position;
  const shades: number[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    const around = Math.atan2(positions.getZ(index), positions.getX(index));
    const isCrest = positions.getY(index) > 0;
    const crestM = 13 + 6 * Math.sin(around * 3 + 1) + 4 * Math.sin(around * 7 + 2.3) + 2 * Math.sin(around * 17);
    positions.setY(index, isCrest ? crestM : -1);
    shades.push(...hillShade(around, isCrest).toArray());
  }
  geometry.setAttribute("color", new Float32BufferAttribute(shades, 3));
  return geometry;
}

/** The far hills, standing on the ground at `groundLevelM`. */
function Hills({ groundLevelM }: { groundLevelM: number }) {
  const geometry = useMemo(hillRingGeometry, []);
  return (
    <mesh geometry={geometry} position={[0, groundLevelM, 0]}>
      <meshBasicMaterial vertexColors side={DoubleSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

/** What is too far to walk to: the evening sky with its sun, and the hills along the horizon. `scale` sets both further off, the same size to the eye. */
export function ModelSky({ groundLevelM, scale = 1 }: { groundLevelM: number; scale?: number }) {
  return (
    <group scale={scale}>
      <SkyDome />
      <Hills groundLevelM={groundLevelM / scale} />
    </group>
  );
}
