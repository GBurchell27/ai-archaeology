"use client";

import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CatalogueMarkers } from "@/components/CatalogueMarkers";
import { ClimatePins, ContextDrapes, ContextLines, type ClimatePoint, type ContextLineLayer, type ContextRasterLayer } from "@/components/ContextLayers";
import { NationalTerrain } from "@/components/NationalTerrain";
import { ATLAS_FOV_DEGREES } from "@/lib/pinCluster";
import { DPR_STEPS, INITIAL_DPR_INDEX } from "@/lib/renderQuality";
import type { WikiFeature } from "@/lib/wikidata";
import { boundsCenter, boundsContain, detailClipRect, lonLatToMercator, sampleMeshHeight, toLocal, type ClipRect } from "@/lib/geo";
import { LAYER_STYLE } from "@/lib/periods";
import { createSurfaceMaterial, prepareTexture, sunDirection } from "@/lib/shade";
import { HAZE_FAR, HAZE_NEAR, HAZE_STRENGTH, hazeBackground } from "@/lib/sky";
import { stitchDetailToNational } from "@/lib/stitch";
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
  night: boolean;
  reveal: boolean;
  readoutRef: RefObject<HTMLDivElement | null>;
  contextLines: ContextLineLayer[];
  contextRasters: ContextRasterLayer[];
  climatePoints: ClimatePoint[];
  climateId: string | null;
  onClimate: (recordId: string) => void;
  detailToken: number;
  wikiSites: WikiFeature[];
  onOpenWiki: (siteId: string) => void;
  onApproachWiki: (longitude: number, latitude: number, cameraDistance: number) => void;
  flightCancel: number;
}

export function AtlasScene(props: AtlasSceneProps) {
  const origin = useMemo(() => boundsCenter(props.metadata.bounds), [props.metadata]);
  const national = useMemo(
    () => ({ ...props.metadata, metres: props.metres }),
    [props.metadata, props.metres],
  );
  const [cover, setCover] = useState(false);
  useEffect(() => {
    setCover(false);
    if (!props.reveal || !props.detail) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setCover(true), reduced ? 0 : 300);
    return () => window.clearTimeout(timer);
  }, [props.reveal, props.detail]);
  const span = Math.max(
    props.metadata.bounds[2] - props.metadata.bounds[0],
    props.metadata.bounds[3] - props.metadata.bounds[1],
  );
  return (
    <Canvas
      dpr={DPR_STEPS[INITIAL_DPR_INDEX]}
      camera={{ position: props.pose.position, fov: ATLAS_FOV_DEGREES, near: 40, far: span * 8 }}
      gl={{ antialias: false, outputColorSpace: THREE.LinearSRGBColorSpace }}
    >
      <SkyHaze night={props.night} />
      <Suspense fallback={null}>
      <NationalTerrain
        metadata={props.metadata}
        metres={props.metres}
        origin={origin}
        baseMap={props.baseMap}
        exaggeration={props.exaggeration}
        azimuth={props.azimuth}
        altitude={props.altitude}
        night={props.night}
        clip={cover && props.detail ? detailClipRect(props.detail.bounds, origin) : null}
      />
      {props.reveal && props.detail && props.detailUrl ? (
        <DetailSurface
          grid={props.detail}
          national={national}
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
          night={props.night}
          detailToken={props.detailToken}
        />
      ) : null}
      <ContextDrapes
        layers={props.contextRasters}
        metadata={props.metadata}
        metres={props.metres}
        origin={origin}
        exaggeration={props.exaggeration}
        clip={cover && props.detail ? detailClipRect(props.detail.bounds, origin) : null}
      />
      </Suspense>
      <ContextLines
        layers={props.contextLines}
        origin={origin}
        metadata={props.metadata}
        metres={props.metres}
        exaggeration={props.exaggeration}
      />
      <ClimatePins
        points={props.climatePoints}
        metadata={props.metadata}
        metres={props.metres}
        origin={origin}
        exaggeration={props.exaggeration}
        selectedId={props.climateId}
        onSelect={props.onClimate}
      />
      <CatalogueMarkers
        sites={props.wikiSites}
        metadata={props.metadata}
        metres={props.metres}
        origin={origin}
        exaggeration={props.exaggeration}
        labels={props.labels}
        onOpen={props.onOpenWiki}
        onApproach={props.onApproachWiki}
      />
      <SitePins
        sites={props.sites}
        metadata={props.metadata}
        metres={props.metres}
        detail={props.detail}
        origin={origin}
        exaggeration={props.exaggeration}
        labels={props.labels}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
      />
      <CameraRig pose={props.pose} span={span} readoutRef={props.readoutRef} originY={origin[1]} cancelToken={props.flightCancel} />
    </Canvas>
  );
}

