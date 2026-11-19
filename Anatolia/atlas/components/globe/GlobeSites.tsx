"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, type JSX } from "react";
import { cameraAltitude, type GlobeLook } from "@/lib/globe/ellipsoid";
import type { ScreenBox } from "@/lib/globe/labelLayout";
import type { PickedSite, SiteLayer } from "@/lib/globe/siteBlock";
import type { WorldCatalogue } from "@/lib/world/catalogueLoader";
import type { SiteColumns } from "@/lib/world/catalogueTypes";
import type { SiteFilter } from "@/lib/world/siteFilter";
import { pickedSiteFromColumns } from "@/lib/world/sitePick";
import { OSM_MEGALITH_STYLE } from "@/lib/world/siteTypeStyle";
import { GlobeClusterBadges } from "./GlobeClusterBadges";
import { GlobeFeaturedMarkers } from "./GlobeFeaturedMarkers";
import { GlobeSelectionRing } from "./GlobeSelectionRing";
import { GlobeSitePoints } from "./GlobeSitePoints";
import styles from "./GlobeSites.module.css";
import { createSitePointsMaterial, tuneSitePointsMaterial } from "./sitePointsMaterial";
import { useGlobePicking, type SiteHit } from "./useGlobePicking";
import { useSiteLayers } from "./useSiteLayers";

export type { PickedSite } from "@/lib/globe/siteBlock";

/** The ODbL credit for the OpenStreetMap layer, shown in the globe chrome while that layer is on. */
function useOsmCredit(shown: boolean): void {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const host = canvas.parentElement?.parentElement;
    if (!shown || !host) return;
    const credit = document.createElement("p");
    credit.className = styles.osmCredit;
    credit.dataset.role = "osm-megaliths-attribution";
    const link = document.createElement("a");
    link.href = OSM_MEGALITH_STYLE.attributionUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = OSM_MEGALITH_STYLE.attribution;
    credit.append(link);
    host.append(credit);
    return () => credit.remove();
  }, [canvas, shown]);
}

function useCellReport(layers: readonly SiteLayer[], report: ((cells: readonly SiteColumns[]) => void) | undefined): void {
  const cellKeys = layers.map((layer) => layer.block.key).filter((key) => key.startsWith("cell-")).join(" ");
  const latest = useRef(layers);
  latest.current = layers;
  useEffect(() => {
    report?.(latest.current.filter((layer) => layer.block.key.startsWith("cell-")).map((layer) => layer.block.columns));
  }, [cellKeys, report]);
}

/** Every published site on the globe: the point field, featured monuments, count badges, picking. */
export function GlobeSites(props: {
  catalogue: WorldCatalogue;
  filter: SiteFilter;
  look: GlobeLook | null;
  selectedId: string | null;
  /** The sites the picked theory is about. Each wears the ring: it marks a subject, not a find. */
  theorySiteIds?: readonly string[];
  showOsmMegaliths: boolean;
  /** Monument names and count badges; on unless switched off. */
  showLabels?: boolean;
  onPick(site: PickedSite | null): void;
  onClusterPick?(target: GlobeLook): void;
  /** The regional cells drawn right now, reported whenever one arrives or leaves. */
  onCellsChange?(cells: readonly SiteColumns[]): void;
}): JSX.Element {
  const { catalogue, onPick } = props;
  const layers = useSiteLayers(catalogue, props.filter, props.look, props.showOsmMegaliths);
  const material = useMemo(() => createSitePointsMaterial("sites"), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera, viewport }) => {
    tuneSitePointsMaterial(material, "sites", cameraAltitude(camera.position.toArray()), viewport.dpr);
  });
  const pick = useCallback(
    (hit: SiteHit | null) => onPick(hit ? pickedSiteFromColumns(hit.layer.block.columns, hit.row, catalogue.index) : null),
    [onPick, catalogue.index],
  );
  const hovered = useGlobePicking(layers, pick);
  useOsmCredit(layers.some((layer) => layer.block.key === "osm-megaliths"));
  useCellReport(layers, props.onCellsChange);
  const labelBoxes = useRef<ScreenBox[]>([]);
  const showLabels = props.showLabels ?? true;
  const hoveredRow = hovered ? hovered.row * 3 : 0;

  return (
    <group>
      {layers.map((layer) => (
        <GlobeSitePoints key={layer.block.key} block={layer.block} shown={layer.shown} material={material} />
      ))}
      {/* Names first: their frame callback runs first, so the badges keep clear of this frame's names. */}
      <GlobeFeaturedMarkers featured={catalogue.featured} core={layers[0]} siteTypes={catalogue.index.siteTypes} occupied={labelBoxes} showLabels={showLabels} />
      <GlobeClusterBadges layers={layers} onClusterPick={props.onClusterPick} occupied={labelBoxes} shown={showLabels} />
      <GlobeSelectionRing layers={layers} selectedId={props.selectedId} />
      {props.theorySiteIds?.map((siteId) => (siteId === props.selectedId ? null : (
        <GlobeSelectionRing key={siteId} layers={layers} selectedId={siteId} dataRole="theory-site-ring" />
      )))}
      {hovered ? (
        <Html
          position={[
            hovered.layer.block.positions[hoveredRow],
            hovered.layer.block.positions[hoveredRow + 1],
            hovered.layer.block.positions[hoveredRow + 2],
          ]}
          center
          zIndexRange={[6, 6]}
          style={{ pointerEvents: "none" }}
        >
          <span className="tip is-shown" role="tooltip" style={{ transform: "translateY(-22px)" }}>{hovered.layer.block.columns.name[hovered.row]}</span>
        </Html>
      ) : null}
    </group>
  );
}
