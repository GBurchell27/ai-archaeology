"use client";

import { Html, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { AtlasCamera, type CameraPose, type ZoomCommand } from "@/components/AtlasCamera";
import { PlaceProximity } from "@/components/PlaceProximity";
import { CatalogueMarkers } from "@/components/CatalogueMarkers";
import { ClimatePins, ContextDrapes, ContextLines, type ClimatePoint, type ContextLineLayer, type ContextRasterLayer } from "@/components/ContextLayers";
import { NationalTerrain, useTerrainTiles } from "@/components/NationalTerrain";
import { ATLAS_FOV_DEGREES, worldSizeForPixels } from "@/lib/pinCluster";
import { DPR_STEPS, INITIAL_DPR_INDEX } from "@/lib/renderQuality";
import type { WikiFeature } from "@/lib/wikidata";
import { boundsCenter, boundsContain, detailClipRect, lonLatToMercator, sampleMeshHeight, toLocal, type ClipRect } from "@/lib/geo";
import { LAYER_STYLE } from "@/lib/periods";
import { createSurfaceMaterial, prepareTexture, sunDirection } from "@/lib/shade";
import { HAZE_FAR, HAZE_NEAR, HAZE_STRENGTH, hazeBackground } from "@/lib/sky";
import { stitchDetailToNational } from "@/lib/stitch";
import { buildTerrainGeometry, coarseTerrainGeometry, type TerrainGrid } from "@/lib/terrain";
import type { AtlasMetadata, BaseMap, RegionalTerrain, SiteFeature } from "@/lib/types";

const DETAIL_FEATHER = 0.10;

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
  region: RegionalTerrain | null;
  regionalGrid: TerrainGrid | null;
  regionalUrl: string | null;
  onRegionApproach: () => void;
  onRegionVisibility: (visible: boolean) => void;
  compareUrl: string | null;
  compare: boolean;
  split: number;
  opacity: number;
  onSelect: (siteId: string) => void;
  night: boolean;
  readoutRef: RefObject<HTMLDivElement | null>;
  contextLines: ContextLineLayer[];
  contextRasters: ContextRasterLayer[];
  climatePoints: ClimatePoint[];
  climateId: string | null;
  onClimate: (recordId: string) => void;
  zoomSpeed: number;
  zoomCommand: ZoomCommand;
  onArrival: () => void;
  onNearby: (id: string | null) => void;
  nearbyEnabled: boolean;
  wikiSites: WikiFeature[];
  onOpenWiki: (siteId: string) => void;
  onApproachWiki: (longitude: number, latitude: number, cameraDistance: number) => void;
  flightCancel: number;
  /** Extra 3D layers drawn inside the atlas canvas, in the same local coordinates. */
  overlay?: ReactNode;
}

