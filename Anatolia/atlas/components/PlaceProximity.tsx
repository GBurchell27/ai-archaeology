"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { boundsContain, lonLatToMercator, sampleMeshHeight } from "@/lib/geo";
import type { SiteFeature } from "@/lib/types";
import type { TerrainGrid } from "@/lib/terrain";
import type { WikiFeature } from "@/lib/wikidata";

const ENTER_DISTANCE = 62000;
const EXIT_DISTANCE = 76000;

export function PlaceProximity(props: {
  sites: SiteFeature[];
  catalogue: WikiFeature[];
  national: TerrainGrid;
  regional: TerrainGrid | null;
  origin: [number, number];
  datum: number;
  exaggeration: number;
  enabled: boolean;
  onChange: (id: string | null) => void;
}) {
  const { sites, catalogue, national, regional, origin, datum } = props;
  const points = useMemo(() => [...sites, ...catalogue].flatMap((site) => {
    const [east, north] = lonLatToMercator(...site.geometry.coordinates);
    if (!boundsContain(national.bounds, east, north)) return [];
    const grid = regional && boundsContain(regional.bounds, east, north) ? regional : national;
    const elevation = sampleMeshHeight(grid.metres, grid.width, grid.height, grid.bounds, east, north);
    return [{
      id: site.id,
      x: east - origin[0],
      z: origin[1] - north,
      height: elevation - datum,
      curated: "description" in site.properties,
    }];
  }), [sites, catalogue, national, regional, origin, datum]);
  const current = useRef<string | null>(null);
  const nextCheck = useRef(0);
  const projected = useRef(new THREE.Vector3());

  useFrame(({ camera, controls, clock }) => {
    const target = (controls as { target?: THREE.Vector3 } | null)?.target;
    if (!target || clock.elapsedTime < nextCheck.current) return;
    nextCheck.current = clock.elapsedTime + 0.09;
    const distance = camera.position.distanceTo(target);
    let best: string | null = null;
    let bestScore = Infinity;
    if (props.enabled && document.body.dataset.flying !== "true" && distance < EXIT_DISTANCE) {
      camera.updateMatrixWorld();
      for (const point of points) {
        const retained = point.id === current.current;
        if (!retained && distance > ENTER_DISTANCE) continue;
        const groundDistance = Math.hypot(point.x - target.x, point.z - target.z);
        if (groundDistance > distance * 0.8 + 700) continue;
        const ndc = projected.current.set(point.x, point.height * props.exaggeration, point.z).project(camera);
        const screenDistance = Math.hypot(ndc.x, ndc.y);
        if (ndc.z < -1 || ndc.z > 1 || screenDistance > (retained ? 0.85 : 0.63)) continue;
        const score = screenDistance + 0.25 * groundDistance / (distance + 700)
          + (point.curated ? 0 : 0.14) - (retained ? 0.12 : 0);
        if (score < bestScore) {
          best = point.id;
          bestScore = score;
        }
      }
    }
    if (best !== current.current) {
      current.current = best;
      props.onChange(best);
    }
  });
  return null;
}
