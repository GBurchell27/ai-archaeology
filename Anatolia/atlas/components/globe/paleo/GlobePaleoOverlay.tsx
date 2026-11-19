"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { WGS84_EQUATORIAL_RADIUS, WGS84_POLAR_RADIUS, cameraAltitude } from "@/lib/globe/ellipsoid";
import { PALEO_BASE_URL, PALEO_CLASS } from "@/lib/world/paleoIndex";
import { configureRasterTexture, createModelOverlayMaterial } from "../model/modelOverlayMaterial";
import { hexToRgb } from "../model/modelRamp";
import { coarseLayerFade } from "../model/modelRaster";
import { PALEO_EXPOSED_LAND_COLOR, PALEO_ICE_COLOR, PALEO_OPACITY } from "./paleoStyle";
import type { PaleoLayerViewModel } from "./usePaleoLayer";

// Under the recording-pattern layer (3), the haze (4) and the site points (6, 7).
const RENDER_ORDER = 2;
const SHELL_SEGMENTS: [number, number] = [256, 128];
const SHELL_SCALE: [number, number, number] = [WGS84_EQUATORIAL_RADIUS, WGS84_EQUATORIAL_RADIUS, WGS84_POLAR_RADIUS];
const ignoreRaycast = () => null;

/**
 * The class-raster material of the recording-pattern layer with two of its ten colours set: the rasters
 * share its grid and its rule (0 and 11–254 are not drawn), so the shader and its surface test are reused.
 */
function createPaleoMaterial(): THREE.ShaderMaterial {
  const material = createModelOverlayMaterial();
  const colors = material.uniforms.ramp.value as THREE.Vector3[];
  colors[PALEO_CLASS.exposedLand - 1].set(...hexToRgb(PALEO_EXPOSED_LAND_COLOR));
  colors[PALEO_CLASS.ice - 1].set(...hexToRgb(PALEO_ICE_COLOR));
  material.uniforms.opacity.value = PALEO_OPACITY;
  return material;
}

/** One step's raster as a texture; the previous step stays up until the next has loaded. */
function useStepRaster(file: string): THREE.Texture | null {
  const [raster, setRaster] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(`${PALEO_BASE_URL}${file}`, (loaded) => {
      if (cancelled) loaded.dispose();
      else setRaster(configureRasterTexture(loaded));
    });
    return () => { cancelled = true; };
  }, [file]);
  useEffect(() => () => raster?.dispose(), [raster]);
  return raster;
}

function PaleoShell({ file, onTooClose }: { file: string; onTooClose(tooClose: boolean): void }) {
  const material = useMemo(createPaleoMaterial, []);
  const raster = useStepRaster(file);
  const shown = useMemo(() => ({ tooClose: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => onTooClose(false), [onTooClose]);
  material.uniforms.raster.value = raster;

  useFrame(({ camera }) => {
    const fieldOfView = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45;
    const fade = coarseLayerFade(cameraAltitude(camera.position.toArray()), fieldOfView);
    material.uniforms.fade.value = fade;
    if ((fade < 0.5) === shown.tooClose) return;
    shown.tooClose = fade < 0.5;
    onTooClose(shown.tooClose);
  });

  if (!raster) return null;
  return (
    <mesh scale={SHELL_SCALE} material={material} renderOrder={RENDER_ORDER} raycast={ignoreRaycast} frustumCulled={false}>
      <sphereGeometry args={[1, ...SHELL_SEGMENTS]} />
    </mesh>
  );
}

/**
 * The ice and sea level layer on the globe: one ellipsoid shell, one texture, swapped when the step changes.
 * Coarse by design: it fades away before single cells could pass for a shore.
 */
export function GlobePaleoOverlay({ paleo }: { paleo: PaleoLayerViewModel }) {
  if (!paleo.enabled || !paleo.step) return null;
  return <PaleoShell file={paleo.step.file} onTooClose={paleo.setTooClose} />;
}
