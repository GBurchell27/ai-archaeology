"use client";

import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { boundsCenter, lonLatToMercator, sampleHeight, toLocal } from "@/lib/geo";
import { LAYER_STYLE } from "@/lib/periods";
import { createSurfaceMaterial, prepareTexture, sunDirection } from "@/lib/shade";
import { buildTerrainGeometry, type TerrainGrid } from "@/lib/terrain";
import type { AtlasMetadata, BaseMap, SiteFeature } from "@/lib/types";

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  token: number;
}

interface AtlasSceneProps {
  metadata: AtlasMetadata;
  metres: Float32Array;
  sites: SiteFeature[];
  baseMap: BaseMap;
  exaggeration: number;
  azimuth: number;
  altitude: number;
  labels: boolean;
  selectedId: string | null;
  pose: CameraPose;
  detail: TerrainGrid | null;
  detailUrl: string | null;
  compareUrl: string | null;
  compare: boolean;
  split: number;
  opacity: number;
  onSelect: (siteId: string) => void;
}

export function AtlasScene(props: AtlasSceneProps) {
  const origin = useMemo(() => boundsCenter(props.metadata.bounds), [props.metadata]);
  const span = Math.max(
    props.metadata.bounds[2] - props.metadata.bounds[0],
    props.metadata.bounds[3] - props.metadata.bounds[1],
  );
  return (
    <Canvas
      camera={{ position: props.pose.position, fov: 38, near: 40, far: span * 8 }}
      gl={{ antialias: true, outputColorSpace: THREE.LinearSRGBColorSpace }}
    >
      <color attach="background" args={["#cbb89a"]} />
      <Suspense fallback={null}>
      <NationalSurface
        metadata={props.metadata}
        metres={props.metres}
        origin={origin}
        baseMap={props.baseMap}
        exaggeration={props.exaggeration}
        azimuth={props.azimuth}
        altitude={props.altitude}
      />
      {props.detail && props.detailUrl ? (
        <DetailSurface
          grid={props.detail}
          origin={origin}
          datum={props.metadata.elevation.min}
          exaggeration={props.exaggeration}
          azimuth={props.azimuth}
          altitude={props.altitude}
          textureUrl={props.detailUrl}
          compareUrl={props.compareUrl}
          compare={props.compare}
          split={props.split}
          opacity={props.opacity}
        />
      ) : null}
      </Suspense>
      <SitePins
        sites={props.sites}
        metadata={props.metadata}
        metres={props.metres}
        origin={origin}
        exaggeration={props.exaggeration}
        labels={props.labels}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
      />
      <CameraRig pose={props.pose} span={span} />
    </Canvas>
  );
}

function NationalSurface({
  metadata,
  metres,
  origin,
  baseMap,
  exaggeration,
  azimuth,
  altitude,
}: {
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  baseMap: BaseMap;
  exaggeration: number;
  azimuth: number;
  altitude: number;
}) {
  const geometry = useMemo(
    () => buildTerrainGeometry(
      { ...metadata, metres },
      origin,
      metadata.elevation.min,
      exaggeration,
    ),
    [metadata, metres, origin, exaggeration],
  );
  const relief = useTexture(asset(metadata.rasters.relief));
  const hypsometric = useTexture(asset(metadata.rasters.hypsometric));
  const satellite = useTexture(asset(metadata.rasters.satellite));
  const texture = baseMap === "satellite" ? satellite : baseMap === "hypsometric" ? hypsometric : relief;
  return (
    <ShadedMesh
      geometry={geometry}
      textureA={texture}
      textureB={null}
      compare={false}
      split={0.5}
      opacity={1}
      azimuth={azimuth}
      altitude={altitude}
      lift={false}
    />
  );
}

function DetailSurface(props: {
  grid: TerrainGrid;
  origin: [number, number];
  datum: number;
  exaggeration: number;
  azimuth: number;
  altitude: number;
  textureUrl: string;
  compareUrl: string | null;
  compare: boolean;
  split: number;
  opacity: number;
}) {
  const geometry = useMemo(
    () => buildTerrainGeometry(props.grid, props.origin, props.datum, props.exaggeration),
    [props.grid, props.origin, props.datum, props.exaggeration],
  );
  const textureA = useTexture(props.textureUrl);
  const textureB = useTexture(props.compareUrl ?? props.textureUrl);
  return (
    <ShadedMesh
      geometry={geometry}
      textureA={textureA}
      textureB={props.compare ? textureB : null}
      compare={props.compare}
      split={props.split}
      opacity={props.opacity}
      azimuth={props.azimuth}
      altitude={props.altitude}
      lift
    />
  );
}