function SkyHaze({ night }: { night: boolean }) {
  const texture = useMemo(() => hazeBackground(night), [night]);
  const { scene } = useThree();
  useEffect(() => {
    const previous = scene.background;
    scene.background = texture;
    return () => {
      scene.background = previous;
      texture.dispose();
    };
  }, [scene, texture]);
  return null;
}

function DetailSurface(props: {
  grid: TerrainGrid;
  national: TerrainGrid;
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
  night: boolean;
  detailToken: number;
}) {
  const stitched = useMemo(
    () => stitchDetailToNational(props.grid, props.national),
    [props.grid, props.national],
  );
  const geometry = useMemo(
    () => buildTerrainGeometry(stitched, props.origin, props.datum, props.exaggeration),
    [stitched, props.origin, props.datum, props.exaggeration],
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
      night={props.night}
      fade
      detailToken={props.detailToken}
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
  clip?: ClipRect | null;
  night?: boolean;
  fade?: boolean;
  detailToken?: number;
}) {
  const material = useMemo(() => createSurfaceMaterial(), []);
  const { size, gl } = useThree();
  useEffect(() => () => material.dispose(), [material]);
  material.uniforms.mapA.value = prepareTexture(props.textureA);
  material.uniforms.mapB.value = props.textureB ? prepareTexture(props.textureB) : material.uniforms.mapA.value;
  material.uniforms.useB.value = props.textureB ? 1 : 0;
  material.uniforms.compare.value = props.compare ? 1 : 0;
  material.uniforms.split.value = props.split;
  material.uniforms.lightDirection.value.copy(sunDirection(props.azimuth, props.altitude));
  material.uniforms.resolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
  material.uniforms.hazeNear.value = HAZE_NEAR;
  material.uniforms.hazeFar.value = HAZE_FAR;
  material.uniforms.hazeStrength.value = HAZE_STRENGTH;
  material.uniforms.hazeColor.value.set(203 / 255, 184 / 255, 154 / 255);
  const fade = useRef(props.fade ? 0 : 1);
  const announced = useRef(0);
  if (!props.fade) fade.current = 1;
  material.uniforms.opacity.value = props.opacity * fade.current;
  useFrame(() => {
    if (!props.fade) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fade.current = reduced ? 1 : Math.min(1, fade.current + 0.08);
    material.uniforms.opacity.value = props.opacity * fade.current;
    const token = props.detailToken ?? 0;
    if (fade.current >= 1 && announced.current !== token && document.body.dataset.detailToken === String(token)) {
      announced.current = token;
      document.body.dataset.detail = "ready";
    }
  });
  material.uniforms.night.value = props.night ? 1 : 0;
  material.uniforms.clipOn.value = props.clip ? 1 : 0;
  if (props.clip) {
    material.uniforms.clipRect.value.set(props.clip.minX, props.clip.minZ, props.clip.maxX, props.clip.maxZ);
  }
  if (props.lift) {
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -2;
  }
  return <mesh geometry={props.geometry} material={material} />;
}

function SitePins(props: {
  sites: SiteFeature[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  detail: TerrainGrid | null;
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
          detail={props.detail}
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
  detail: TerrainGrid | null;
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
  const elevation = elevationAt(props.metadata, props.metres, props.detail, east, north);
  const [xCoord, zCoord] = toLocal(props.site.geometry.coordinates[0], props.site.geometry.coordinates[1], props.origin);
  const yCoord = (elevation - props.metadata.elevation.min) * props.exaggeration + 18;
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
          scale={[0.05, 0.05, 1]}
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
          <spriteMaterial transparent opacity={0} depthTest={false} sizeAttenuation={false} />
        </sprite>
        <sprite scale={[scale * 1.45, scale * 1.45, 1]}>
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
          <Html center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
            <span className="tip is-shown">{props.site.properties.name}</span>
          </Html>
        ) : null}
      </group>
    </group>
  );
}

