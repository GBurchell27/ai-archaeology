"use client";

import { GradientTexture } from "@react-three/drei";
import { BackSide } from "three";

/** Well inside the camera's far plane and well outside the dome a flyer stays in. */
const BACKDROP_RADIUS_M = 420;
/** From straight up, through the horizon at one half, to straight down. */
const BACKDROP_STOPS = [0, 0.4, 0.5, 0.56, 1];
const BACKDROP_COLOURS = ["#0a0f15", "#18232d", "#34434e", "#161b21", "#0c0f12"];

/**
 * What shows where no photograph looked: a plain dusk gradient with a paler horizon, so a flyer who has turned
 * away from the site still knows which way is level. It draws nothing of the site.
 */
export function SplatBackdrop() {
  return (
    <mesh>
      <sphereGeometry args={[BACKDROP_RADIUS_M, 32, 24]} />
      <meshBasicMaterial side={BackSide} depthWrite={false} toneMapped={false} fog={false}>
        <GradientTexture stops={BACKDROP_STOPS} colors={BACKDROP_COLOURS} />
      </meshBasicMaterial>
    </mesh>
  );
}
