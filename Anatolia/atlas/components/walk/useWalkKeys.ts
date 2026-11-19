"use client";

import { useEffect, useRef } from "react";
import { MOVE_KEYS } from "@/lib/walk/walkKeys";

// Leaves browser shortcuts such as Ctrl+R and Ctrl+F alone.
const isShortcut = (event: KeyboardEvent) => event.ctrlKey || event.metaKey || event.altKey;

/** The movement keys held right now, in a ref so the frame loop reads them without rendering. */
export function usePressedMoveKeys() {
  const pressedCodes = useRef(new Set<string>());
  useEffect(() => {
    const codes = pressedCodes.current;
    const press = (event: KeyboardEvent) => {
      if (!MOVE_KEYS.has(event.code) || isShortcut(event)) return;
      event.preventDefault();
      codes.add(event.code);
    };
    const release = (event: KeyboardEvent) => codes.delete(event.code);
    const releaseAll = () => codes.clear();
    window.addEventListener("keydown", press);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", press);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", releaseAll);
    };
  }, []);
  return pressedCodes;
}

/** Runs `onPress` once per press of one key, wherever the focus is. */
export function useKeyCommand(code: string, onPress: () => void) {
  const latestOnPress = useRef(onPress);
  latestOnPress.current = onPress;
  useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (event.code !== code || event.repeat || isShortcut(event)) return;
      latestOnPress.current();
    };
    window.addEventListener("keydown", press);
    return () => window.removeEventListener("keydown", press);
  }, [code]);
}

/** Runs `onPress` whenever a movement key goes down. */
export function useMoveKeyPress(onPress: () => void) {
  useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (MOVE_KEYS.has(event.code) && !isShortcut(event)) onPress();
    };
    window.addEventListener("keydown", press);
    return () => window.removeEventListener("keydown", press);
  }, [onPress]);
}