function elevationAt(
  metadata: AtlasMetadata,
  metres: Float32Array,
  detail: TerrainGrid | null,
  east: number,
  north: number,
): number {
  if (detail && boundsContain(detail.bounds, east, north)) {
    return sampleMeshHeight(detail.metres, detail.width, detail.height, detail.bounds, east, north);
  }
  return sampleMeshHeight(metres, metadata.width, metadata.height, metadata.bounds, east, north);
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

function CameraRig({ pose, span, readoutRef, originY, cancelToken }: { pose: CameraPose; span: number; readoutRef: RefObject<HTMLDivElement | null>; originY: number; cancelToken: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const size = useThree((state) => state.size);
  const flight = useRef<{ started: number; duration: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || pose.token === 0) {
      orbit?.target.set(...pose.target);
      document.body.dataset.flying = "false";
      return;
    }
    const fromP = camera.position.clone();
    const toP = new THREE.Vector3(...pose.position);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : THREE.MathUtils.clamp(1200 + (fromP.distanceTo(toP) / 900000) * 600, 1200, 1800);
    flight.current = {
      started: performance.now(),
      duration,
      fromP,
      toP,
      fromT: orbit.target.clone(),
      toT: new THREE.Vector3(...pose.target),
    };
    orbit.enabled = false;
    orbit.enableDamping = false;
    document.body.dataset.flying = "true";
    document.body.dataset.flightMs = String(Math.round(duration));
  }, [pose, camera]);

  useEffect(() => {
    if (cancelToken === 0) return;
    flight.current = null;
    const orbit = controls.current;
    if (orbit) {
      orbit.enableDamping = true;
      orbit.enabled = true;
    }
    document.body.dataset.flying = "false";
  }, [cancelToken]);

  useFrame(() => {
    const orbit = controls.current;
    if (orbit) {
      const debugWindow = window as Window & {
        __atlasCamera?: typeof camera;
        __atlasControls?: typeof orbit;
        __atlasScene?: typeof scene;
      };
      debugWindow.__atlasCamera = camera;
      debugWindow.__atlasControls = orbit;
      debugWindow.__atlasScene = scene;
      writeReadout(readoutRef.current, camera, orbit.target, originY, size.width, size.height);
    }
    const current = flight.current;
    if (!orbit || !current) {
      return;
    }
    const progress = current.duration === 0 ? 1 : Math.min(1, (performance.now() - current.started) / current.duration);
    const eased = easeInOutCubic(progress);
    camera.position.lerpVectors(current.fromP, current.toP, eased);
    orbit.target.lerpVectors(current.fromT, current.toT, eased);
    orbit.update();
    if (progress >= 1) {
      flight.current = null;
      orbit.enableDamping = true;
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

function easeInOutCubic(amount: number): number {
  return amount < 0.5 ? 4 * amount * amount * amount : 1 - ((-2 * amount + 2) ** 3) / 2;
}

function writeReadout(
  element: HTMLDivElement | null,
  camera: THREE.Camera,
  target: THREE.Vector3,
  originY: number,
  width: number,
  height: number,
) {
  if (!element) return;
  const north = target.clone();
  north.z -= 4000;
  const east = target.clone();
  east.x += 2000;
  const here = screenPoint(target, camera, width, height);
  const northPoint = screenPoint(north, camera, width, height);
  const eastPoint = screenPoint(east, camera, width, height);
  const heading = Math.atan2(northPoint.x - here.x, here.y - northPoint.y);
  const latitude = Math.atan(Math.sinh((originY - target.z) / 6378137)) * 180 / Math.PI;
  const pixels = Math.hypot(eastPoint.x - here.x, eastPoint.y - here.y);
  const metresPerPixel = (2000 * Math.cos(latitude * Math.PI / 180)) / Math.max(pixels, 0.001);
  const choices = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
  let chosen = choices[0];
  for (const choice of choices) {
    if (choice / metresPerPixel <= 140) chosen = choice;
  }
  const bar = element.querySelector("[data-role='scale-bar']") as HTMLElement | null;
  const label = element.querySelector("[data-role='scale-label']");
  const arrow = element.querySelector("[data-role='north']") as HTMLElement | null;
  if (bar) bar.style.width = `${Math.max(48, chosen / metresPerPixel)}px`;
  if (label) label.textContent = chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
  if (arrow) arrow.style.transform = `rotate(${heading}rad)`;
  const zoomedOut = camera.position.distanceTo(target) > 160000;
  const rotated = Math.abs(heading) > 0.18;
  element.dataset.on = zoomedOut || rotated ? "true" : "false";
}

function screenPoint(point: THREE.Vector3, camera: THREE.Camera, width: number, height: number): THREE.Vector2 {
  const projected = point.clone().project(camera);
  return new THREE.Vector2((projected.x * 0.5 + 0.5) * width, (-projected.y * 0.5 + 0.5) * height);
}

function asset(path: string): string {
  return `/terrain/${path}`;
}
