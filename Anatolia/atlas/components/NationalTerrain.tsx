"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ClipRect } from "@/lib/geo";
import {
  dprForIndex,
  initialQuality,
  initialTerrainCoarse,
  meanFrameMs,
  nextQuality,
  nextBeyondOffMs,
  nextTerrainCoarse,
  QUALITY_SAMPLE_COUNT,
  tileReleaseDue,
  type QualityState,
} from "@/lib/renderQuality";
import { createSurfaceMaterial, prepareTexture, sunDirection } from "@/lib/shade";
import { HAZE_FAR, HAZE_NEAR, HAZE_STRENGTH } from "@/lib/sky";
import { coarseTerrainGeometry, terrainTiles, type TerrainGrid } from "@/lib/terrain";
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
  regionClip: ClipRect | null;
  background: THREE.Texture;
}

interface TerrainView {
  coarse: boolean;
  fastShade: boolean;
  keepTiles: boolean;
}

export function NationalTerrain(props: NationalTerrainProps) {
  const view = useAdaptiveTerrain();
  const geometries = useTerrainGeometries(props, view.keepTiles);
  const coarse = view.coarse || geometries.tiles.length === 0;
  const material = useMemo(() => createSurfaceMaterial(), []);
  const { size, gl } = useThree();
  useEffect(() => () => material.dispose(), [material]);
  const texture = useNationalTexture(props.metadata, props.baseMap);
  applyNationalMaterial(material, texture, props, view.fastShade, size, gl);
  return (
    <group scale={[1, props.exaggeration, 1]}>
      <mesh geometry={geometries.coarse} material={material} visible={coarse} />
      {geometries.tiles.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={material} visible={!coarse} />
      ))}
    </group>
  );
}

function useTerrainGeometries(props: NationalTerrainProps, keepTiles: boolean) {
  const grid = useMemo(
    () => ({ ...props.metadata, metres: props.metres }),
    [props.metadata, props.metres],
  );
  const coarse = useMemo(
    () => coarseTerrainGeometry(grid, props.origin, props.metadata.elevation.min, 1),
    [grid, props.origin, props.metadata.elevation.min],
  );
  const tiles = useTerrainTiles(grid, props.origin, props.metadata.elevation.min, keepTiles);
  useEffect(() => () => coarse.dispose(), [coarse]);
  return { coarse, tiles };
}

export function useTerrainTiles(grid: TerrainGrid, origin: [number, number], datum: number, keepTiles: boolean) {
  const [tiles, setTiles] = useState<THREE.BufferGeometry[]>([]);
  useEffect(() => {
    if (!keepTiles) {
      setTiles([]);
      return;
    }
    const pending = terrainTiles(grid, origin, datum, 1);
    const built: THREE.BufferGeometry[] = [];
    let frame: number;
    function buildBatch() {
      const until = performance.now() + 3;
      do {
        const result = pending.next();
        if (result.done) {
          setTiles(built);
          return;
        }
        built.push(result.value);
      } while (performance.now() < until);
      frame = requestAnimationFrame(buildBatch);
    }
    frame = requestAnimationFrame(buildBatch);
    return () => {
      cancelAnimationFrame(frame);
      pending.return(undefined);
      for (const tile of built) tile.dispose();
    };
  }, [keepTiles, grid, origin, datum]);
  return tiles;
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
  const quality = useRef<QualityState>(initialQuality());
  const samples = useRef<number[]>([]);
  const recovery = useRef(0);
  const [view, setView] = useState<TerrainView>({ coarse: true, fastShade: false, keepTiles: false });
  const current = useRef(view);
  const beyondOffMs = useRef(0);
  const terrainChosen = useRef(false);
  useFrame((state, delta) => {
    const target = (state.controls as { target?: THREE.Vector3 } | null)?.target;
    if (!target) return;
    const distance = state.camera.position.distanceTo(target);
    const previous = current.current;
    const coarse = terrainChosen.current
      ? nextTerrainCoarse(previous.coarse, distance, 0, false)
      : initialTerrainCoarse(distance);
    terrainChosen.current = true;
    const elapsed = Math.min(delta * 1000, 100);
    beyondOffMs.current = nextBeyondOffMs(distance, beyondOffMs.current, elapsed);
    const keepTiles = distance < 235000 || (previous.keepTiles && !tileReleaseDue(distance, beyondOffMs.current));

    samples.current.push(elapsed);
    if (samples.current.length >= QUALITY_SAMPLE_COUNT) {
      const mean = meanFrameMs(samples.current);
      samples.current = [];
      const next = nextQuality(quality.current, mean);
      const down = next.dprIndex > quality.current.dprIndex || (next.fastShade && !quality.current.fastShade);
      if (down || state.clock.elapsedTime > recovery.current) {
        if (next.dprIndex !== quality.current.dprIndex) {
          setDpr(dprForIndex(next.dprIndex));
          document.body.dataset.dpr = String(dprForIndex(next.dprIndex));
        }
        if (down) recovery.current = state.clock.elapsedTime + 4;
        quality.current = next;
      }
    }
    const fastShade = quality.current.fastShade;
    if (coarse !== previous.coarse || keepTiles !== previous.keepTiles || fastShade !== previous.fastShade) {
      current.current = { coarse, keepTiles, fastShade };
      setView(current.current);
      document.body.dataset.terrain = coarse ? "coarse" : "tiles";
      document.body.dataset.fastShade = fastShade ? "on" : "off";
    }
  });
  return view;
}

function applyNationalMaterial(
  material: THREE.ShaderMaterial,
  texture: THREE.Texture,
  props: NationalTerrainProps,
  fastShade: boolean,
  size: { width: number; height: number },
  gl: THREE.WebGLRenderer,
): void {
  material.uniforms.mapA.value = prepareTexture(texture, Math.min(8, gl.capabilities.getMaxAnisotropy()));
  material.uniforms.mapB.value = material.uniforms.mapA.value;
  material.uniforms.backdrop.value = props.background;
  material.uniforms.mapEdge.value = 0.045;
  material.uniforms.mapWater.value = props.baseMap === "hypsometric" ? 1 : 0;
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
  material.uniforms.regionClipOn.value = props.regionClip ? 1 : 0;
  if (props.clip) {
    material.uniforms.clipRect.value.set(props.clip.minX, props.clip.minZ, props.clip.maxX, props.clip.maxZ);
  }
  if (props.regionClip) {
    const { minX, minZ, maxX, maxZ } = props.regionClip;
    material.uniforms.regionClipRect.value.set(minX, minZ, maxX, maxZ);
  }
}

function asset(path: string): string {
  return `/terrain/${path}`;
}
