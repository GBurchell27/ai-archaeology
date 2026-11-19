"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GlobeLook, LonLat } from "@/lib/globe/ellipsoid";
import { globeLookFromAtlas, type AtlasLook } from "@/lib/globe/handoff";
import { walkReturn, walkSiteForCard } from "@/lib/globe/walkHandoff";
import { DEFAULT_GLOBE_LOOK, parseViewUrl, serialiseViewUrl, type WalkSource, type WorldViewState } from "@/lib/globe/viewUrl";
import type { RegionalTerrain } from "@/lib/types";
import { findWalkSite } from "@/lib/walk/walkSites";
import { GlobeModelOverlay } from "./globe/model/GlobeModelOverlay";
import { ModelControls } from "./globe/model/ModelControls";
import { withModelParam } from "./globe/model/modelUrl";
import { useModelLayer } from "./globe/model/useModelLayer";
import { historyEntryForView, type HistoryEntry } from "@/lib/globe/viewHistory";
import { useHistoryTraversal, writeHistoryEntry } from "./useViewHistory";
import styles from "./WorldCoordinator.module.css";

// Each view owns a WebGL canvas, so each is loaded and mounted only while it is on screen.
const GlobeExplorer = dynamic(() => import("./globe/GlobeExplorer").then((module) => module.GlobeExplorer), { ssr: false });
const AtlasApp = dynamic(() => import("./AtlasApp").then((module) => module.AtlasApp), { ssr: false });
const PlaceView = dynamic(() => import("./place/PlaceView"), { ssr: false });
const WalkView = dynamic(() => import("./walk/WalkView").then((module) => module.WalkView), { ssr: false });

type WorldScene =
  | { view: "globe"; look?: GlobeLook; siteId?: string; theoryId?: string }
  | { view: "atlas"; look?: AtlasLook; siteId?: string }
  | { view: "place"; siteId: string }
  | { view: "walk"; siteId: string; source?: WalkSource };

interface MountedScene {
  scene: WorldScene;
  /** A fresh key per transition, so returning to a view remounts it at its new starting pose. */
  key: number;
}

const FADE_MS = 620;
const URL_WRITE_INTERVAL_MS = 400;

const SITE_ID = /^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** `?view=globe&site=<id>`: the site whose card is open on the globe. parseViewUrl only reads `site` for the other views. */
function globeSiteFromAddress(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const site = new URLSearchParams(window.location.search).get("site");
  return site && SITE_ID.test(site) ? site : undefined;
}

function sceneFromUrl(state: WorldViewState): WorldScene {
  if (state.view === "walk") {
    const site = walkSiteForCard(state.siteId);
    // A site with no walk opens the atlas, which ignores an id it does not know.
    if (!site) return { view: "atlas", siteId: state.siteId };
    // The id of a globe card that offers the walk becomes the walk's own, and a model with no photographs has no source to name.
    return { view: "walk", siteId: site.id, source: site.modelOnly ? undefined : state.source };
  }
  if (state.view !== "globe") return state;
  const siteId = globeSiteFromAddress();
  const { longitude, latitude, altitude, theoryId } = state;
  const isDefault = longitude === DEFAULT_GLOBE_LOOK.longitude
    && latitude === DEFAULT_GLOBE_LOOK.latitude
    && altitude === DEFAULT_GLOBE_LOOK.altitude;
  // No look at all lets the globe open on its slow idle turn.
  return isDefault ? { view: "globe", siteId, theoryId } : { view: "globe", look: { longitude, latitude, altitude }, siteId, theoryId };
}

function urlForScene(scene: WorldScene): string {
  if (scene.view === "globe") {
    const site = scene.siteId ? `&site=${encodeURIComponent(scene.siteId)}` : "";
    return serialiseViewUrl({ view: "globe", ...(scene.look ?? DEFAULT_GLOBE_LOOK), theoryId: scene.theoryId }) + site;
  }
  return serialiseViewUrl(scene.view === "atlas" ? { view: "atlas", siteId: scene.siteId } : scene);
}

function writeUrl(search: string, entry: HistoryEntry = "replace"): void {
  writeHistoryEntry(`${window.location.pathname}${withModelParam(search)}`, entry);
}

