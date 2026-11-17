"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { lonLatHeightToScene, type ScenePoint } from "@/lib/globe/ellipsoid";
import type { SiteLayer } from "@/lib/globe/siteBlock";
import { isOnNearSide } from "@/lib/globe/visibleSites";
import { loadSiteDetail } from "@/lib/world/catalogueLoader";
import styles from "./GlobeSites.module.css";

function positionInLayers(layers: readonly SiteLayer[], siteId: string): ScenePoint | null {
  for (const { block } of layers) {
    const row = block.columns.id.indexOf(siteId);
    if (row >= 0) return lonLatHeightToScene(block.columns.lon[row], block.columns.lat[row], 0);
  }
  return null;
}

/** Where the selected site is: from the loaded blocks, else from its detail file (a site in an unloaded cell). */
function useSitePosition(layers: readonly SiteLayer[], siteId: string | null): ScenePoint | null {
  const [position, setPosition] = useState<{ siteId: string; point: ScenePoint } | null>(null);
  useEffect(() => {
    if (!siteId || position?.siteId === siteId) return;
    const loaded = positionInLayers(layers, siteId);
    if (loaded) {
      setPosition({ siteId, point: loaded });
      return;
    }
    let live = true;
    loadSiteDetail(siteId).then((detail) => {
      if (live && detail) setPosition({ siteId, point: lonLatHeightToScene(detail.lon, detail.lat, 0) });
    });
    return () => { live = false; };
  }, [layers, siteId, position]);
  return siteId && position?.siteId === siteId ? position.point : null;
}

/** A ring around the selected site. The pulse is CSS, so reduced-motion users get a still ring. */
export function GlobeSelectionRing(props: { layers: readonly SiteLayer[]; selectedId: string | null }) {
  const point = useSitePosition(props.layers, props.selectedId);
  const ring = useRef<HTMLSpanElement>(null);
  useFrame(({ camera }) => {
    if (!ring.current || !point) return;
    const eye = camera.position;
    ring.current.style.visibility = isOnNearSide(point[0], point[1], point[2], eye.x, eye.y, eye.z) ? "visible" : "hidden";
  });
  if (!point) return null;
  return (
    <Html position={point} center zIndexRange={[2, 1]} style={{ pointerEvents: "none" }}>
      <span ref={ring} className={styles.ring} data-role="selected-site-ring" />
    </Html>
  );
}
