"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, type RefObject } from "react";
import { modelBoxes, type WalkModel } from "@/lib/walk/enclosureModel";
import type { GizaTerrain } from "@/lib/walk/gizaTerrain";
import { heightAt } from "@/lib/walk/gizaTerrain";
import type { HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import { modelObstacles } from "@/lib/walk/modelObstacles";
import { reliefBoxes } from "@/lib/walk/pillarRelief";
import { liftPlacedLandmarks, liftPyramidField } from "@/lib/walk/pyramidLift";
import { groundHeightM } from "@/lib/walk/rockCutModel";
import { obstructedBy } from "@/lib/walk/walkObstacles";
import { walkScaleOf } from "@/lib/walk/walkScale";
import { moveLimits, startPosition, type GroundHeight, type MoveMode } from "@/lib/walk/walkMovement";
import { EnclosureFloors } from "./EnclosureFloors";
import { EnclosureStones } from "./EnclosureStones";
import { GizaGround } from "./GizaGround";
import { HypothesisRoofs } from "./HypothesisRoofs";
import { LandmarkMarkers } from "./LandmarkMarkers";
import { LandmarkWatcher } from "./LandmarkWatcher";
import { ModelBackdrop } from "./ModelBackdrop";
import { PyramidSite } from "./PyramidSite";
import { RockCutSite } from "./RockCutSite";
import { ShownSignal } from "./ShownSignal";
import { SteppePlants } from "./SteppePlants";
import { useGizaGround } from "./useGizaGround";
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
export default function ModelScene(props: ModelSceneProps) {
  const giza = useGizaGround(props.model.terrainId === "giza");
  if (props.model.terrainId === "giza" && giza.error) throw giza.error;
  if (props.model.terrainId === "giza" && !giza.terrain) return null;
  return <ModelCanvas {...props} terrain={giza.terrain} />;
}

function ModelCanvas({ model, eyeHeightM, mode, landmarks, hypotheses, onNearestLandmark, onLockChange, onLiftOff, onShown, walker, terrain }: ModelSceneProps & { terrain: GizaTerrain | null }) {
  const { enclosures, rockCut, pyramidField } = model;
  const field = pyramidField && terrain ? liftPyramidField(pyramidField, terrain.baseOffsetM) : pyramidField;
  const placed = terrain ? liftPlacedLandmarks(landmarks, terrain.baseOffsetM) : landmarks;
  const scale = useMemo(() => walkScaleOf(model), [model]);
  const boxes = useMemo(() => [...modelBoxes(enclosures), ...reliefBoxes(enclosures)], [enclosures]);
  const ground = useMemo(() => groundUnder(model, terrain), [model, terrain]);
  const limits = useMemo(
    () => moveLimits(eyeHeightM, model.walkRadiusM, ground, obstructedBy(modelObstacles(model), ground), scale),
    [eyeHeightM, ground, model, scale],
  );
  const start = useMemo(() => [...startPosition(limits)] as [number, number, number], [limits]);
  const surroundingsShown = hypotheses.includes("surroundings");
  return (
    // The explicit rotation stops the canvas aiming a new camera at the origin, which is the walker's own feet.
    <Canvas shadows="soft" camera={{ position: start, rotation: [0, 0, 0], fov: 70, near: 0.05, far: FAR_PLANE_M * scale.backdropFactor }} dpr={[1, 1.5]}>
      <ModelBackdrop grassed={surroundingsShown} groundLevelM={rockCut?.lowGroundM} shadowCastersKey={hypotheses.join(" ")} scale={scale} ground={terrain ? "terrain" : "flat"} />
      {terrain ? <GizaGround terrain={terrain} /> : null}
      <EnclosureFloors enclosures={enclosures} />
      <EnclosureStones boxes={boxes} />
      {rockCut ? <RockCutSite site={rockCut} hypotheses={hypotheses} /> : null}
      {field ? <PyramidSite site={field} hypotheses={hypotheses} /> : null}
      {hypotheses.includes("roofs") ? <HypothesisRoofs enclosures={enclosures} /> : null}
      {surroundingsShown ? <SteppePlants enclosures={enclosures} /> : null}
      <LandmarkMarkers landmarks={placed} showNames={mode === "fly"} scale={scale.markerScale} />
      <LandmarkWatcher landmarks={placed} onNearest={onNearestLandmark} />
      <WalkControls mode={mode} limits={limits} onLockChange={onLockChange} onLiftOff={onLiftOff} walker={walker} />
      <ShownSignal onShown={onShown} />
    </Canvas>
  );
}

function groundUnder(model: WalkModel, terrain: GizaTerrain | null): GroundHeight {
  if (terrain) return (east, south) => heightAt(terrain, east, south);
  const rockCut = model.rockCut;
  return rockCut ? (east, south) => groundHeightM(rockCut, east, south) : () => 0;
}
