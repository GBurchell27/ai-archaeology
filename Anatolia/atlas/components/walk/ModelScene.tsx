"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, type RefObject } from "react";
import { modelBoxes, type WalkModel } from "@/lib/walk/enclosureModel";
import type { HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import { modelObstacles } from "@/lib/walk/modelObstacles";
import { reliefBoxes } from "@/lib/walk/pillarRelief";
import { groundHeightM } from "@/lib/walk/rockCutModel";
import { obstructedBy } from "@/lib/walk/walkObstacles";
import { walkScaleOf } from "@/lib/walk/walkScale";
import { moveLimits, startPosition, type MoveMode } from "@/lib/walk/walkMovement";
import { EnclosureFloors } from "./EnclosureFloors";
import { EnclosureStones } from "./EnclosureStones";
import { HypothesisRoofs } from "./HypothesisRoofs";
import { LandmarkMarkers } from "./LandmarkMarkers";
import { LandmarkWatcher } from "./LandmarkWatcher";
import { ModelBackdrop } from "./ModelBackdrop";
import { PyramidSite } from "./PyramidSite";
import { RockCutSite } from "./RockCutSite";
import { ShownSignal } from "./ShownSignal";
import { SteppePlants } from "./SteppePlants";
import { WalkControls, type WalkerHandle } from "./WalkControls";

/** Beyond the sky dome of a site of buildings; a larger site sets it further off with the rest of its backdrop. */
const FAR_PLANE_M = 1000;

type ModelSceneProps = {
  model: WalkModel;
  eyeHeightM: number;
  mode: MoveMode;
  landmarks: readonly PlacedLandmark[];
  /** The conjectural layers switched on. */
  hypotheses: readonly HypothesisLayerId[];
  onNearestLandmark: (landmarkId: string | null) => void;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onShown: () => void;
  /** Lets the chrome stand the walker somewhere. */
  walker?: RefObject<WalkerHandle | null>;
};

/** The modelled reconstruction of one site with a walker inside it. Default export so the view can load it lazily. */
export default function ModelScene({ model, eyeHeightM, mode, landmarks, hypotheses, onNearestLandmark, onLockChange, onLiftOff, onShown, walker }: ModelSceneProps) {
  const { enclosures, rockCut, pyramidField } = model;
  const scale = useMemo(() => walkScaleOf(model), [model]);
  const boxes = useMemo(() => [...modelBoxes(enclosures), ...reliefBoxes(enclosures)], [enclosures]);
  const limits = useMemo(() => {
    const ground = rockCut ? (x: number, z: number) => groundHeightM(rockCut, x, z) : () => 0;
    return moveLimits(eyeHeightM, model.walkRadiusM, ground, obstructedBy(modelObstacles(model), ground), scale);
  }, [eyeHeightM, model, rockCut, scale]);
  const start = useMemo(() => [...startPosition(limits)] as [number, number, number], [limits]);
  const surroundingsShown = hypotheses.includes("surroundings");
  return (
    // The explicit rotation stops the canvas aiming a new camera at the origin, which is the walker's own feet.
    <Canvas shadows="soft" camera={{ position: start, rotation: [0, 0, 0], fov: 70, near: 0.05, far: FAR_PLANE_M * scale.backdropFactor }} dpr={[1, 1.5]}>
      <ModelBackdrop grassed={surroundingsShown} groundLevelM={rockCut?.lowGroundM} shadowCastersKey={hypotheses.join(" ")} scale={scale} />
      <EnclosureFloors enclosures={enclosures} />
      <EnclosureStones boxes={boxes} />
      {rockCut ? <RockCutSite site={rockCut} hypotheses={hypotheses} /> : null}
      {pyramidField ? <PyramidSite site={pyramidField} hypotheses={hypotheses} /> : null}
      {hypotheses.includes("roofs") ? <HypothesisRoofs enclosures={enclosures} /> : null}
      {surroundingsShown ? <SteppePlants enclosures={enclosures} /> : null}
      <LandmarkMarkers landmarks={landmarks} showNames={mode === "fly"} scale={scale.markerScale} />
      <LandmarkWatcher landmarks={landmarks} onNearest={onNearestLandmark} />
      <WalkControls mode={mode} limits={limits} onLockChange={onLockChange} onLiftOff={onLiftOff} walker={walker} />
      <ShownSignal onShown={onShown} />
    </Canvas>
  );
}
