"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

/** The second frame starts once the first has been drawn. */
const FIRST_FRAME_AFTER_A_DRAW = 2;

/** Tells the view its scene is on screen: once a frame of it has been drawn, not when it mounts. Draws nothing. */
export function ShownSignal({ onShown }: { onShown: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > FIRST_FRAME_AFTER_A_DRAW) return;
    frames.current += 1;
    if (frames.current === FIRST_FRAME_AFTER_A_DRAW) onShown();
  });
  return null;
}
