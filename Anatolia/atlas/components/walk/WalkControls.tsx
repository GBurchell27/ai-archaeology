"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { RESET_KEY, intentFromKeys } from "@/lib/walk/walkKeys";
import { climbAfterWheel, climbThisFrame, moveStep, type MoveLimits, type MoveMode, type Vec3 } from "@/lib/walk/walkMovement";
import { POINTER_LOCK_ATTRIBUTE } from "./pointerLockTrigger";
import { useKeyCommand, usePressedMoveKeys } from "./useWalkKeys";

const LONGEST_FRAME_S = 0.1;
const AT_REST: Vec3 = [0, 0, 0];

type WalkControlsProps = {
  mode: MoveMode;
  limits: MoveLimits;
  onLockChange: (locked: boolean) => void;
  /** A walker scrolled up: the view should switch to flying. */
  onLiftOff: () => void;
};

/** The climb the mouse wheel has asked for and not yet flown. Scrolling up while walking lifts off. */
function usePendingWheelClimb(mode: MoveMode, onLiftOff: () => void) {
  const pendingClimbM = useRef(0);
  useEffect(() => {
    const scroll = (event: WheelEvent) => {
      if (mode === "walk" && event.deltaY >= 0) return;
      if (mode === "walk") onLiftOff();
      pendingClimbM.current = climbAfterWheel(pendingClimbM.current, event.deltaY);
    };
    window.addEventListener("wheel", scroll, { passive: true });
    return () => window.removeEventListener("wheel", scroll);
  }, [mode, onLiftOff]);
  return pendingClimbM;
}

/** Mouse look by pointer lock, keys to walk or fly, the wheel to climb, R to return to the start. */
export function WalkControls({ mode, limits, onLockChange, onLiftOff }: WalkControlsProps) {
  const pressedCodes = usePressedMoveKeys();
  const camera = useThree((state) => state.camera);
  const velocity = useRef<Vec3>(AT_REST);
  const pendingClimbM = usePendingWheelClimb(mode, onLiftOff);
  const look = useMemo(() => new Vector3(), []);
  const reportLocked = useCallback(() => onLockChange(true), [onLockChange]);
  const reportUnlocked = useCallback(() => onLockChange(false), [onLockChange]);

  useKeyCommand(RESET_KEY, () => {
    camera.position.set(0, limits.eyeHeightM, 0);
    camera.rotation.set(0, 0, 0);
    velocity.current = AT_REST;
  });

  useFrame((_, delta) => {
    const seconds = Math.min(delta, LONGEST_FRAME_S);
    const climbM = mode === "fly" ? climbThisFrame(pendingClimbM.current, seconds) : 0;
    pendingClimbM.current -= climbM;
    camera.getWorldDirection(look);
    const moved = moveStep(
      { position: camera.position.toArray(), velocity: velocity.current },
      mode,
      look.toArray(),
      intentFromKeys(pressedCodes.current),
      limits,
      seconds,
      climbM,
    );
    camera.position.set(...moved.position);
    velocity.current = moved.velocity;
  });

  return <PointerLockControls selector={`[${POINTER_LOCK_ATTRIBUTE}]`} onLock={reportLocked} onUnlock={reportUnlocked} />;
}
