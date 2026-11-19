"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  buildCatalogueGeometry,
  cameraDistanceToTarget,
  createCataloguePointsMaterial,
  pickCataloguePin,
  tuneCataloguePointsMaterial,
} from "@/components/atlas/cataloguePoints";
import ringStyles from "@/components/globe/GlobeSites.module.css";
import { placeCatalogue, type CataloguePin } from "@/lib/cataloguePins";
import { ATLAS_FOV_DEGREES } from "@/lib/pinCluster";
import type { AtlasMetadata } from "@/lib/types";
import type { TerrainGrid } from "@/lib/terrain";
import type { WikiFeature } from "@/lib/wikidata";

const NAME_LIMIT = 12;
const NAME_REFRESH_SECONDS = 0.25;

/**
 * The published catalogue on the terrain map, drawn as the globe draws it: every place its own
 * small dot in one draw call. There are no count badges; where places crowd, the dots do.
 */
export function CatalogueMarkers(props: {
  sites: WikiFeature[];
  metadata: AtlasMetadata;
  metres: Float32Array;
  regional: TerrainGrid | null;
  origin: [number, number];
  exaggeration: number;
  labels: boolean;
  selectedId: string | null;
  onOpen: (siteId: string) => void;
}) {
  const pins = useMemo(
    () => placeCatalogue(props.sites, props.metadata, props.metres, props.origin, props.exaggeration, props.regional)
      // Undated places first, so the dated ones are drawn over them.
      .sort((left, right) => Number(right.muted) - Number(left.muted)),
    [props.sites, props.metadata, props.metres, props.origin, props.exaggeration, props.regional],
  );
  const geometry = useMemo(() => buildCatalogueGeometry(pins), [pins]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(() => createCataloguePointsMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera, controls, gl, size }) => {
    tuneCataloguePointsMaterial(material, cameraDistanceToTarget(camera, controls), gl.getPixelRatio(), size.width);
  });
  const viewportHeight = useThree((state) => state.size.height);
  const [hovered, setHovered] = useState<CataloguePin | null>(null);
  const names = useOnScreenNames(pins, props.labels);
  const selected = props.selectedId ? pins.find((pin) => pin.id === props.selectedId) : undefined;
  return (
    <group>
      <points
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={5}
        userData={{ kind: "catalogue-pins" }}
        raycast={function pick(this: THREE.Points, raycaster, intersects) {
          const fov = raycaster.camera instanceof THREE.PerspectiveCamera ? raycaster.camera.fov : ATLAS_FOV_DEGREES;
          const row = pickCataloguePin(pins, raycaster.ray, fov, viewportHeight);
          if (row < 0) return;
          const point = new THREE.Vector3(pins[row].x, pins[row].y, pins[row].z);
          intersects.push({ object: this, index: row, point, distance: point.distanceTo(raycaster.ray.origin) });
        }}
        onClick={(event) => {
          event.stopPropagation();
          const pin = pins[event.index ?? -1];
          if (pin && event.delta <= 4) props.onOpen(pin.id);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          setHovered(pins[event.index ?? -1] ?? null);
        }}
        onPointerOut={() => setHovered(null)}
      />
      {names.map((pin) => <PinName key={pin.id} pin={pin} />)}
      {hovered ? <PinName pin={hovered} /> : null}
      {selected ? (
        <Html position={[selected.x, selected.y, selected.z]} center zIndexRange={[2, 1]} style={{ pointerEvents: "none" }}>
          <span className={ringStyles.ring} data-role="selected-site-ring" />
        </Html>
      ) : null}
    </group>
  );
}

/** With labels on, the places on screen are named once few enough are in view to read. */
function useOnScreenNames(pins: readonly CataloguePin[], labels: boolean): CataloguePin[] {
  const [names, setNames] = useState<CataloguePin[]>([]);
  const refresh = useRef({ due: 0, signature: "" });
  const scratch = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime < refresh.current.due) return;
    refresh.current.due = clock.elapsedTime + NAME_REFRESH_SECONDS;
    const onScreen = labels ? pinsOnScreen(pins, camera, scratch, NAME_LIMIT) : [];
    const signature = onScreen.map((pin) => pin.id).join("|");
    if (signature === refresh.current.signature) return;
    refresh.current.signature = signature;
    setNames(onScreen);
  });
  return names;
}

/** The pins inside the view, or none when there are more than `limit`. */
function pinsOnScreen(pins: readonly CataloguePin[], camera: THREE.Camera, scratch: THREE.Vector3, limit: number): CataloguePin[] {
  const found: CataloguePin[] = [];
  for (const pin of pins) {
    scratch.set(pin.x, pin.y, pin.z).project(camera);
    if (Math.abs(scratch.x) > 1 || Math.abs(scratch.y) > 1 || Math.abs(scratch.z) > 1) continue;
    if (found.length === limit) return [];
    found.push(pin);
  }
  return found;
}

function PinName(props: { pin: CataloguePin }) {
  if (!props.pin.name) return null;
  return (
    <Html position={[props.pin.x, props.pin.y, props.pin.z]} center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
      <span className="tip is-shown" style={{ transform: "translateY(-22px)" }}>{props.pin.name}</span>
    </Html>
  );
}
