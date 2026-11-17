"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { lonLatHeightToScene } from "@/lib/globe/ellipsoid";
import { placeLabels, type PlacedLabel, type ScreenBox } from "@/lib/globe/labelLayout";
import { hexToBytes, type PointsBlock, type SiteLayer } from "@/lib/globe/siteBlock";
import { projectVisiblePins } from "@/lib/globe/visibleSites";
import type { ScreenPin } from "@/lib/pinCluster";
import type { FeaturedSite } from "@/lib/world/catalogueTypes";
import { siteTypeStyle } from "@/lib/world/siteTypeStyle";
import { GlobeSitePoints } from "./GlobeSitePoints";
import styles from "./GlobeSites.module.css";
import { createSitePointsMaterial, orbitFraction, tuneSitePointsMaterial } from "./sitePointsMaterial";

interface FeaturedPin extends ScreenPin {
  status: FeaturedSite["status"];
  /** Row in the core block, which carries the filter result. */
  coreRow: number;
  /** 0 = most important. */
  rank: number;
}

const QUIET_STYLE: Record<Exclude<FeaturedSite["status"], "accepted">, { color: string; size: number; note: string }> = {
  contested: { color: "#d6c7ab", size: 0.82, note: "contested" },
  "natural-or-pseudo": { color: "#9aa3b0", size: 0.7, note: "natural or pseudo" },
};
const MAJOR_LABELS = 10;
const RELAYOUT_MS = 100;

/** Featured monuments ordered by importance (then by the curated list order), with their draw arrays. */
function buildFeaturedMarkers(featured: FeaturedSite[], core: SiteLayer["block"], siteTypes: string[]) {
  const coreRows = new Map(core.columns.id.map((id, row) => [id, row]));
  // shortcut: a featured site missing from core.json is not drawn; the catalogue contract puts all of them there.
  const listed = featured.flatMap((site) => {
    const coreRow = coreRows.get(site.id);
    return coreRow === undefined ? [] : [{ site, coreRow, importance: core.columns.importance[coreRow] ?? 0 }];
  });
  listed.sort((left, right) => right.importance - left.importance); // stable: ties keep the curated order
  const block: PointsBlock = {
    key: "featured",
    positions: new Float32Array(listed.length * 3),
    tints: new Uint8Array(listed.length * 3),
    sizes: new Float32Array(listed.length),
  };
  const quiet = new Float32Array(listed.length);
  const pins = listed.map(({ site, coreRow }, rank): FeaturedPin => {
    const [x, y, z] = lonLatHeightToScene(site.lon, site.lat, 0);
    const quietStyle = site.status === "accepted" ? null : QUIET_STYLE[site.status];
    block.positions.set([x, y, z], rank * 3);
    block.tints.set(hexToBytes(quietStyle?.color ?? siteTypeStyle(siteTypes[core.columns.type[coreRow]]).color), rank * 3);
    block.sizes[rank] = quietStyle?.size ?? 1;
    quiet[rank] = quietStyle ? 1 : 0;
    return {
      id: site.id, name: site.name, x, y, z, longitude: site.lon, latitude: site.lat,
      screenX: 0, screenY: 0, visible: false, status: site.status, coreRow, rank,
    };
  });
  return { block, quiet, pins };
}

/** More names as the camera comes down: a handful from orbit, dozens over a region. */
function labelLimit(altitude: number): number {
  return Math.round(THREE.MathUtils.lerp(40, 7, orbitFraction(altitude) ** 0.8));
}

/** The featured monuments: glowing markers (hollow and quiet when contested) and serif names. */
export function GlobeFeaturedMarkers(props: {
  featured: FeaturedSite[];
  /** The core layer; featured sites follow its filter result. */
  core: SiteLayer;
  siteTypes: string[];
  /** Screen boxes the labels must keep clear of (the count badges). */
  occupied: RefObject<ScreenBox[]>;
}) {
  const { featured, core, siteTypes, occupied } = props;
  const markers = useMemo(() => buildFeaturedMarkers(featured, core.block, siteTypes), [featured, core.block, siteTypes]);
  const shown = useMemo(() => Uint8Array.from(markers.pins, (pin) => core.shown[pin.coreRow]), [markers, core.shown]);
  const shownPins = useMemo(() => markers.pins.filter((pin) => core.shown[pin.coreRow] === 1), [markers, core.shown]);
  const material = useMemo(() => createSitePointsMaterial("featured"), []);
  useEffect(() => () => material.dispose(), [material]);
  const [labels, setLabels] = useState<PlacedLabel<FeaturedPin>[]>([]);
  const layout = useRef({ due: 0, signature: "", pins: shownPins });

  useFrame(({ camera, size, viewport }) => {
    const altitude = camera.position.length() - 6_371_000;
    tuneSitePointsMaterial(material, "featured", altitude, viewport.dpr);
    const now = performance.now();
    if (now < layout.current.due && layout.current.pins === shownPins) return;
    layout.current.due = now + RELAYOUT_MS;
    layout.current.pins = shownPins;
    const placed = placeLabels(projectVisiblePins(shownPins, camera, size, shownPins.length), labelLimit(altitude), size, occupied.current ?? []);
    const signature = placed.map((label) => `${label.anchor.id}${label.side}`).join("|");
    if (signature === layout.current.signature) return;
    layout.current.signature = signature;
    setLabels(placed);
  });

  return (
    <group>
      <GlobeSitePoints block={markers.block} shown={shown} material={material} quiet={markers.quiet} renderOrder={7} />
      {labels.map(({ anchor, side }) => (
        <Html key={anchor.id} position={[anchor.x, anchor.y, anchor.z]} zIndexRange={[3, 0]} style={{ pointerEvents: "none" }}>
          <span
            className={[
              styles.label,
              side === "left" ? styles.labelLeft : "",
              anchor.status !== "accepted" ? styles.labelQuiet : anchor.rank < MAJOR_LABELS ? styles.labelMajor : "",
            ].join(" ")}
            data-role="featured-label"
          >
            {anchor.name}
            {anchor.status !== "accepted" ? <span className={styles.labelStatus}>{QUIET_STYLE[anchor.status].note}</span> : null}
          </span>
        </Html>
      ))}
    </group>
  );
}
