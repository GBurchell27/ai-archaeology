"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { RESET_KEY, intentFromKeys } from "@/lib/walk/walkKeys";
import { moveStep, type MoveLimits, type MoveMode, type Vec3 } from "@/lib/walk/walkMovement";
import { POINTER_LOCK_ATTRIBUTE } from "./pointerLockTrigger";
import { useKeyCommand, usePressedMoveKeys } from "./useWalkKeys";

const LONGEST_FRAME_S = 0.1;
const AT_REST: Vec3 = [0, 0, 0];

type WalkControlsProps = { mode: MoveMode; limits: MoveLimits; onLockChange: (locked: boolean) => void };

/** Mouse look by pointer lock, keys to walk or fly, R to return to the start. */
export function WalkControls({ mode, limits, onLockChange }: WalkControlsProps) {
  const pressedCodes = usePressedMoveKeys();
  const camera = useThree((state) => state.camera);
  const velocity = useRef<Vec3>(AT_REST);
  const look = useMemo(() => new Vector3(), []);
  const reportLocked = useCallback(() => onLockChange(true), [onLockChange]);
  const reportUnlocked = useCallback(() => onLockChange(false), [onLockChange]);

  useKeyCommand(RESET_KEY, () => {
    camera.position.set(0, limits.eyeHeightM, 0);
    camera.rotation.set(0, 0, 0);
    velocity.current = AT_REST;
  });

  useFrame((_, delta) => {
    camera.getWorldDirection(look);
    const moved = moveStep(
      { position: camera.position.toArray(), velocity: velocity.current },
      mode,
      look.toArray(),
      intentFromKeys(pressedCodes.current),
      limits,
      Math.min(delta, LONGEST_FRAME_S),
    );
    camera.position.set(...moved.position);
    velocity.current = moved.velocity;
  });

  return <PointerLockControls selector={`[${POINTER_LOCK_ATTRIBUTE}]`} onLock={reportLocked} onUnlock={reportUnlocked} />;
}
