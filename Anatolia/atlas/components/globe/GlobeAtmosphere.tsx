"use client";

import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { WGS84_EQUATORIAL_RADIUS } from "@/lib/globe/ellipsoid";

const GLOW_SHELL = 1.075;
const HAZE_SHELL = 1.004;
const STAR_COUNT = 2600;

// The sun is fixed to the viewer (upper left, slightly behind the camera) rather than to the
// Earth, so whatever is being looked at stays lit and only the far limb falls into shade.
const SUN_IN_VIEW = "normalize(vec3(-0.55, 0.45, 0.7))";

const SHELL_VERTEX = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying vec3 vToCamera;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewNormal = normalize(normalMatrix * normal);
    vToCamera = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
    #include <logdepthbuf_vertex>
  }
`;

// Seen from outside, the far side of a slightly larger shell is visible only as a ring beyond the limb.
const GLOW_FRAGMENT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float limbCosine;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying vec3 vToCamera;
  void main() {
    #include <logdepthbuf_fragment>
    float towardLimb = clamp(-dot(normalize(vWorldNormal), normalize(vToCamera)) / limbCosine, 0.0, 1.0);
    float sunlit = smoothstep(-0.75, 0.55, dot(normalize(vViewNormal), ${SUN_IN_VIEW}));
    vec3 tint = mix(vec3(0.10, 0.27, 0.62), vec3(0.50, 0.74, 1.0), pow(towardLimb, 3.0));
    float strength = pow(towardLimb, 2.6) * mix(0.14, 0.78, sunlit);
    gl_FragColor = vec4(tint * strength, 1.0);
  }
`;

// A thin shell just above the surface: blue haze toward the limb, soft shade away from the sun.
const HAZE_FRAGMENT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying vec3 vToCamera;
  void main() {
    #include <logdepthbuf_fragment>
    float facing = clamp(dot(normalize(vWorldNormal), normalize(vToCamera)), 0.0, 1.0);
    float towardSun = dot(normalize(vViewNormal), ${SUN_IN_VIEW});
    float sunlit = smoothstep(-0.75, 0.55, towardSun);
    float rim = pow(1.0 - facing, 3.2);
    // The constant term takes the glare off the brightest deserts.
    float shade = 0.1 + smoothstep(0.25, -0.7, towardSun) * 0.56;
    vec3 haze = vec3(0.36, 0.60, 0.95) * rim * mix(0.12, 0.8, sunlit);
    // Premultiplied: adds haze, and darkens what is underneath by the shade.
    gl_FragColor = vec4(haze, shade);
  }
`;

const STAR_VERTEX = /* glsl */ `
  attribute float magnitude;
  uniform float pixelRatio;
  varying float vMagnitude;
  void main() {
    vMagnitude = magnitude;
    // Rotation only: the stars sit at infinity and ignore the camera's near and far planes.
    vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = clip.xyww;
    gl_PointSize = pixelRatio * mix(1.3, 3.4, magnitude * magnitude);
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying float vMagnitude;
  void main() {
    float falloff = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
    vec3 tint = mix(vec3(0.72, 0.80, 1.0), vec3(1.0, 0.93, 0.82), fract(vMagnitude * 7.3));
    gl_FragColor = vec4(tint * falloff * mix(0.3, 1.0, vMagnitude), 1.0);
  }
`;

function buildStarGeometry(): THREE.BufferGeometry {
  // Seeded, so the sky is the same sky on every visit.
  let seed = 20261117;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(STAR_COUNT * 3);
  const magnitudes = new Float32Array(STAR_COUNT);
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const height = 2 * random() - 1;
    const angle = 2 * Math.PI * random();
    const ring = Math.sqrt(1 - height * height);
    positions.set([ring * Math.cos(angle), ring * Math.sin(angle), height], index * 3);
    magnitudes[index] = random() ** 2.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("magnitude", new THREE.BufferAttribute(magnitudes, 1));
  return geometry;
}

/** Deep-space backdrop, the glow beyond the limb, and the haze and shade over the surface. */
export function GlobeAtmosphere() {
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const starGeometry = useMemo(buildStarGeometry, []);
  const glowUniforms = useMemo(() => ({ limbCosine: { value: Math.sqrt(1 - 1 / GLOW_SHELL ** 2) } }), []);
  const starUniforms = useMemo(() => ({ pixelRatio: { value: 1 } }), []);
  starUniforms.pixelRatio.value = pixelRatio;
  return (
    <group>
      <points geometry={starGeometry} frustumCulled={false} renderOrder={-10}>
        <shaderMaterial
          vertexShader={STAR_VERTEX}
          fragmentShader={STAR_FRAGMENT}
          uniforms={starUniforms}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </points>
      <mesh scale={WGS84_EQUATORIAL_RADIUS * GLOW_SHELL} renderOrder={5}>
        <sphereGeometry args={[1, 128, 64]} />
        <shaderMaterial
          vertexShader={SHELL_VERTEX}
          fragmentShader={GLOW_FRAGMENT}
          uniforms={glowUniforms}
          side={THREE.BackSide}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={WGS84_EQUATORIAL_RADIUS * HAZE_SHELL} renderOrder={4}>
        <sphereGeometry args={[1, 128, 64]} />
        <shaderMaterial
          vertexShader={SHELL_VERTEX}
          fragmentShader={HAZE_FRAGMENT}
          transparent
          blending={THREE.CustomBlending}
          blendSrc={THREE.OneFactor}
          blendDst={THREE.OneMinusSrcAlphaFactor}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
