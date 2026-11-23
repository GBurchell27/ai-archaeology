"use client";

// Positions the news rings. The marks themselves are ordinary DOM in the chrome, so this
// draws nothing in the scene: one frame walks the handful of rings, never the catalogue.

import { useFrame } from "@react-three/fiber";
import { memo, useMemo } from "react";
import { Vector3, type Camera } from "three";
import { lonLatHeightToScene, type ScenePoint } from "@/lib/globe/ellipsoid";
import { isOnNearSide } from "@/lib/globe/visibleSites";

interface PlacedRing {
  id: string;
  at: ScenePoint;
}

const NO_RINGS: readonly PlacedRing[] = [];
const projected = new Vector3();

export interface NewsRingPin {
  site: { id: string; lon: number; lat: number };
}

/** Keeps each news ring over its site. The chrome owns the elements; this only moves them. */
export const GlobeNewsRings = memo(function GlobeNewsRings(props: {
  pins: readonly NewsRingPin[];
  shown: boolean;
  omitId: string | null;
}) {
  const placed = useMemo(() => placeRings(props.pins, props.shown, props.omitId), [props.pins, props.shown, props.omitId]);
  useFrame(({ camera, size }) => moveRings(placed, camera, size));
  return null;
});

function placeRings(pins: readonly NewsRingPin[], shown: boolean, omitId: string | null): readonly PlacedRing[] {
  if (!shown) return NO_RINGS;
  return pins.flatMap((pin) => (pin.site.id === omitId ? [] : [{
    id: pin.site.id,
    at: lonLatHeightToScene(pin.site.lon, pin.site.lat, 0),
  }]));
}

function moveRings(placed: readonly PlacedRing[], camera: Camera, size: { width: number; height: number }): void {
  const nodes = ringNodes();
  const eye = camera.position;
  for (const pin of placed) {
    const node = nodes.get(pin.id);
    if (!node) continue;
    const spot = ringSpot(pin.at, eye.x, eye.y, eye.z, camera, size);
    node.style.visibility = spot.visible ? "visible" : "hidden";
    if (spot.visible) node.style.transform = `translate(${spot.x}px, ${spot.y}px) translate(-50%, -50%)`;
  }
}

function ringNodes(): Map<string, HTMLElement> {
  const nodes = new Map<string, HTMLElement>();
  for (const node of document.querySelectorAll<HTMLElement>("[data-role='news-site-ring']")) {
    const id = node.dataset.site;
    if (id) nodes.set(id, node);
  }
  return nodes;
}

function ringSpot(
  at: ScenePoint,
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  camera: Camera,
  size: { width: number; height: number },
): { x: number; y: number; visible: boolean } {
  const [x, y, z] = at;
  if (!isOnNearSide(x, y, z, eyeX, eyeY, eyeZ)) return { x: 0, y: 0, visible: false };
  projected.set(x, y, z).project(camera);
  const screenX = (projected.x * 0.5 + 0.5) * size.width;
  const screenY = (-projected.y * 0.5 + 0.5) * size.height;
  const onScreen = Math.abs(projected.z) <= 1 && screenX >= -30 && screenX <= size.width + 30 && screenY >= -30 && screenY <= size.height + 30;
  return { x: screenX, y: screenY, visible: onScreen };
}