export function AtlasScene(props: AtlasSceneProps) {
  const origin = useMemo(() => boundsCenter(props.metadata.bounds), [props.metadata]);
  const national = useMemo(
    () => ({ ...props.metadata, metres: props.metres }),
    [props.metadata, props.metres],
  );
  const [cover, setCover] = useState<string | null>(null);
  const [regionCover, setRegionCover] = useState<string | null>(null);
  const background = useMemo(() => hazeBackground(props.night), [props.night]);
  const [initialPosition] = useState(props.pose.position);
  const clip = props.detail && props.detailUrl && cover === props.detailUrl
    ? detailClipRect(props.detail.bounds, origin, DETAIL_FEATHER)
    : null;
  const regionalSurface = useMemo(() => props.regionalGrid
    ? stitchDetailToNational(props.regionalGrid, national)
    : null, [props.regionalGrid, national]);
  const regionClip = regionalSurface && props.regionalUrl && regionCover === props.regionalUrl
    ? detailClipRect(regionalSurface.bounds, origin, DETAIL_FEATHER)
    : null;
  const regionalBase = regionalSurface && props.detail && containsWindow(regionalSurface, props.detail)
    ? regionalSurface
    : national;
  const onCover = useCallback((url: string, covered: boolean) => {
    setCover((current) => covered ? url : current === url ? null : current);
  }, []);
  const onRegionCover = useCallback((url: string, covered: boolean) => {
    setRegionCover((current) => covered ? url : current === url ? null : current);
  }, []);
  const regionVisible = Boolean(regionClip);
  useEffect(() => props.onRegionVisibility(regionVisible), [props.onRegionVisibility, regionVisible]);
  const groundAt = (x: number, z: number) => {
    const east = x + origin[0];
    const north = origin[1] - z;
    if (!boundsContain(national.bounds, east, north)) return null;
    const elevation = elevationAt(national, regionClip ? regionalSurface : null, clip ? props.detail : null, east, north);
    return (elevation - props.metadata.elevation.min) * props.exaggeration;
  };
  const span = Math.max(
    props.metadata.bounds[2] - props.metadata.bounds[0],
    props.metadata.bounds[3] - props.metadata.bounds[1],
  );
  return (
    <Canvas
      flat
      dpr={DPR_STEPS[INITIAL_DPR_INDEX]}
      camera={{ position: initialPosition, fov: ATLAS_FOV_DEGREES, near: 40, far: span * 8 }}
      gl={{ antialias: true, outputColorSpace: THREE.LinearSRGBColorSpace }}
    >
      <SkyHaze texture={background} />
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
          clip={clip}
          regionClip={regionClip}
          background={background}
        />
      </Suspense>
      {props.region && !props.regionalGrid ? (
        <RegionApproach region={props.region} origin={origin} onApproach={props.onRegionApproach} />
      ) : null}
      {regionalSurface && props.regionalUrl ? (
        <DetailBoundary key={props.regionalUrl}>
          <Suspense fallback={null}>
            <DetailSurface
              grid={regionalSurface}
              origin={origin}
              datum={props.metadata.elevation.min}
              exaggeration={props.exaggeration}
              azimuth={props.azimuth}
              altitude={props.altitude}
              textureUrl={props.regionalUrl}
              compareUrl={null}
              compare={false}
              split={0.5}
              opacity={1}
              night={props.night}
              onCover={onRegionCover}
              regional
              clip={clip}
            />
          </Suspense>
        </DetailBoundary>
      ) : null}
      {props.detail && props.detailUrl ? (
        <DetailBoundary key={`${props.detailUrl}|${props.compareUrl ?? ""}`}>
          <Suspense fallback={null}>
            <DetailSurface
              grid={props.detail}
              base={regionalBase}
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
              onCover={onCover}
            />
          </Suspense>
        </DetailBoundary>
      ) : null}
      <Suspense fallback={null}>
        <ContextDrapes
          layers={props.contextRasters}
          metadata={props.metadata}
          metres={props.metres}
          origin={origin}
          exaggeration={props.exaggeration}
          clip={regionClip ?? clip}
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
        regional={regionClip ? regionalSurface : null}
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
        regional={regionClip ? regionalSurface : null}
        detail={clip ? props.detail : null}
        origin={origin}
        exaggeration={props.exaggeration}
        labels={props.labels}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
      />
      {props.overlay}
      <AtlasCamera
        pose={props.pose}
        span={span}
        readoutRef={props.readoutRef}
        originY={origin[1]}
        cancelToken={props.flightCancel}
        zoomSpeed={props.zoomSpeed}
        zoomCommand={props.zoomCommand}
        onArrival={props.onArrival}
        groundAt={groundAt}
      />
      <PlaceProximity
        sites={props.sites}
        catalogue={props.wikiSites}
        national={national}
        regional={regionClip ? regionalSurface : null}
        origin={origin}
        datum={props.metadata.elevation.min}
        exaggeration={props.exaggeration}
        enabled={props.nearbyEnabled}
        onChange={props.onNearby}
      />
    </Canvas>
  );
}

