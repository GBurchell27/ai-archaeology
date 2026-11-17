"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GlobeLook, LonLat } from "@/lib/globe/ellipsoid";
import { globeLookFromAtlas, type AtlasLook } from "@/lib/globe/handoff";
import { DEFAULT_GLOBE_LOOK, serialiseViewUrl, type WorldViewState } from "@/lib/globe/viewUrl";
import type { RegionalTerrain } from "@/lib/types";
import styles from "./WorldCoordinator.module.css";

// Each view owns a WebGL canvas, so each is loaded and mounted only while it is on screen.
const GlobeView = dynamic(() => import("./globe/GlobeView").then((module) => module.GlobeView), { ssr: false });
const AtlasApp = dynamic(() => import("./AtlasApp").then((module) => module.AtlasApp), { ssr: false });
const PlaceView = dynamic(() => import("./place/PlaceView"), { ssr: false });

type WorldScene =
  | { view: "globe"; look?: GlobeLook }
  | { view: "atlas"; look?: AtlasLook; siteId?: string }
  | { view: "place"; siteId: string };

interface MountedScene {
  scene: WorldScene;
  /** A fresh key per transition, so returning to a view remounts it at its new starting pose. */
  key: number;
}

const FADE_MS = 620;
const URL_WRITE_INTERVAL_MS = 400;

function sceneFromUrl(state: WorldViewState): WorldScene {
  if (state.view !== "globe") return state;
  const { longitude, latitude, altitude } = state;
  const isDefault = longitude === DEFAULT_GLOBE_LOOK.longitude
    && latitude === DEFAULT_GLOBE_LOOK.latitude
    && altitude === DEFAULT_GLOBE_LOOK.altitude;
  // No look at all lets the globe open on its slow idle turn.
  return isDefault ? { view: "globe" } : { view: "globe", look: { longitude, latitude, altitude } };
}

function urlForScene(scene: WorldScene): string {
  if (scene.view === "globe") return serialiseViewUrl({ view: "globe", ...(scene.look ?? DEFAULT_GLOBE_LOOK) });
  return serialiseViewUrl(scene.view === "atlas" ? { view: "atlas", siteId: scene.siteId } : scene);
}

function writeUrl(search: string): void {
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
}

/** Owns which of the three views is showing, the crossfade between them, and the address bar. */
export function WorldCoordinator(props: { regional: RegionalTerrain | null; initialView: WorldViewState }) {
  const [mounted, setMounted] = useState<{ current: MountedScene; leaving: MountedScene | null }>(
    () => ({ current: { scene: sceneFromUrl(props.initialView), key: 0 }, leaving: null }),
  );
  const globeLook = useRef<GlobeLook | undefined>(mounted.current.scene.view === "globe" ? mounted.current.scene.look : undefined);
  const sceneBeforePlace = useRef<WorldScene>({ view: "globe" });
  const currentScene = useRef(mounted.current.scene);
  const fadeTimer = useRef(0);
  const urlTimer = useRef(0);

  const show = useCallback((scene: WorldScene) => {
    currentScene.current = scene;
    window.clearTimeout(urlTimer.current);
    urlTimer.current = 0;
    writeUrl(urlForScene(scene));
    setMounted(({ current }) => ({ current: { scene, key: current.key + 1 }, leaving: current }));
    // After the fade only one canvas is left alive.
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setMounted(({ current }) => ({ current, leaving: null })), FADE_MS);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(fadeTimer.current);
    window.clearTimeout(urlTimer.current);
  }, []);

  const trackGlobeLook = useCallback((look: GlobeLook) => {
    globeLook.current = look;
    if (urlTimer.current) return;
    urlTimer.current = window.setTimeout(() => {
      urlTimer.current = 0;
      if (currentScene.current.view === "globe" && globeLook.current) writeUrl(urlForScene({ view: "globe", look: globeLook.current }));
    }, URL_WRITE_INTERVAL_MS);
  }, []);

  const enterAtlas = useCallback((look: AtlasLook) => show({ view: "atlas", look }), [show]);
  const exitToGlobe = useCallback((look: LonLat) => show({ view: "globe", look: globeLookFromAtlas(look) }), [show]);
  const exitPlace = useCallback(() => {
    const back = sceneBeforePlace.current;
    show(back.view === "globe" ? { view: "globe", look: globeLook.current } : back);
  }, [show]);
  // For the site card's close-up action (wired by the globe chrome and the atlas).
  const openPlace = useCallback((siteId: string) => {
    sceneBeforePlace.current = currentScene.current;
    show({ view: "place", siteId });
  }, [show]);
  void openPlace; // not wired until the site card exists

  function renderScene(scene: WorldScene) {
    if (scene.view === "place") return <PlaceView siteId={scene.siteId} onExit={exitPlace} />;
    if (scene.view === "atlas") {
      return (
        <AtlasApp
          regional={props.regional}
          initialLook={scene.look}
          initialSiteId={scene.siteId}
          onExitToGlobe={exitToGlobe}
        />
      );
    }
    // Site points and picking go in as children, search and cards as `overlay`.
    return <GlobeView initialLook={scene.look} onLookChange={trackGlobeLook} onEnterAtlas={enterAtlas} />;
  }

  const { current, leaving } = mounted;
  return (
    <main className={styles.world} data-world-view={current.scene.view}>
      {leaving ? (
        <div key={leaving.key} className={`${styles.layer} ${styles.leaving}`} aria-hidden="true" inert>
          {renderScene(leaving.scene)}
        </div>
      ) : null}
      <div key={current.key} className={styles.layer}>{renderScene(current.scene)}</div>
    </main>
  );
}
