"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { PointsBlock } from "@/lib/globe/siteBlock";

/**
 * One block of sites as a single THREE.Points draw call. The filter arrives as the `shown`
 * attribute, so moving the timeline replaces one byte per point and never rebuilds geometry.
 */
export function GlobeSitePoints(props: {
  block: PointsBlock;
  /** 1 = drawn, per row. */
  shown: Uint8Array;
  material: THREE.ShaderMaterial;
  /** Per-row 0/1 for the featured material's hollow style. */
  quiet?: Float32Array;
  renderOrder?: number;
}) {
  const { block, shown, quiet } = props;
  const geometry = useMemo(() => {
    const built = new THREE.BufferGeometry();
    built.setAttribute("position", new THREE.BufferAttribute(block.positions, 3));
    built.setAttribute("tint", new THREE.BufferAttribute(block.tints, 3, true));
    built.setAttribute("size", new THREE.BufferAttribute(block.sizes, 1));
    built.setAttribute("shown", new THREE.BufferAttribute(new Uint8Array(block.sizes.length), 1));
    if (quiet) built.setAttribute("quiet", new THREE.BufferAttribute(quiet, 1));
    return built;
  }, [block, quiet]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    // Same GPU buffer every time: a timeline drag re-uploads bytes, it does not allocate.
    const attribute = geometry.getAttribute("shown") as THREE.BufferAttribute;
    (attribute.array as Uint8Array).set(shown);
    attribute.needsUpdate = true;
  }, [geometry, shown]);

  // The shader culls by horizon; a bounding sphere for the whole planet would cull nothing.
  return (
    <points
      geometry={geometry}
      material={props.material}
      frustumCulled={false}
      renderOrder={props.renderOrder ?? 6}
      userData={{ kind: "globe-sites", block: block.key }}
    />
  );
}
