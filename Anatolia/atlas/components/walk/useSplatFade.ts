"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { Group, Mesh, ShaderMaterial } from "three";
import { splatOpacityAt, type PhotoViewpoint } from "@/lib/walk/photoViewpoints";

const FADE_UNIFORM = "walkFade";
/** The line of drei's splat fragment shader that sets a splat's opacity. */
const DREI_OPACITY_LINE = "float B = exp(A) * vColor.a;";

/**
 * Fades the splat inside the returned group as the camera leaves the places its photographs were taken from, so
 * what the trainer guessed does not show as streaks. One number for the whole splat, set each frame from the
 * nearest of a few dozen viewpoints; nothing loops over the splats. The fade follows position alone, so nothing
 * animates on its own.
 * shortcut: patches one line of drei 10's splat shader; if an upgrade rewords it nothing fades, look again then.
 */
export function useSplatFade(viewpoints: readonly PhotoViewpoint[]) {
  const holder = useRef<Group>(null);
  const fade = useMemo(() => ({ value: 1 }), []);
  useLayoutEffect(() => {
    const material = (holder.current?.children[0] as Mesh | undefined)?.material as ShaderMaterial | undefined;
    if (!material || material.uniforms[FADE_UNIFORM]) return;
    material.uniforms[FADE_UNIFORM] = fade;
    material.fragmentShader = `uniform float ${FADE_UNIFORM};\n${material.fragmentShader.replace(DREI_OPACITY_LINE, `float B = exp(A) * vColor.a * ${FADE_UNIFORM};`)}`;
    material.needsUpdate = true;
  });
  useFrame(({ camera }) => {
    fade.value = splatOpacityAt(viewpoints, camera.position.toArray());
    // Nothing to draw: skip the splat's draw call altogether.
    if (holder.current) holder.current.visible = fade.value > 0;
  });
  return holder;
}
