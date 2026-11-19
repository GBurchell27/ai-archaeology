"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from "react";
import { Vector3 } from "three";
import type { LayerViewpoint } from "@/lib/walk/hypothesisLayers";
import { RESET_KEY, intentFromKeys } from "@/lib/walk/walkKeys";
import {
  climbAfterWheel,
  climbThisFrame,
  moveStep,
  standingAt,
  startPosition,
  wheelGateAfterFrame,
  wheelGateAfterWheel,
  type MoveLimits,
  type MoveMode,
  type Vec3,
  SHUT_WHEEL_GATE,
} from "@/lib/walk/walkMovement";
import { POINTER_LOCK_ATTRIBUTE } from "./pointerLockTrigger";
import { useKeyCommand, usePressedMoveKeys } from "./useWalkKeys";

const LONGEST_FRAME_S = 0.1;
const AT_REST: Vec3 = [0, 0, 0];

/** What the chrome can ask of the walker from outside the canvas. */
export type WalkerHandle = { standAt: (viewpoint: LayerViewpoint) => void };

type WalkControlsProps = {
  mode: MoveMode;
  limits: MoveLimits;
  onLockChange: (locked: boolean) => void;
  /** A walker scrolled down: the view should switch to flying. */
  onLiftOff: () => void;
  walker?: RefObject<WalkerHandle | null>;
};

/**
 * The climb the mouse wheel has asked for and not yet flown. Scrolling down while walking lifts off.
 * Only the wheel over the scene counts (with the pointer locked every wheel event goes to the scene), so scrolling a
 * panel does not take off; and not until the wheel gate opens, so the zoom that entered the walk does not either.
 * The gate counts drawn frames, so its clock starts when the scene first draws and does not run through a stall.
 */
function usePendingWheelClimb(mode: MoveMode, onLiftOff: () => void) {
  const pendingClimbM = useRef(0);
  const gate = useRef(SHUT_WHEEL_GATE);
  const canvas = useThree((state) => state.gl.domElement);
  const scene = useThree((state) => state.events.connected as HTMLElement | undefined) ?? canvas;
  useFrame((_, delta) => {
    gate.current = wheelGateAfterFrame(gate.current, delta * 1000);
  });
  useEffect(() => {
    const scroll = (event: WheelEvent) => {
      gate.current = wheelGateAfterWheel(gate.current);
      if (!gate.current.open || (mode === "walk" && event.deltaY <= 0)) return;
      if (mode === "walk") onLiftOff();
      pendingClimbM.current = climbAfterWheel(pendingClimbM.current, event.deltaY);
    };
    scene.addEventListener("wheel", scroll, { passive: true });
    return () => scene.removeEventListener("wheel", scroll);
  }, [mode, onLiftOff, scene]);
  return pendingClimbM;
}

/** Stands the walker somewhere, at rest: R at the start looking ahead, and the chrome at a viewpoint it names. */
function useWalkerPlacing(limits: MoveLimits, velocity: RefObject<Vec3>, walker?: RefObject<WalkerHandle | null>) {
  const camera = useThree((state) => state.camera);
  useKeyCommand(RESET_KEY, () => {
    camera.position.set(...startPosition(limits));
    camera.rotation.set(0, 0, 0);
    velocity.current = AT_REST;
  });
  useImperativeHandle(walker, () => ({
    standAt({ standAt: [x, z], lookAt }) {
      camera.position.set(...standingAt(limits, x, z));
      camera.lookAt(...lookAt);
      velocity.current = AT_REST;
    },
  }), [camera, limits, velocity]);
}

/** Mouse look by pointer lock, keys to walk or fly, the wheel to climb, R to return to the start. */
export function WalkControls({ mode, limits, onLockChange, onLiftOff, walker }: WalkControlsProps) {
  const pressedCodes = usePressedMoveKeys();
  const camera = useThree((state) => state.camera);
  const velocity = useRef<Vec3>(AT_REST);
  const pendingClimbM = usePendingWheelClimb(mode, onLiftOff);
  const look = useMemo(() => new Vector3(), []);
  const reportLocked = useCallback(() => onLockChange(true), [onLockChange]);
  const reportUnlocked = useCallback(() => onLockChange(false), [onLockChange]);

  useWalkerPlacing(limits, velocity, walker);

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
