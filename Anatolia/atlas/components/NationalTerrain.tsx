"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { ClipRect } from "@/lib/geo";
import {
  DPR_STEPS,
  dprForIndex,
  initialQuality,
  meanFrameMs,
  nextQuality,
  nextTerrainCoarse,
  QUALITY_SAMPLE_COUNT,
  type QualityState,
} from "@/lib/renderQuality";
import { createSurfaceMaterial, prepareTexture, sunDirection } from "@/lib/shade";
import { HAZE_FAR, HAZE_NEAR, HAZE_STRENGTH } from "@/lib/sky";
import { coarseTerrainGeometry, sliceTerrainTiles, type TerrainGrid } from "@/lib/terrain";
import type { AtlasMetadata, BaseMap } from "@/lib/types";

interface NationalTerrainProps {
  metadata: AtlasMetadata;
  metres: Float32Array;
  origin: [number, number];
  baseMap: BaseMap;
  exaggeration: number;
  azimuth: number;
  altitude: number;
  night: boolean;
  clip: ClipRect | null;
}

interface TerrainView {
  coarse: boolean;
  fastShade: boolean;
}

export function NationalTerrain(props: NationalTerrainProps) {
  const view = useAdaptiveTerrain();
  const geometries = useTerrainGeometries(props, view.coarse);
  const material = useMemo(() => createSurfaceMaterial(), []);
  const { size, gl } = useThree();
  useEffect(() => () => material.dispose(), [material]);
  const texture = useNationalTexture(props.metadata, props.baseMap);
  applyNationalMaterial(material, texture, props, view.fastShade, size, gl);
  return (
    <group>
      <mesh geometry={geometries.coarse} material={material} visible={view.coarse} />
      {geometries.tiles.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={material} visible={!view.coarse} />
      ))}
    </group>
  );
}

function useTerrainGeometries(props: NationalTerrainProps, coarseView: boolean) {
  const grid = useMemo(
    () => ({ ...props.metadata, metres: props.metres }),
    [props.metadata, props.metres],
  );
  const coarse = useMemo(
    () => coarseTerrainGeometry(grid, props.origin, props.metadata.elevation.min, props.exaggeration),
    [grid, props.origin, props.metadata.elevation.min, props.exaggeration],
  );
  const tiles = useLazyTiles(grid, props.origin, props.metadata.elevation.min, props.exaggeration, coarseView);
  useEffect(() => () => coarse.dispose(), [coarse]);
  return { coarse, tiles };
}

function useLazyTiles(
  grid: TerrainGrid,
  origin: [number, number],
  datum: number,
  exaggeration: number,
  coarseView: boolean,
) {
  const generation = `${exaggeration}:${grid.width}:${grid.height}`;
  const cache = useRef<{ generation: string; tiles: THREE.BufferGeometry[] } | null>(null);
  const [tiles, setTiles] = useState<THREE.BufferGeometry[]>([]);
  useEffect(() => {
    if (coarseView) return undefined;
    if (cache.current?.generation === generation) return undefined;
    if (cache.current) disposeTiles(cache.current.tiles);
    const built = sliceTerrainTiles(grid, origin, datum, exaggeration);
    cache.current = { generation, tiles: built };
    setTiles(built);
    return undefined;
  }, [coarseView, generation, grid, origin, datum, exaggeration]);
  useEffect(() => () => {
    if (!cache.current) return;
    disposeTiles(cache.current.tiles);
    cache.current = null;
  }, []);
  return tiles;
}

function disposeTiles(tiles: THREE.BufferGeometry[]): void {
  for (const tile of tiles) tile.dispose();
}

function useNationalTexture(metadata: AtlasMetadata, baseMap: BaseMap): THREE.Texture {
  const relief = useTexture(asset(metadata.rasters.relief));
  const hypsometric = useTexture(asset(metadata.rasters.hypsometric));
  const satellite = useTexture(asset(metadata.rasters.satellite));
  if (baseMap === "satellite") return satellite;
  if (baseMap === "hypsometric") return hypsometric;
  return relief;
}

function useAdaptiveTerrain(): TerrainView {
  const setDpr = useThree((state) => state.setDpr);
  const quality = useRef(initialQuality());
  const coarse = useRef(true);
  const samples = useRef<number[]>([]);
  const [view, setView] = useState<TerrainView>({ coarse: true, fastShade: false });
  useFrame((state, delta) => {
    samples.current.push(delta * 1000);
    if (samples.current.length < QUALITY_SAMPLE_COUNT) return;
    const mean = meanFrameMs(samples.current);
    samples.current = [];
    publishQuality(setDpr, quality, coarse, mean, cameraDistance(state), view, setView);
  });
  return view;
}

function cameraDistance(state: { camera: THREE.Camera; controls: unknown }): number {
  const target = (state.controls as { target?: THREE.Vector3 } | null)?.target;
  if (!target) return state.camera.position.length();
  return state.camera.position.distanceTo(target);
}

function publishQuality(
  setDpr: (dpr: number) => void,
  quality: MutableRefObject<QualityState>,
  coarse: MutableRefObject<boolean>,
  mean: number,
  distance: number,
  view: TerrainView,
  setView: (next: TerrainView) => void,
): void {
  const next = nextQuality(quality.current, mean);
  const atFloor = next.dprIndex >= DPR_STEPS.length - 1;
  const useCoarse = nextTerrainCoarse(coarse.current, distance, mean, atFloor);
  const dprChanged = next.dprIndex !== quality.current.dprIndex;
  const viewChanged = useCoarse !== view.coarse || next.fastShade !== view.fastShade;
  quality.current = next;
  coarse.current = useCoarse;
  if (dprChanged) setDpr(dprForIndex(next.dprIndex));
  if (viewChanged) setView({ coarse: useCoarse, fastShade: next.fastShade });
  document.body.dataset.dpr = String(dprForIndex(next.dprIndex));
  document.body.dataset.terrain = useCoarse ? "coarse" : "tiles";
  document.body.dataset.fastShade = next.fastShade ? "on" : "off";
}

function applyNationalMaterial(
  material: THREE.ShaderMaterial,
  texture: THREE.Texture,
  props: NationalTerrainProps,
  fastShade: boolean,
  size: { width: number; height: number },
  gl: THREE.WebGLRenderer,
): void {
  material.uniforms.mapA.value = prepareTexture(texture);
  material.uniforms.mapB.value = material.uniforms.mapA.value;
  material.uniforms.useB.value = 0;
  material.uniforms.compare.value = 0;
  material.uniforms.lightDirection.value.copy(sunDirection(props.azimuth, props.altitude));
  const pixels = gl.getPixelRatio();
  material.uniforms.resolution.value.set(size.width * pixels, size.height * pixels);
  material.uniforms.hazeNear.value = HAZE_NEAR;
  material.uniforms.hazeFar.value = HAZE_FAR;
  material.uniforms.hazeStrength.value = HAZE_STRENGTH;
  material.uniforms.opacity.value = 1;
  material.uniforms.night.value = props.night ? 1 : 0;
  material.uniforms.fastShade.value = fastShade ? 1 : 0;
  material.uniforms.clipOn.value = props.clip ? 1 : 0;
  if (props.clip) {
    material.uniforms.clipRect.value.set(props.clip.minX, props.clip.minZ, props.clip.maxX, props.clip.maxZ);
  }
}

function asset(path: string): string {
  return `/terrain/${path}`;
}
