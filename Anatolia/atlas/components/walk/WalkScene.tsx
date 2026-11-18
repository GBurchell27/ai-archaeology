"use client";

import { Splat } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import { moveLimits, type MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { WalkControls } from "./WalkControls";

type WalkSceneProps = {
  site: WalkSite;
  mode: MoveMode;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onSplatShown: () => void;
};

/** Mounts only once its suspended siblings have loaded, which is when the splat is on screen. */
function ShownSignal({ onShown }: { onShown: () => void }) {
  useEffect(onShown, [onShown]);
  return null;
}

/** The splat of one site with a walker inside it. Default export so the view can load it lazily. */
export default function WalkScene({ site, mode, onLockChange, onLiftOff, onSplatShown }: WalkSceneProps) {
  const { position, rotation, scale } = site.alignment;
  const limits = useMemo(() => moveLimits(site.eyeHeightM, site.walkRadiusM), [site.eyeHeightM, site.walkRadiusM]);
  return (
    // The explicit rotation stops the canvas aiming a new camera at the origin, which is the walker's own feet.
    <Canvas camera={{ position: [0, site.eyeHeightM, 0], rotation: [0, 0, 0], fov: 70, near: 0.05, far: 500 }} dpr={[1, 1.5]}>
      <Suspense fallback={null}>
        <Splat src={site.splatUrl} position={position} rotation={rotation} scale={scale} />
        <ShownSignal onShown={onSplatShown} />
      </Suspense>
      <WalkControls mode={mode} limits={limits} onLockChange={onLockChange} onLiftOff={onLiftOff} />
    </Canvas>
  );
}
