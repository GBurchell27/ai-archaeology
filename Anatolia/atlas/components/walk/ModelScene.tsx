"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { modelBoxes, type WalkModel } from "@/lib/walk/enclosureModel";
import { moveLimits, type MoveMode } from "@/lib/walk/walkMovement";
import { EnclosureStones } from "./EnclosureStones";
import { ModelBackdrop } from "./ModelBackdrop";
import { WalkControls } from "./WalkControls";

type ModelSceneProps = {
  model: WalkModel;
  eyeHeightM: number;
  mode: MoveMode;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onShown: () => void;
};

/** The modelled reconstruction of one site with a walker inside it. Default export so the view can load it lazily. */
export default function ModelScene({ model, eyeHeightM, mode, onLockChange, onLiftOff, onShown }: ModelSceneProps) {
  const boxes = useMemo(() => modelBoxes(model.enclosures), [model]);
  const limits = useMemo(() => moveLimits(eyeHeightM, model.walkRadiusM), [eyeHeightM, model.walkRadiusM]);
  useEffect(onShown, [onShown]);
  return (
    // The explicit rotation stops the canvas aiming a new camera at the origin, which is the walker's own feet.
    <Canvas shadows="soft" camera={{ position: [0, eyeHeightM, 0], rotation: [0, 0, 0], fov: 70, near: 0.05, far: 1000 }} dpr={[1, 1.5]}>
      <ModelBackdrop />
      <EnclosureStones boxes={boxes} />
      <WalkControls mode={mode} limits={limits} onLockChange={onLockChange} onLiftOff={onLiftOff} />
    </Canvas>
  );
}
