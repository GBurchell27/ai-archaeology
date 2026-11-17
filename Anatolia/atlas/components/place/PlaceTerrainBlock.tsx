"use client";

import { Html, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DRAPES, SUN_ALTITUDE_DEGREES, type DrapeId } from "@/lib/place/placeDrape";
import { buildSkirtGeometry } from "@/lib/place/placeSkirt";
import { closeupUrl } from "@/lib/place/placeTerrain";
import { createSurfaceMaterial, prepareTexture, sunDirection } from "@/lib/shade";
import { buildTerrainGeometry, type TerrainGrid } from "@/lib/terrain";
import styles from "./PlaceView.module.css";

export interface PlaceMarker {
  label: string;
  /** Scene x, unscaled height above the datum, scene z. */
  position: [number, number, number];
}

/** The draped relief, the cut walls under it, and the published point. */
export function PlaceTerrainBlock(props: {
  siteId: string;
  grid: TerrainGrid;
  origin: [number, number];
  datum: number;
  verticalScale: number;
  drape: DrapeId;
  sunAzimuth: number;
  marker: PlaceMarker | null;
  onReady: () => void;
}) {
  const { grid, origin, datum, onReady } = props;
  const [satellite, hillshade] = useTexture([closeupUrl(props.siteId, "satellite"), closeupUrl(props.siteId, "hillshade")]);
  const surface = useMemo(() => buildTerrainGeometry(grid, origin, datum, 1), [grid, origin, datum]);
  const skirt = useMemo(() => buildSkirtGeometry(grid, origin, datum), [grid, origin, datum]);
  const material = useMemo(() => createSurfaceMaterial(), []);
  const { gl, invalidate } = useThree();
  useEffect(() => () => surface.dispose(), [surface]);
  useEffect(() => () => skirt.dispose(), [skirt]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(onReady, [onReady]);

  const drape = DRAPES[props.drape];
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const uniforms = material.uniforms;
  uniforms.mapA.value = prepareTexture(drape.part === "satellite" ? satellite : hillshade, anisotropy);
  uniforms.opacity.value = drape.imageShare;
  uniforms.ambient.value = drape.ambient;
  uniforms.hazeStrength.value = 0;
  uniforms.lightDirection.value.copy(sunDirection(props.sunAzimuth, SUN_ALTITUDE_DEGREES));
  // The canvas draws on demand, and uniforms are not React props.
  useEffect(() => invalidate());

  return (
    <group scale={[1, props.verticalScale, 1]}>
      <mesh geometry={surface} material={material} />
      <mesh geometry={skirt}>
        <meshBasicMaterial color="#1d1a16" side={THREE.DoubleSide} />
      </mesh>
      {props.marker ? (
        <Html position={props.marker.position} zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
          <div className={styles.marker}>
            <span className={styles.markerLabel}>{props.marker.label}</span>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
