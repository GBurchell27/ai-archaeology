"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

const FOLLOW_RATE = 4;

/**
 * Pans the orbit camera after a moving point, keeping the user's zoom and tilt.
 * Steps aside while a camera flight runs, and hands control back when the user grabs the map.
 */
export function useCameraFollow(focus: RefObject<THREE.Vector3>, enabled: boolean, onInterrupt?: () => void): void {
  const canvas = useThree((state) => state.gl.domElement);
  const interrupt = useRef(onInterrupt);
  interrupt.current = onInterrupt;

  useEffect(() => {
    if (!enabled) return undefined;
    const grab = (event: PointerEvent) => {
      if (event.button === 0) interrupt.current?.();
    };
    canvas.addEventListener("pointerdown", grab);
    return () => canvas.removeEventListener("pointerdown", grab);
  }, [canvas, enabled]);

  useFrame(({ camera, controls }, delta) => {
    const target = (controls as { target?: THREE.Vector3 } | null)?.target;
    if (!enabled || !target || !focus.current || document.body.dataset.flying === "true") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pull = reduced ? 1 : 1 - Math.exp(-FOLLOW_RATE * Math.min(delta, 0.1));
    const shiftX = (focus.current.x - target.x) * pull;
    const shiftY = (focus.current.y - target.y) * pull;
    const shiftZ = (focus.current.z - target.z) * pull;
    target.set(target.x + shiftX, target.y + shiftY, target.z + shiftZ);
    camera.position.set(camera.position.x + shiftX, camera.position.y + shiftY, camera.position.z + shiftZ);
  }, -1.5);
}