function SkyHaze({ texture }: { texture: THREE.Texture }) {
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

function RegionApproach(props: {
  region: RegionalTerrain;
  origin: [number, number];
  onApproach: () => void;
}) {
  const rect = useMemo(() => detailClipRect(props.region.bounds, props.origin, 0), [props.region, props.origin]);
  const sent = useRef(false);
  const span = Math.max(rect.maxX - rect.minX, rect.maxZ - rect.minZ);
  useFrame(({ camera, controls }) => {
    const target = (controls as { target?: THREE.Vector3 } | null)?.target;
    if (sent.current || !target || camera.position.distanceTo(target) > span * 4) return;
    if (distanceToRect(target, rect) > span) return;
    sent.current = true;
    props.onApproach();
  });
  return null;
}

function distanceToRect(target: THREE.Vector3, rect: ClipRect): number {
  return Math.hypot(
    Math.max(rect.minX - target.x, target.x - rect.maxX, 0),
    Math.max(rect.minZ - target.z, target.z - rect.maxZ, 0),
  );
}

function containsWindow(base: TerrainGrid, detail: TerrainGrid): boolean {
  const [left, bottom, right, top] = detail.bounds;
  return boundsContain(base.bounds, left, bottom) && boundsContain(base.bounds, right, top);
}

class DetailBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function DetailSurface(props: {
  grid: TerrainGrid;
  base?: TerrainGrid;
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
  onCover: (url: string, covered: boolean) => void;
  regional?: boolean;
  clip?: ClipRect | null;
}) {
  const { grid, base, origin, datum, textureUrl, onCover } = props;
  const textureA = useTexture(textureUrl);
  const textureB = useTexture(props.compareUrl ?? textureUrl);
  const stitched = useMemo(() => base ? stitchDetailToNational(grid, base) : grid, [grid, base]);
  const geometry = useMemo(
    () => props.regional
      ? coarseTerrainGeometry(stitched, origin, datum, 1, 2)
      : buildTerrainGeometry(stitched, origin, datum, 1),
    [stitched, origin, datum, props.regional],
  );
  const tiles = useTerrainTiles(stitched, origin, datum, Boolean(props.regional));
  const [showTiles, setShowTiles] = useState(false);
  const tileMode = useRef(false);
  const order = props.regional ? 1 : 3;
  const rect = useMemo(() => detailClipRect(grid.bounds, origin, 0), [grid, origin]);
  const span = Math.max(rect.maxX - rect.minX, rect.maxZ - rect.minZ);
  const material = useMemo(() => createSurfaceMaterial(), []);
  const edgeMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { ...material.uniforms, surfacePart: { value: 2 } },
    vertexShader: material.vertexShader,
    fragmentShader: material.fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }), [material]);
  const surface = useRef<THREE.Group>(null);
  const fade = useRef({ amount: 0, nearby: false, covered: false });
  const { gl } = useThree();
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => {
    material.dispose();
    edgeMaterial.dispose();
  }, [material, edgeMaterial]);
  useLayoutEffect(() => () => onCover(textureUrl, false), [textureUrl, onCover]);

  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  material.uniforms.mapA.value = prepareTexture(textureA, anisotropy);
  material.uniforms.mapB.value = props.compare ? prepareTexture(textureB, anisotropy) : material.uniforms.mapA.value;
  material.uniforms.useB.value = props.compare ? 1 : 0;
  material.uniforms.compare.value = props.compare ? 1 : 0;
  material.uniforms.split.value = props.split;
  material.uniforms.opacity.value = props.opacity;
  material.uniforms.edgeFeather.value = DETAIL_FEATHER;
  material.uniforms.surfacePart.value = 1;
  material.uniforms.lightDirection.value.copy(sunDirection(props.azimuth, props.altitude));
  material.uniforms.hazeNear.value = HAZE_NEAR;
  material.uniforms.hazeFar.value = HAZE_FAR;
  material.uniforms.hazeStrength.value = HAZE_STRENGTH;
  material.uniforms.night.value = props.night ? 1 : 0;
  material.uniforms.clipOn.value = props.clip ? 1 : 0;
  if (props.clip) {
    material.uniforms.clipRect.value.set(props.clip.minX, props.clip.minZ, props.clip.maxX, props.clip.maxZ);
  }
  material.transparent = true;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;

  useFrame(({ camera, controls, size }, delta) => {
    const target = (controls as { target?: THREE.Vector3 } | null)?.target;
    if (!target || !surface.current) return;
    const state = fade.current;
    const distance = camera.position.distanceTo(target);
    const gap = distanceToRect(target, rect);
    if (props.regional && tiles.length) {
      const useTiles = distance < span * (tileMode.current ? 1.12 : 0.9) && gap < span * 0.3;
      if (useTiles !== tileMode.current) {
        tileMode.current = useTiles;
        setShowTiles(useTiles);
      }
    }
    const threshold = props.regional ? span * (state.nearby ? 2.7 : 2.3) : Math.min(92000, span * (state.nearby ? 5.3 : 4.5));
    state.nearby = distance < threshold
      && gap < span * (state.nearby ? 0.55 : 0.38);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.amount = reduced ? Number(state.nearby) : THREE.MathUtils.clamp(state.amount + (state.nearby ? 1 : -1) * delta / 0.28, 0, 1);
    material.uniforms.surfaceAlpha.value = state.amount * state.amount * (3 - 2 * state.amount);
    material.uniforms.resolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
    surface.current.visible = state.amount > 0;
    const covered = state.amount === 1;
    material.depthTest = covered;
    material.depthWrite = covered;
    if (covered !== state.covered) {
      state.covered = covered;
      onCover(textureUrl, covered);
    }
    if (!props.regional && covered && document.body.dataset.flying !== "true" && document.body.dataset.detail !== "ready") {
      document.body.dataset.detail = "ready";
    }
  });

  return (
    <group ref={surface} scale={[1, props.exaggeration, 1]} dispose={null} visible={false}>
      {(showTiles && tiles.length ? tiles : [geometry]).map((tile) => (
        <group key={tile.id}>
          <mesh geometry={tile} material={edgeMaterial} renderOrder={order} />
          <mesh geometry={tile} material={material} renderOrder={order + 1} />
        </group>
      ))}
    </group>
  );
}

