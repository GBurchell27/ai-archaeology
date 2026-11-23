"use client";

import { PerformanceMonitor, type PerformanceMonitorApi } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useState, type RefObject } from "react";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import type { PhotoViewpoint } from "@/lib/walk/photoViewpoints";
import { moveLimits, type MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { LandmarkMarkers } from "./LandmarkMarkers";
import { LandmarkWatcher } from "./LandmarkWatcher";
import { ShownSignal } from "./ShownSignal";
import { SiteSplat } from "./SiteSplat";
import { SplatBackdrop } from "./SplatBackdrop";
import { ViewpointMarkers } from "./ViewpointMarkers";
import { WalkControls, type WalkerHandle } from "./WalkControls";

type WalkSceneProps = {
  site: WalkSite;
  mode: MoveMode;
  /** Only the landmarks whose place in the photographs is known. */
  landmarks: readonly PlacedLandmark[];
  onNearestLandmark: (landmarkId: string | null) => void;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onSplatShown: () => void;
  /** Object URL of the splat bytes. See `photographObjectUrl`. */
  splatSrc: string;
  /** Where the photographs were taken from, each marked on the ground. */
  viewpoints: readonly PhotoViewpoint[];
  /** Lets the chrome stand the walker at one of them. */
  walker?: RefObject<WalkerHandle | null>;
};

/** The frame-rate monitor counts every step up or down; after this many it stops, so the sharpness cannot seesaw. */
const MOST_PIXEL_RATIO_STEPS = 12;

/**
 * The most device pixels drawn per CSS pixel. It starts at 1.5, rises to 2 while the frame rate holds and falls
 * to 1 when it does not, so a screen with fine pixels gets a sharper splat only on a GPU that can afford it.
 */
function useAdaptivePixelRatio(): [number, (monitor: PerformanceMonitorApi) => void] {
  const [pixelRatio, setPixelRatio] = useState(1.5);
  // The monitor's factor runs from 0 to 1 in tenths and starts at one half.
  const followFrameRate = useCallback(({ factor }: PerformanceMonitorApi) => setPixelRatio(Math.round((1 + factor) * 2) / 2), []);
  return [pixelRatio, followFrameRate];
}

/** The splat of one site with a walker inside it. Default export so the view can load it lazily. */
export default function WalkScene({ site, mode, landmarks, onNearestLandmark, onLockChange, onLiftOff, onSplatShown, splatSrc, viewpoints, walker }: WalkSceneProps) {
  const limits = useMemo(() => moveLimits(site.eyeHeightM, site.walkRadiusM), [site.eyeHeightM, site.walkRadiusM]);
  const [pixelRatio, followFrameRate] = useAdaptivePixelRatio();
  return (
    // The explicit rotation stops the canvas aiming a new camera at the origin, which is the walker's own feet.
    <Canvas camera={{ position: [0, site.eyeHeightM, 0], rotation: [0, 0, 0], fov: 70, near: 0.05, far: 500 }} dpr={[1, pixelRatio]}>
      <PerformanceMonitor onChange={followFrameRate} flipflops={MOST_PIXEL_RATIO_STEPS} />
      <SplatBackdrop />
      <Suspense fallback={null}>
        <SiteSplat site={site} src={splatSrc} />
        {/* Inside the boundary, so it starts counting frames only once the splat has loaded. */}
        <ShownSignal onShown={onSplatShown} />
      </Suspense>
      <LandmarkMarkers landmarks={landmarks} showNames={mode === "fly"} />
      <ViewpointMarkers viewpoints={viewpoints} />
      <LandmarkWatcher landmarks={landmarks} onNearest={onNearestLandmark} />
      <WalkControls mode={mode} limits={limits} onLockChange={onLockChange} onLiftOff={onLiftOff} walker={walker} />
    </Canvas>
  );
}
