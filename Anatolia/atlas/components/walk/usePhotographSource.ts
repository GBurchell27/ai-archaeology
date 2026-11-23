"use client";

import { useEffect, useState } from "react";
import { viewLoadFailure, type SceneLoadFailure } from "@/lib/scene/sceneFailure";
import type { WalkState } from "./WalkChrome";
import { holdPhotograph, isPhotographAbort } from "./photographObjectUrl";

export type PhotographSource = {
  state: WalkState;
  /** An object URL drei can load, or null until the bytes are in hand. */
  src: string | null;
  failure: SceneLoadFailure | null;
};

const IDLE: PhotographSource = { state: "missing", src: null, failure: null };

/**
 * The photographs' bytes, fetched only while `splatUrl` is set (the model is on screen otherwise).
 * `attempt` starts the fetch again after a failure.
 */
export function usePhotographSource(splatUrl: string | null, attempt: number): PhotographSource {
  const [loaded, setLoaded] = useState<{ url: string; attempt: number; source: PhotographSource } | null>(null);
  useEffect(() => {
    if (!splatUrl) return;
    let current = true;
    const url = splatUrl;
    const hold = holdPhotograph(url);
    hold.promise
      .then((src) => current && setLoaded({ url, attempt, source: { state: "ready", src, failure: null } }))
      .catch((error: unknown) => {
        if (!current || isPhotographAbort(error)) return;
        setLoaded({ url, attempt, source: sourceFromError(error) });
      });
    return () => {
      current = false;
      hold.release();
    };
  }, [splatUrl, attempt]);
  if (!splatUrl) return IDLE;
  if (!loaded || loaded.url !== splatUrl || loaded.attempt !== attempt) return { state: "checking", src: null, failure: null };
  return loaded.source;
}

function sourceFromError(error: unknown): PhotographSource {
  const failure = viewLoadFailure(error);
  if (failure === "missing") return { state: "missing", src: null, failure: null };
  return { state: "unavailable", src: null, failure };
}
