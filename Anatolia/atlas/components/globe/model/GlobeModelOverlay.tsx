"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { WGS84_EQUATORIAL_RADIUS, WGS84_POLAR_RADIUS, cameraAltitude } from "@/lib/globe/ellipsoid";
import { PREDICT_BASE_URL, type PredictLayer } from "@/lib/world/predictIndex";
import { ModelChip } from "./ModelChip";
import chipStyles from "./ModelChip.module.css";
import { configureRasterTexture, createModelOverlayMaterial } from "./modelOverlayMaterial";
import { coarseLayerFade } from "./modelRaster";
import type { ModelLayerViewModel } from "./useModelLayer";

// Below the haze (4) and the site points (6, 7): the sites always draw on top of the layer.
const RENDER_ORDER = 3;
// Fine enough that a flat facet strays from the true surface by under 500 m, a sliver of one cell.
const SHELL_SEGMENTS: [number, number] = [256, 128];
const SHELL_SCALE: [number, number, number] = [WGS84_EQUATORIAL_RADIUS, WGS84_EQUATORIAL_RADIUS, WGS84_POLAR_RADIUS];
const ignoreRaycast = () => null;
const pinToCorner = (): [number, number] => [0, 0];
const keepShown = () => undefined;

/** The layer's raster as a texture; the previous one stays up until the next has loaded. */
function useLayerRaster(file: string): THREE.Texture | null {
  const [raster, setRaster] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(`${PREDICT_BASE_URL}${file}`, (loaded) => {
      if (cancelled) loaded.dispose();
      else setRaster(configureRasterTexture(loaded));
    });
    return () => { cancelled = true; };
  }, [file]);
  useEffect(() => () => raster?.dispose(), [raster]);
  return raster;
}

function ModelShell({ layer, opacity }: { layer: PredictLayer; opacity: number }) {
  const material = useMemo(createModelOverlayMaterial, []);
  const raster = useLayerRaster(layer.file);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const [tooClose, setTooClose] = useState(false);
  const canvas = useThree((state) => state.gl.domElement);
  // A fixed portal target: drei's default changes once pointer events connect, which remounts the chip mid-render.
  const chipHost = useMemo(() => ({ current: canvas.parentElement as HTMLElement }), [canvas]);
  useEffect(() => () => material.dispose(), [material]);

  material.uniforms.raster.value = raster;
  material.uniforms.opacity.value = opacity;
  material.uniforms.pixelRatio.value = pixelRatio;

  useFrame(({ camera }) => {
    const fieldOfView = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45;
    const fade = coarseLayerFade(cameraAltitude(camera.position.toArray()), fieldOfView);
    material.uniforms.fade.value = fade;
    if ((fade < 0.5) !== tooClose) setTooClose(fade < 0.5);
  });

  return (
    <>
      {raster ? (
        <mesh scale={SHELL_SCALE} material={material} renderOrder={RENDER_ORDER} raycast={ignoreRaycast} frustumCulled={false}>
          <sphereGeometry args={[1, ...SHELL_SEGMENTS]} />
        </mesh>
      ) : null}
      {/* Html only carries the chip into the DOM layer: it is pinned to the corner, not to a place. */}
      <Html portal={chipHost} calculatePosition={pinToCorner} onOcclude={keepShown} wrapperClass={chipStyles.anchor} style={{ pointerEvents: "none" }}>
        <ModelChip layer={layer} tooClose={tooClose} />
      </Html>
    </>
  );
}

/**
 * The recording-pattern layer on the globe: an ellipsoid shell coloured by decile rank, plus the
 * chip that names it. Coarse by design: it fades away before single cells could pass for places.
 */
export function GlobeModelOverlay({ model }: { model: ModelLayerViewModel }) {
  if (!model.enabled || !model.layer) return null;
  return <ModelShell layer={model.layer} opacity={model.opacity} />;
}
