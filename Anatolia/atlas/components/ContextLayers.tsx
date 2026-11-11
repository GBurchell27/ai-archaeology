"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { contextSegments, type ContextFeature } from "@/lib/contextGeometry";
import { prepareTexture } from "@/lib/shade";
import { buildTerrainGeometry } from "@/lib/terrain";
import type { AtlasMetadata } from "@/lib/types";
import { lonLatToMercator, sampleMeshHeight, toLocal } from "@/lib/geo";
import type { ClipRect } from "@/lib/geo";

export interface ContextLineLayer {
  id: string;
  color: string;
  features: ContextFeature[];
}

export interface ContextRasterLayer {
  id: string;
  url: string;
  opacity: number;
}

export interface ClimatePoint {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
}

const DRAPE_VERTEX = `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const DRAPE_FRAGMENT = `
precision highp float;
uniform sampler2D map;
uniform float opacity;
uniform vec4 clipRect;
uniform float clipOn;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  if (clipOn > 0.5 && vWorld.x > clipRect.x && vWorld.x < clipRect.z && vWorld.z > clipRect.y && vWorld.z < clipRect.w) {
    discard;
  }
  vec4 color = texture2D(map, vUv);
  if (color.a < 0.04) discard;
  gl_FragColor = vec4(color.rgb, color.a * opacity);
}
`;

export function ContextLines(props: {
  layers: ContextLineLayer[];
  origin: [number, number];
  metadata: AtlasMetadata;
  metres: Float32Array;
  exaggeration: number;
}) {
  return (
    <group>
      {props.layers.map((layer) => (
        <ContextLine
          key={layer.id}
          layer={layer}
          origin={props.origin}
          metadata={props.metadata}
          metres={props.metres}
          exaggeration={props.exaggeration}
        />
      ))}
    </group>
  );
}

function ContextLine(props: {
  layer: ContextLineLayer;
  origin: [number, number];
  metadata: AtlasMetadata;
  metres: Float32Array;
  exaggeration: number;
}) {
  const geometry = useMemo(() => {
    const positions = contextSegments(
      props.layer.features,
      props.origin,
      props.metadata,
      props.metres,
      props.exaggeration,
    );
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return next;
  }, [props.layer, props.origin, props.metadata, props.metres, props.exaggeration]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry} renderOrder={2}>
      <lineBasicMaterial color={props.layer.color} />
    </lineSegments>
  );
}

export function ContextDrapes(props: {
  layers: ContextRasterLayer[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  exaggeration: number;
  clip: ClipRect | null;
}) {
  const geometry = useMemo(
    () => buildTerrainGeometry(
      { ...props.metadata, metres: props.metres },
      props.origin,
      props.metadata.elevation.min,
      props.exaggeration,
    ),
    [props.metadata, props.metres, props.origin, props.exaggeration],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (props.layers.length === 0) return null;
  return (
    <group>
      {props.layers.map((layer) => (
        <SoilDrape key={layer.id} layer={layer} geometry={geometry} clip={props.clip} />
      ))}
    </group>
  );
}

function SoilDrape(props: { layer: ContextRasterLayer; geometry: THREE.BufferGeometry; clip: ClipRect | null }) {
  const material = useMemo(() => {
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    blank.needsUpdate = true;
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: blank },
        opacity: { value: props.layer.opacity },
        clipRect: { value: new THREE.Vector4(0, 0, 0, 0) },
        clipOn: { value: 0 },
      },
      vertexShader: DRAPE_VERTEX,
      fragmentShader: DRAPE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, []);
  useEffect(() => {
    let cancel = false;
    const loader = new THREE.TextureLoader();
    loader.load(props.layer.url, (texture) => {
      if (cancel) {
        texture.dispose();
        return;
      }
      prepareTexture(texture);
      material.uniforms.map.value = texture;
    });
    return () => {
      cancel = true;
    };
  }, [props.layer.url, material]);
  useEffect(() => {
    material.uniforms.opacity.value = props.layer.opacity;
    material.uniforms.clipOn.value = props.clip ? 1 : 0;
    if (props.clip) {
      material.uniforms.clipRect.value.set(props.clip.minX, props.clip.minZ, props.clip.maxX, props.clip.maxZ);
    }
  }, [material, props.layer.opacity, props.clip]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={props.geometry} material={material} renderOrder={1} />;
}

export function ClimatePins(props: {
  points: ClimatePoint[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  exaggeration: number;
  selectedId: string | null;
  onSelect: (recordId: string) => void;
}) {
  const marker = useMemo(() => paintDiamond(), []);
  return (
    <group>
      {props.points.map((point) => {
        const [east, north] = lonLatToMercator(point.longitude, point.latitude);
        const elevation = sampleMeshHeight(
          props.metres, props.metadata.width, props.metadata.height, props.metadata.bounds, east, north,
        );
        const [xCoord, zCoord] = toLocal(point.longitude, point.latitude, props.origin);
        const yCoord = (elevation - props.metadata.elevation.min) * props.exaggeration + 80;
        const selected = point.id === props.selectedId;
        return (
          <sprite
            key={point.id}
            position={[xCoord, yCoord, zCoord]}
            scale={[selected ? 0.04 : 0.028, selected ? 0.04 : 0.028, 1]}
            onClick={(event) => {
              event.stopPropagation();
              props.onSelect(point.id);
            }}
          >
            <spriteMaterial map={marker} color="#f4efe4" transparent depthTest={false} sizeAttenuation={false} />
          </sprite>
        );
      })}
    </group>
  );
}

function paintDiamond(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Climate marker canvas failed");
  context.clearRect(0, 0, 64, 64);
  context.translate(32, 32);
  context.rotate(Math.PI / 4);
  context.fillStyle = "#f4efe4";
  context.strokeStyle = "#2a241c";
  context.lineWidth = 6;
  context.fillRect(-14, -14, 28, 28);
  context.strokeRect(-14, -14, 28, 28);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
