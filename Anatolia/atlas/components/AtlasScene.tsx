"use client";

import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
  const spread = useRef(0);
  const clusterIds = useMemo(() => clusteredSiteIds(props.sites), [props.sites]);
  useFrame(({ camera }) => {
    spread.current = THREE.MathUtils.clamp((camera.position.length() - 140000) / 420000, 0, 1);
  });
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
          spread={spread}
          clusterIndex={clusterIds.indexOf(site.id)}
          clusterCount={clusterIds.length}
        />
      ))}
    </group>
  );
}

function clusteredSiteIds(sites: SiteFeature[]): string[] {
  return sites
    .filter((site) => {
      const [longitude, latitude] = site.geometry.coordinates;
      return (longitude - 38.95) ** 2 + (latitude - 37.15) ** 2 < 0.55 ** 2;
    })
    .map((site) => site.id);
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
  spread: MutableRefObject<number>;
  clusterIndex: number;
  clusterCount: number;
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
  const yCoord = (elevation - props.metadata.elevation.min) * props.exaggeration + 40;
  const marker = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const approximate = props.site.properties.confidence === "approximate";
  const color = LAYER_STYLE[props.site.properties.layer].color;
  const textures = useMarkerTextures();
  useFrame(() => {
    if (!marker.current) {
      return;
    }
    const amount = props.selected || props.clusterIndex < 0 ? 0 : props.spread.current;
    const angle = props.clusterCount > 0 ? (props.clusterIndex / props.clusterCount) * Math.PI * 2 : 0;
    const radius = 78000 * amount;
    marker.current.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
  const scale = props.selected ? 0.046 : 0.032;
  return (
    <group position={[xCoord, yCoord, zCoord]}>
      {props.selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 140, 0]} renderOrder={3}>
          <ringGeometry args={[420, 680, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      ) : null}
      <group ref={marker}>
        <sprite
          scale={[scale * 1.45, scale * 1.45, 1]}
          onClick={(event) => {
            event.stopPropagation();
            props.onSelect(props.site.id);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <spriteMaterial map={textures.halo} color={color} transparent depthTest={false} sizeAttenuation={false} />
        </sprite>
        <sprite scale={[scale, scale, 1]}>
          <spriteMaterial
            map={approximate ? textures.open : textures.filled}
            color={color}
            transparent
            depthTest={false}
            sizeAttenuation={false}
          />
        </sprite>
        {hovered || props.selected || props.labels ? (
          <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <span className="tip is-shown">{props.site.properties.name}</span>
          </Html>
        ) : null}
      </group>
    </group>
  );
}

function useMarkerTextures() {
  return useMemo(() => ({
    filled: paintMarker(true),
    open: paintMarker(false),
    halo: paintHalo(),
  }), []);
}

function paintMarker(filled: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not draw a site marker");
  }
  context.clearRect(0, 0, 64, 64);
  context.beginPath();
  context.arc(32, 32, 18, 0, Math.PI * 2);
  context.lineWidth = 8;
  context.strokeStyle = "#fff8ee";
  context.stroke();
  if (filled) {
    context.fillStyle = "#ffffff";
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function paintHalo(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not draw a site halo");
  }
  const gradient = context.createRadialGradient(32, 32, 8, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
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
    if (orbit) {
      const debugWindow = window as Window & {
        __atlasCamera?: typeof camera;
        __atlasControls?: typeof orbit;
      };
      debugWindow.__atlasCamera = camera;
      debugWindow.__atlasControls = orbit;
    }
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
      dampingFactor={0.08}
      zoomSpeed={0.65}
      panSpeed={0.7}
      rotateSpeed={0.5}
      maxPolarAngle={Math.PI / 2 - 0.03}
      minDistance={600}
      maxDistance={span * 2.4}
    />
  );
}

function asset(path: string): string {
  return `/terrain/${path}`;
}
