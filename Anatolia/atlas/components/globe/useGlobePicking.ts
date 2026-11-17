"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { intersectRayWithEllipsoid, sceneToLonLatHeight } from "@/lib/globe/ellipsoid";
import type { SiteLayer } from "@/lib/globe/siteBlock";
import { nearestSite } from "@/lib/globe/siteGrid";

export interface SiteHit {
  layer: SiteLayer;
  row: number;
}

const PICK_RADIUS_PX = { mouse: 9, touch: 20 };
/** A featured monument wins over an ordinary neighbour unless that one is much closer. */
const FEATURED_PREFERENCE = 0.45;
const CLICK_SLOP_PX = 5;
const HOVER_INTERVAL_MS = 50;
const METRES_PER_DEGREE = 111_320;
const MAX_REACH_DEGREES = 4;

/**
 * The shown site nearest a canvas pixel, within a pixel tolerance, or null.
 * shortcut: the tolerance is measured on the ground, so it shrinks toward the limb where the
 * surface is foreshortened; project candidates to the screen if picking there matters.
 */
function siteAtPixel(
  layers: readonly SiteLayer[],
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): SiteHit | null {
  const bounds = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(pointer, camera);
  const ground = intersectRayWithEllipsoid(ray.ray.origin.toArray(), ray.ray.direction.toArray());
  if (!ground) return null;
  const fieldOfView = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45;
  const metresPerPixel = camera.position.distanceTo(new THREE.Vector3(...ground))
    * 2 * Math.tan(THREE.MathUtils.degToRad(fieldOfView) / 2) / bounds.height;
  const radiusPx = event.pointerType === "mouse" ? PICK_RADIUS_PX.mouse : PICK_RADIUS_PX.touch;
  const reach = Math.min(MAX_REACH_DEGREES, radiusPx * metresPerPixel / METRES_PER_DEGREE);
  const place = sceneToLonLatHeight(ground);
  let best: (SiteHit & { degrees: number }) | null = null;
  for (const layer of layers) {
    const { columns, grid } = layer.block;
    const found = nearestSite(grid, columns.lon, columns.lat, place.longitude, place.latitude, reach,
      (row) => (layer.shown[row] ? (columns.featured[row] ? FEATURED_PREFERENCE : 1) : 0));
    if (found && (!best || found.degrees < best.degrees)) best = { layer, row: found.row, degrees: found.degrees };
  }
  return best;
}

/**
 * Pointer picking on the globe canvas: a press and release in place is a click (a drag is not),
 * and a resting mouse reports the site under it for the tooltip and the pointer cursor.
 */
export function useGlobePicking(layers: readonly SiteLayer[], onClick: (hit: SiteHit | null) => void): SiteHit | null {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const [hovered, setHovered] = useState<SiteHit | null>(null);
  const latest = useRef({ layers, onClick });
  latest.current = { layers, onClick };

  // Layers change with the filter; a hover on a row that may now be hidden is dropped.
  useEffect(() => setHovered(null), [layers]);

  useEffect(() => {
    let press: { x: number; y: number } | null = null;
    let hoverDue = 0;
    const hoverAt = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.buttons !== 0 || performance.now() < hoverDue) return;
      hoverDue = performance.now() + HOVER_INTERVAL_MS;
      const hit = siteAtPixel(latest.current.layers, camera, canvas, event);
      canvas.style.cursor = hit ? "pointer" : "";
      setHovered((previous) => (previous?.layer === hit?.layer && previous?.row === hit?.row ? previous : hit));
    };
    const pressAt = (event: PointerEvent) => {
      press = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
    };
    const releaseAt = (event: PointerEvent) => {
      const moved = press ? Math.hypot(event.clientX - press.x, event.clientY - press.y) : Infinity;
      press = null;
      if (moved <= CLICK_SLOP_PX) latest.current.onClick(siteAtPixel(latest.current.layers, camera, canvas, event));
    };
    const leave = () => {
      canvas.style.cursor = "";
      setHovered(null);
    };
    canvas.addEventListener("pointermove", hoverAt);
    canvas.addEventListener("pointerdown", pressAt);
    canvas.addEventListener("pointerup", releaseAt);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      canvas.removeEventListener("pointermove", hoverAt);
      canvas.removeEventListener("pointerdown", pressAt);
      canvas.removeEventListener("pointerup", releaseAt);
      canvas.removeEventListener("pointerleave", leave);
      canvas.style.cursor = "";
    };
  }, [camera, canvas]);

  return hovered;
}