function ShadedMesh(props: {
  geometry: THREE.BufferGeometry;
  textureA: THREE.Texture;
  textureB: THREE.Texture | null;
  compare: boolean;
  split: number;
  opacity: number;
  azimuth: number;
  altitude: number;
  lift: boolean;
}) {
  const material = useMemo(() => createSurfaceMaterial(), []);
  const { size, gl } = useThree();
  useEffect(() => () => material.dispose(), [material]);
  material.uniforms.mapA.value = prepareTexture(props.textureA);
  material.uniforms.mapB.value = props.textureB ? prepareTexture(props.textureB) : material.uniforms.mapA.value;
  material.uniforms.useB.value = props.textureB ? 1 : 0;
  material.uniforms.compare.value = props.compare ? 1 : 0;
  material.uniforms.split.value = props.split;
  material.uniforms.opacity.value = props.opacity;
  material.uniforms.lightDirection.value.copy(sunDirection(props.azimuth, props.altitude));
  material.uniforms.resolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
  if (props.lift) {
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -8;
  }
  return <mesh geometry={props.geometry} material={material} />;
}

function SitePins(props: {
  sites: SiteFeature[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  exaggeration: number;
  labels: boolean;
  selectedId: string | null;
  onSelect: (siteId: string) => void;
}) {
  return (
    <group>
      {props.sites.map((site) => (
        <SitePin
          key={site.id}
          site={site}
          metadata={props.metadata}
          metres={props.metres}
          origin={props.origin}
          exaggeration={props.exaggeration}
          labels={props.labels}
          selected={site.id === props.selectedId}
          onSelect={props.onSelect}
        />
      ))}
    </group>
  );
}

function SitePin(props: {
  site: SiteFeature;
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  exaggeration: number;
  labels: boolean;
  selected: boolean;
  onSelect: (siteId: string) => void;
}) {
  const [east, north] = lonLatToMercator(props.site.geometry.coordinates[0], props.site.geometry.coordinates[1]);
  const elevation = sampleHeight(
    props.metres,
    props.metadata.width,
    props.metadata.height,
    props.metadata.bounds,
    east,
    north,
  );
  const [xCoord, zCoord] = toLocal(props.site.geometry.coordinates[0], props.site.geometry.coordinates[1], props.origin);
  const yCoord = (elevation - props.metadata.elevation.min) * props.exaggeration + 30;
  const mesh = useRef<THREE.Mesh>(null);
  const worldPoint = useRef(new THREE.Vector3());
  const approximate = props.site.properties.confidence === "approximate";
  const color = LAYER_STYLE[props.site.properties.layer].color;
  useFrame(({ camera }) => {
    if (!mesh.current) {
      return;
    }
    mesh.current.getWorldPosition(worldPoint.current);
    const distance = camera.position.distanceTo(worldPoint.current);
    const boost = props.selected ? 1.25 : 1;
    const scale = Math.min(6000, Math.max(280, distance * 0.0032)) * boost;
    mesh.current.scale.setScalar(scale);
  });
  return (
    <group position={[xCoord, yCoord, zCoord]}>
      <mesh
        ref={mesh}
        rotation={approximate ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          props.onSelect(props.site.id);
        }}
      >
        {approximate ? <ringGeometry args={[0.55, 0.9, 28]} /> : <sphereGeometry args={[0.55, 18, 14]} />}
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      {props.labels ? <PinLabel name={props.site.properties.name} /> : null}
    </group>
  );
}

function PinLabel({ name }: { name: string }) {
  return (
    <Html center distanceFactor={90000} style={{ pointerEvents: "none" }}>
      <span className="pin-name">{name}</span>
    </Html>
  );
}

function CameraRig({ pose, span }: { pose: CameraPose; span: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const flight = useRef<{ started: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || pose.token === 0) {
      orbit?.target.set(...pose.target);
      document.body.dataset.flying = "false";
      return;
    }
    flight.current = {
      started: performance.now(),
      fromP: camera.position.clone(),
      toP: new THREE.Vector3(...pose.position),
      fromT: orbit.target.clone(),
      toT: new THREE.Vector3(...pose.target),
    };
    orbit.enabled = false;
    document.body.dataset.flying = "true";
  }, [pose, camera]);

  useFrame(() => {
    const orbit = controls.current;
    const current = flight.current;
    if (!orbit || !current) {
      return;
    }
    const progress = Math.min(1, (performance.now() - current.started) / 1600);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
    camera.position.lerpVectors(current.fromP, current.toP, eased);
    orbit.target.lerpVectors(current.fromT, current.toT, eased);
    orbit.update();
    if (progress >= 1) {
      flight.current = null;
      orbit.enabled = true;
      document.body.dataset.flying = "false";
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={800}
      maxDistance={span * 2}
    />
  );
}

function asset(path: string): string {
  return `/terrain/${path}`;
}