function SitePins(props: {
  sites: SiteFeature[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  regional: TerrainGrid | null;
  detail: TerrainGrid | null;
  origin: [number, number];
  exaggeration: number;
  labels: boolean;
  selectedId: string | null;
  onSelect: (siteId: string) => void;
}) {
  const { metadata, metres } = props;
  const national = useMemo(() => ({ ...metadata, metres }), [metadata, metres]);
  const textures = useMemo(() => ({ filled: paintMarker(true), open: paintMarker(false) }), []);
  useEffect(() => () => {
    textures.filled.dispose();
    textures.open.dispose();
  }, [textures]);
  return (
    <group>
      {props.sites.map((site) => {
        const [longitude, latitude] = site.geometry.coordinates;
        const [east, north] = lonLatToMercator(longitude, latitude);
        const elevation = elevationAt(national, props.regional, props.detail, east, north);
        const [x, z] = toLocal(longitude, latitude, props.origin);
        return <SitePin
          key={site.id}
          site={site}
          position={[x, (elevation - metadata.elevation.min) * props.exaggeration + 18, z]}
          texture={site.properties.confidence === "approximate" ? textures.open : textures.filled}
          labels={props.labels || (Boolean(props.regional) && !props.selectedId && Boolean(metadata.details[site.id]?.rasters["true-colour"]))}
          selected={site.id === props.selectedId}
          onSelect={props.onSelect}
        />;
      })}
    </group>
  );
}

function SitePin(props: {
  site: SiteFeature;
  position: [number, number, number];
  texture: THREE.Texture;
  labels: boolean;
  selected: boolean;
  onSelect: (siteId: string) => void;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = LAYER_STYLE[props.site.properties.layer].color;
  const height = useThree((state) => state.size.height);
  const scale = worldSizeForPixels(1, ATLAS_FOV_DEGREES, height, props.selected || hovered ? 23 : 15);
  const hitSize = worldSizeForPixels(1, ATLAS_FOV_DEGREES, height, 27);
  useFrame(({ camera }) => {
    if (!ring.current) return;
    const [x, y, z] = props.position;
    const distance = Math.hypot(camera.position.x - x, camera.position.y - y, camera.position.z - z);
    ring.current.scale.setScalar(worldSizeForPixels(distance, ATLAS_FOV_DEGREES, height, 20));
  });
  return (
    <group position={props.position}>
      {props.selected ? (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 20, 0]} renderOrder={6}>
          <ringGeometry args={[0.89, 1, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
        </mesh>
      ) : null}
      <sprite
        scale={[hitSize, hitSize, 1]}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 4) props.onSelect(props.site.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <spriteMaterial transparent opacity={0} depthTest={false} depthWrite={false} sizeAttenuation={false} />
      </sprite>
      <sprite scale={[scale, scale, 1]} renderOrder={7}>
        <spriteMaterial map={props.texture} color={color} transparent depthTest={false} depthWrite={false} sizeAttenuation={false} />
      </sprite>
      {hovered || props.selected || props.labels ? (
        <Html center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
          <span className="tip is-shown site-pin-label">{props.site.properties.name}</span>
        </Html>
      ) : null}
    </group>
  );
}

function elevationAt(
  national: TerrainGrid,
  regional: TerrainGrid | null,
  detail: TerrainGrid | null,
  east: number,
  north: number,
): number {
  const grid = detail && boundsContain(detail.bounds, east, north)
    ? detail
    : regional && boundsContain(regional.bounds, east, north) ? regional : national;
  return sampleMeshHeight(grid.metres, grid.width, grid.height, grid.bounds, east, north);
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
  context.arc(32, 32, 23, 0, Math.PI * 2);
  context.lineWidth = 8;
  context.strokeStyle = "#2f302b";
  context.stroke();
  if (filled) {
    context.fillStyle = "#ffffff";
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
