"use client";

import { Splat } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import type { Vector4, WebGLRenderer } from "three";
import type { WalkSite } from "@/lib/walk/walkSites";
import { photoViewpoints } from "@/lib/walk/walkViewpoints";
import { useSplatFade } from "./useSplatFade";

/**
 * drei's `<Splat>` keeps each file's data for the life of the page, together with the renderer that first loaded it,
 * and goes on reading that renderer (its context, texture table and viewport) for every later `<Splat>` of the file.
 * A walk's canvas is torn down on a change of source and on leaving the walk, so on the next visit that renderer is
 * dead: the splat would never be sorted and never appear. The first renderer of each file is remembered here.
 */
const firstRenderers = new Map<string, WebGLRenderer>();

/**
 * On a later visit, points what drei reads from a file's first renderer at the renderer now drawing.
 * shortcut: covers the four members drei 10's Splat reads from its renderer, look again when drei is upgraded.
 */
function useLiveSplatRenderer(splatUrl: string) {
  const renderer = useThree((state) => state.gl);
  // During render: it must be on record before the `<Splat>` below starts loading with this same renderer.
  if (!firstRenderers.has(splatUrl)) firstRenderers.set(splatUrl, renderer);
  useLayoutEffect(() => {
    const first = firstRenderers.get(splatUrl);
    if (!first || first === renderer) return;
    Object.assign(first, {
      properties: renderer.properties,
      getContext: () => renderer.getContext(),
      getCurrentViewport: (target: Vector4) => renderer.getCurrentViewport(target),
      resetState: () => renderer.resetState(),
    });
  }, [renderer, splatUrl]);
}

/**
 * The splat of one site, levelled and scaled to walk metres, however many times its canvas has been rebuilt.
 * It fades out away from the places its photographs were taken from (`useSplatFade`).
 */
export function SiteSplat({ site }: { site: WalkSite }) {
  useLiveSplatRenderer(site.splatUrl);
  const { position, rotation, scale } = site.alignment;
  const holder = useSplatFade(photoViewpoints(site.id));
  return (
    // drei's `<Splat>` keeps its own ref, so the fade finds the mesh through this group.
    <group ref={holder}>
      <Splat src={site.splatUrl} position={position} rotation={rotation} scale={scale} />
    </group>
  );
}
