"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SceneFailureNotice, type SceneFailureAction } from "./SceneFailureNotice";

type WebglGateProps = {
  children: ReactNode;
  actions: readonly SceneFailureAction[];
};

/** True when this browser can open a WebGL context. The probe context is released, so it does not hold a slot. */
export function webglContextAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Draws `children` only when WebGL can start. The first frame waits for that check, which runs after mount,
 * so a server render and the first client render agree.
 */
export function WebglGate({ children, actions }: WebglGateProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    setAvailable(webglContextAvailable());
  }, []);
  if (available === null) return null;
  if (available) return children;
  return <SceneFailureNotice placement="screen" kind="webgl" actions={actions} />;
}
