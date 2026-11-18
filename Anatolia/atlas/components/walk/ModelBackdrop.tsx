"use client";

import { useMemo } from "react";
import { BackSide, CanvasTexture, CylinderGeometry, DoubleSide, RepeatWrapping, SRGBColorSpace, Vector3 } from "three";

/** A low evening sun in the south-west, behind the walker's left shoulder at the start. */
const SUN_DIRECTION = new Vector3(-0.72, 0.42, 0.55).normalize();
const SUN_DISTANCE_M = 150;
/** Half the side of the square the shadow map covers, centred on the origin. */
const SHADOW_REACH_M = 46;
const HORIZON_HAZE = "#9d9484";
const FLOOR_RADIUS_M = 320;
const HILL_RADIUS_M = 300;
const SKY_RADIUS_M = 450;
const EARTH_TILE_M = 9;

const SKY_VERTEX = /* glsl */ `
  varying vec3 skyDirection;
  void main() {
    skyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Colours are written as display values: a shader material is neither tone mapped nor colour converted.
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 sunDirection;
  varying vec3 skyDirection;
  void main() {
    vec3 direction = normalize(skyDirection);
    float towardSun = max(dot(normalize(direction.xz + 1e-5), normalize(sunDirection.xz)), 0.0);
    vec3 horizon = mix(vec3(0.62, 0.60, 0.58), vec3(0.96, 0.74, 0.44), pow(towardSun, 3.0));
    vec3 sky = mix(horizon, vec3(0.13, 0.20, 0.34), pow(clamp(direction.y, 0.0, 1.0), 0.42));
    float alongSun = max(dot(direction, sunDirection), 0.0);
    sky += vec3(0.55, 0.36, 0.14) * pow(alongSun, 10.0) + vec3(1.0, 0.86, 0.6) * pow(alongSun, 700.0);
    gl_FragColor = vec4(sky, 1.0);
  }
`;

function Sky() {
  const uniforms = useMemo(() => ({ sunDirection: { value: SUN_DIRECTION } }), []);
  return (
    <mesh>
      <sphereGeometry args={[SKY_RADIUS_M, 32, 16]} />
      <shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} uniforms={uniforms} side={BackSide} depthWrite={false} />
    </mesh>
  );
}

/** A far ring of rolling silhouettes: an open cylinder whose top edge follows a few summed waves. */
function hillRingGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(HILL_RADIUS_M, HILL_RADIUS_M, 1, 180, 1, true);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const around = Math.atan2(positions.getZ(index), positions.getX(index));
    const crestM = 13 + 6 * Math.sin(around * 3 + 1) + 4 * Math.sin(around * 7 + 2.3) + 2 * Math.sin(around * 17);
    positions.setY(index, positions.getY(index) > 0 ? crestM : -1);
  }
  return geometry;
}

function Hills() {
  const geometry = useMemo(hillRingGeometry, []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#4a4640" side={DoubleSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

/** A small speckled tile drawn here, so the packed earth is not one flat colour. */
function earthTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#85765f";
    context.fillRect(0, 0, 256, 256);
    // Mostly fine grit, with an occasional broad patch so the floor reads at walking distance too.
    for (let speck = 0; speck < 5000; speck += 1) {
      const sizePx = speck % 40 === 0 ? 8 + Math.random() * 22 : 1 + Math.random() * 3;
      context.fillStyle = Math.random() > 0.5 ? "rgba(214, 196, 164, 0.14)" : "rgba(52, 40, 28, 0.14)";
      context.beginPath();
      context.ellipse(Math.random() * 256, Math.random() * 256, sizePx, sizePx * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, 2 * Math.PI);
      context.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.setScalar((2 * FLOOR_RADIUS_M) / EARTH_TILE_M);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function Floor() {
  const texture = useMemo(earthTexture, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2 * FLOOR_RADIUS_M, 2 * FLOOR_RADIUS_M]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

function Sunlight() {
  return (
    <>
      <hemisphereLight args={["#c3d0e4", "#9c8a70", 1.7]} />
      <directionalLight
        position={SUN_DIRECTION.clone().multiplyScalar(SUN_DISTANCE_M)}
        color="#ffe3bd"
        intensity={2.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      >
        <orthographicCamera attach="shadow-camera" args={[-SHADOW_REACH_M, SHADOW_REACH_M, SHADOW_REACH_M, -SHADOW_REACH_M, 1, 2 * SUN_DISTANCE_M]} />
      </directionalLight>
    </>
  );
}

/** Everything around a model that is not the model: evening sky, far hills, earth floor, sun and haze. */
export function ModelBackdrop() {
  return (
    <>
      <fog attach="fog" args={[HORIZON_HAZE, 70, FLOOR_RADIUS_M]} />
      <Sky />
      <Hills />
      <Floor />
      <Sunlight />
    </>
  );
}