/** Owns which of the four views is showing, the crossfade between them, and the address bar. */
export function WorldCoordinator(props: { regional: RegionalTerrain | null; initialView: WorldViewState }) {
  const [mounted, setMounted] = useState<{ current: MountedScene; leaving: MountedScene | null }>(
    () => ({ current: { scene: sceneFromUrl(props.initialView), key: 0 }, leaving: null }),
  );
  const globeLook = useRef<GlobeLook | undefined>(mounted.current.scene.view === "globe" ? mounted.current.scene.look : undefined);
  /** The site whose card is open on the globe; it rides along in the address and survives a trip to the place view. */
  const globeSiteId = useRef<string | undefined>(mounted.current.scene.view === "globe" ? mounted.current.scene.siteId : undefined);
  /** The theory the globe's lens is on; it rides along in the address the same way. */
  const globeTheoryId = useRef<string | undefined>(mounted.current.scene.view === "globe" ? mounted.current.scene.theoryId : undefined);
  const sceneBeforePlace = useRef<WorldScene>({ view: "globe" });
  const currentScene = useRef(mounted.current.scene);
  const fadeTimer = useRef(0);
  const urlTimer = useRef(0);
  const model = useModelLayer();

  const show = useCallback((scene: WorldScene, traversed = false) => {
    // A change of view is one history entry, so Back returns to the view before. Back and Forward themselves add none.
    const entry = historyEntryForView(currentScene.current.view, scene.view, traversed);
    currentScene.current = scene;
    if (scene.view === "globe") {
      globeSiteId.current = scene.siteId;
      globeTheoryId.current = scene.theoryId;
    }
    window.clearTimeout(urlTimer.current);
    urlTimer.current = 0;
    writeUrl(urlForScene(scene), entry);
    setMounted(({ current }) => ({ current: { scene, key: current.key + 1 }, leaving: current }));
    // After the fade only one canvas is left alive.
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setMounted(({ current }) => ({ current, leaving: null })), FADE_MS);
  }, []);

  useEffect(() => {
    // An address that fell back to another view is corrected, so a reload or a copied link names what is shown.
    // A walk's address is always rewritten, which drops a `source` value that was read as the default.
    const scene = currentScene.current;
    if (scene.view !== props.initialView.view || scene.view === "walk") writeUrl(urlForScene(scene));
    // Only the address the page opened on can be wrong.
  }, []);

  useHistoryTraversal((search) => show(sceneFromUrl(parseViewUrl(search)), true));

  useEffect(() => () => {
    window.clearTimeout(fadeTimer.current);
    window.clearTimeout(urlTimer.current);
  }, []);

  /** The globe as it stands now: where it looks, the open card and the theory lens. */
  const globeSceneNow = useCallback((): WorldScene => (
    { view: "globe", look: globeLook.current, siteId: globeSiteId.current, theoryId: globeTheoryId.current }
  ), []);

  const trackGlobeLook = useCallback((look: GlobeLook) => {
    globeLook.current = look;
    if (urlTimer.current) return;
    urlTimer.current = window.setTimeout(() => {
      urlTimer.current = 0;
      if (currentScene.current.view !== "globe" || !globeLook.current) return;
      writeUrl(urlForScene(globeSceneNow()));
    }, URL_WRITE_INTERVAL_MS);
  }, [globeSceneNow]);

  const trackGlobeSite = useCallback((siteId: string | null) => {
    globeSiteId.current = siteId ?? undefined;
    if (currentScene.current.view === "globe") writeUrl(urlForScene(globeSceneNow()));
  }, [globeSceneNow]);

  const trackGlobeTheory = useCallback((theoryId: string | null) => {
    // The lens reports on mount as well: an address that already says so is left alone.
    if (globeTheoryId.current === (theoryId ?? undefined)) return;
    globeTheoryId.current = theoryId ?? undefined;
    if (currentScene.current.view === "globe") writeUrl(urlForScene(globeSceneNow()));
  }, [globeSceneNow]);

  /** The place selected on the atlas rides along in the address by its id, so a reload opens it again. */
  const trackAtlasSite = useCallback((siteId: string | null) => {
    const scene = currentScene.current;
    if (scene.view !== "atlas") return;
    currentScene.current = { ...scene, siteId: siteId ?? undefined };
    writeUrl(urlForScene(currentScene.current));
  }, []);

  // An id the Anatolia catalogue does not know is ignored by the atlas, so it is always safe to pass along.
  const enterAtlas = useCallback((look: AtlasLook, siteId?: string) => show({ view: "atlas", look, siteId }), [show]);
  const exitToGlobe = useCallback((look: LonLat) => show({ view: "globe", look: globeLookFromAtlas(look) }), [show]);
  const exitPlace = useCallback(() => {
    const back = sceneBeforePlace.current;
    // Back on the globe the card of the site just visited reopens.
    show(back.view === "globe" ? globeSceneNow() : back);
  }, [show, globeSceneNow]);
  const openPlace = useCallback((siteId: string) => {
    sceneBeforePlace.current = currentScene.current;
    show({ view: "place", siteId });
  }, [show]);

  /** From the atlas with a curated id, or from a globe card with the id of the card, which need not be the walk's own. */
  const openWalk = useCallback((siteId: string) => {
    const site = walkSiteForCard(siteId);
    if (!site) return;
    // The atlas entry left behind names the site, so Back from a walk entered by zooming returns to it selected.
    // The globe's entry already names its open card.
    trackAtlasSite(siteId);
    show({ view: "walk", siteId: site.id });
  }, [show, trackAtlasSite]);
  const exitWalk = useCallback(() => {
    const scene = currentScene.current;
    const site = scene.view === "walk" ? findWalkSite(scene.siteId) : null;
    if (!site) return show({ view: "atlas" });
    // Back in the view that holds the site, it is selected again: on the globe, the card the visitor came from.
    const back = walkReturn(site, globeSiteId.current);
    show(back.view === "globe" ? { ...globeSceneNow(), siteId: back.siteId } : back);
  }, [show, globeSceneNow]);
  /** Model or photographs rides along in the address, so a reload or a copied link opens the same one. */
  const trackWalkSource = useCallback((source: WalkSource) => {
    const scene = currentScene.current;
    if (scene.view !== "walk") return;
    currentScene.current = { ...scene, source };
    writeUrl(urlForScene(currentScene.current));
  }, []);

  function renderScene(scene: WorldScene) {
    if (scene.view === "walk") {
      const site = findWalkSite(scene.siteId);
      return site ? <WalkView site={site} initialSource={scene.source} onSourceChange={trackWalkSource} onExit={exitWalk} /> : null;
    }
    if (scene.view === "place") return <PlaceView siteId={scene.siteId} onExit={exitPlace} />;
    if (scene.view === "atlas") {
      return (
        <AtlasApp
          regional={props.regional}
          initialLook={scene.look}
          initialSiteId={scene.siteId}
          onExitToGlobe={exitToGlobe}
          onSelectSite={trackAtlasSite}
          onEnterWalk={openWalk}
        />
      );
    }
    return (
      <GlobeExplorer
        initialLook={scene.look}
        initialSiteId={scene.siteId}
        initialTheoryId={scene.theoryId}
        onLookChange={trackGlobeLook}
        onSelectSite={trackGlobeSite}
        onSelectTheory={trackGlobeTheory}
        onOpenPlace={openPlace}
        onEnterAtlas={enterAtlas}
        onEnterWalk={openWalk}
        modelSlot={<ModelControls model={model} />}
        sceneLayers={<GlobeModelOverlay model={model} />}
      />
    );
  }

  const { current, leaving } = mounted;
  // Entering a walk, the atlas swells as it fades while its camera pushes at the site.
  const leavingStyle = leaving?.scene.view === "atlas" && current.scene.view === "walk" ? styles.diving : styles.leaving;
  return (
    <main className={styles.world} data-world-view={current.scene.view}>
      {leaving ? (
        <div key={leaving.key} className={`${styles.layer} ${leavingStyle}`} aria-hidden="true" inert>
          {renderScene(leaving.scene)}
        </div>
      ) : null}
      <div key={current.key} className={leaving ? `${styles.layer} ${styles.entering}` : styles.layer}>{renderScene(current.scene)}</div>
    </main>
  );
}
