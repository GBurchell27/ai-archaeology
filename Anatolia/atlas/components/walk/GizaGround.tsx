"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { SRGBColorSpace } from "three";
import { walkHeightGrid, type GizaTerrain } from "@/lib/walk/gizaTerrain";
import { buildTerrainGeometry } from "@/lib/terrain";

const DRAPE_URL = "/walk/giza/drape.jpg";

/** The plateau under the pyramids: the height mesh with one Sentinel-2 drape. */
export function GizaGround({ terrain }: { terrain: GizaTerrain }) {
  const drape = useTexture(DRAPE_URL);
  const geometry = useMemo(() => buildTerrainGeometry(walkHeightGrid(terrain), [0, 0], 0, 1), [terrain]);
  useEffect(() => {
    drape.colorSpace = SRGBColorSpace;
    drape.anisotropy = 8;
  }, [drape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={drape} roughness={1} metalness={0} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
  );
}
