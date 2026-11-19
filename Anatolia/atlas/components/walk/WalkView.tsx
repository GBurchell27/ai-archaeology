"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { WalkModel } from "@/lib/walk/enclosureModel";
import { toggledLayers, type HypothesisLayer, type HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import { MODE_KEY, RESET_KEY } from "@/lib/walk/walkKeys";
import { placedLandmarks } from "@/lib/walk/walkLandmarks";
import { findWalkModel } from "@/lib/walk/walkModels";
import type { MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { pointerLockTrigger } from "./pointerLockTrigger";
import { WalkChrome, type WalkState } from "./WalkChrome";
import type { WalkerHandle } from "./WalkControls";
import type { WalkSource } from "./WalkSourceToggle";
import { useKeyCommand, useMoveKeyPress } from "./useWalkKeys";
import styles from "./WalkView.module.css";

const WalkScene = dynamic(() => import("./WalkScene"), { ssr: false });
const ModelScene = dynamic(() => import("./ModelScene"), { ssr: false });

/** Model or photographs. A site without a model only has photographs; the choice is reported so the address can keep it. */
function useWalkSource(hasModel: boolean, initialSource: WalkSource | undefined, onSourceChange?: (source: WalkSource) => void): [WalkSource, (source: WalkSource) => void] {
  const [source, setSource] = useState<WalkSource>(hasModel ? initialSource ?? "model" : "photographs");
  const choose = useCallback((next: WalkSource) => {
    setSource(next);
    onSourceChange?.(next);
  }, [onSourceChange]);
  return [source, choose];
}

function useSplatState(splatUrl: string): WalkState {
  const [state, setState] = useState<WalkState>("checking");
  useEffect(() => {
    let current = true;
    setState("checking");
    fetch(splatUrl, { method: "HEAD" })
      .then((response) => current && setState(response.ok ? "ready" : "missing"))
      .catch(() => current && setState("missing"));
    return () => {
      current = false;
    };
  }, [splatUrl]);
  return state;
}

/** Walking or flying. F switches, scrolling down takes off, and R, which returns to the start, lands there. */
function useMoveMode(): [MoveMode, () => void, () => void] {
  const [mode, setMode] = useState<MoveMode>("walk");
  const toggleMode = useCallback(() => setMode((current) => (current === "walk" ? "fly" : "walk")), []);
  useKeyCommand(MODE_KEY, toggleMode);
  useKeyCommand(RESET_KEY, () => setMode("walk"));
  const fly = useCallback(() => setMode("fly"), []);
  return [mode, toggleMode, fly];
}

/** True from the first movement key or take-off onward: the visitor no longer needs the full entry prompt. */
function useHasSetOff(mode: MoveMode): boolean {
  const [hasSetOff, setHasSetOff] = useState(false);
  const setOff = useCallback(() => setHasSetOff(true), []);
  useMoveKeyPress(setOff);
  useEffect(() => {
    if (mode === "fly") setOff();
  }, [mode, setOff]);
  return hasSetOff;
}

/** Which conjectural layers are on. They start off, and a model without the layer never shows it. */
function useHypotheses(model: WalkModel | null): [HypothesisLayerId[], (layerId: HypothesisLayerId) => void] {
  const [chosen, setChosen] = useState<readonly HypothesisLayerId[]>([]);
  const toggle = useCallback((layerId: HypothesisLayerId) => setChosen((current) => toggledLayers(current, layerId)), []);
  const active = useMemo(() => (model?.hypotheses ?? []).map((layer) => layer.id).filter((layerId) => chosen.includes(layerId)), [model, chosen]);
  return [active, toggle];
}

/** "Show me": the layer goes on, and the walker is stood where it can be seen. */
function useShowLayer(active: readonly HypothesisLayerId[], toggle: (layerId: HypothesisLayerId) => void): [RefObject<WalkerHandle | null>, (layer: HypothesisLayer) => void] {
  const walker = useRef<WalkerHandle>(null);
  const showLayer = useCallback((layer: HypothesisLayer) => {
    if (!active.includes(layer.id)) toggle(layer.id);
    if (layer.viewpoint) walker.current?.standAt(layer.viewpoint);
  }, [active, toggle]);
  return [walker, showLayer];
}

/** The landmarks of the source on screen, and the one the walker has come up to. */
function useLandmarks(siteId: string, model: WalkModel | null): [PlacedLandmark[], PlacedLandmark | null, (landmarkId: string | null) => void] {
  const landmarks = useMemo(() => placedLandmarks(siteId, model), [siteId, model]);
  const [nearId, setNearId] = useState<string | null>(null);
  const near = landmarks.find((placed) => placed.landmark.id === nearId) ?? null;
  return [landmarks, near, setNearId];
}

type WalkStageProps = {
  site: WalkSite;
  /** The model to walk, or null for the splat. */
  model: WalkModel | null;
  mode: MoveMode;
  landmarks: readonly PlacedLandmark[];
  hypotheses: readonly HypothesisLayerId[];
  walker: RefObject<WalkerHandle | null>;
  onNearestLandmark: (landmarkId: string | null) => void;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onShown: () => void;
};

function WalkStage({ site, model, hypotheses, walker, onShown, ...scene }: WalkStageProps) {
  return (
    <div className={styles.stage} {...pointerLockTrigger}>
      {model ? (
        <ModelScene model={model} eyeHeightM={site.eyeHeightM} hypotheses={hypotheses} walker={walker} onShown={onShown} {...scene} />
      ) : (
        <WalkScene site={site} onSplatShown={onShown} {...scene} />
      )}
    </div>
  );
}

type WalkViewProps = {
  site: WalkSite;
  /** Which reconstruction to open on, when the site has both. The model otherwise. */
  initialSource?: WalkSource;
  onSourceChange?: (source: WalkSource) => void;
  onExit?: () => void;
};

/**
 * A walk or flight through one site: its modelled reconstruction when it has one, or the splat from photographs,
 * or a plain note when that splat has not been built. This owns the state; the scene and `WalkChrome` show it.
 */
export function WalkView({ site, initialSource, onSourceChange, onExit }: WalkViewProps) {
  const siteModel = findWalkModel(site);
  const [source, chooseSource] = useWalkSource(Boolean(siteModel), initialSource, onSourceChange);
  const model = source === "model" ? siteModel : null;
  const splatState = useSplatState(site.splatUrl);
  const state = model ? "ready" : splatState;
  const [mode, toggleMode, liftOff] = useMoveMode();
  const hasSetOff = useHasSetOff(mode);
  const [locked, setLocked] = useState(false);
  const [hypotheses, toggleHypothesis] = useHypotheses(model);
  const [walker, showLayer] = useShowLayer(hypotheses, toggleHypothesis);
  const [landmarks, nearLandmark, setNearLandmarkId] = useLandmarks(site.id, model);
  // Remembering which source was shown makes a switch count as not shown yet, with nothing to reset.
  const [shownSource, setShownSource] = useState<WalkSource | null>(null);
  const markShown = useCallback(() => setShownSource(source), [source]);
  const shown = shownSource === source;
  const hooks = {
    "data-view": "walk",
    "data-site": site.id,
    "data-walk-source": source,
    "data-walk-state": state,
    "data-walk-mode": mode,
    "data-walk-locked": locked,
    "data-walk-shown": shown,
    "data-walk-landmark": nearLandmark?.landmark.id ?? "",
    "data-walk-hypotheses": hypotheses.join(" "),
  };
  return (
    <div className={styles.walk} {...hooks}>
      {state === "ready" ? (
        <WalkStage site={site} model={model} mode={mode} landmarks={landmarks} hypotheses={hypotheses} walker={walker} onNearestLandmark={setNearLandmarkId} onLockChange={setLocked} onLiftOff={liftOff} onShown={markShown} />
      ) : null}
      <WalkChrome
        site={site} hasModel={Boolean(siteModel)} model={model} source={source} state={state} shown={shown} locked={locked} mode={mode} hasSetOff={hasSetOff}
        landmarkCount={landmarks.length} nearLandmark={nearLandmark} hypotheses={hypotheses}
        onExit={onExit} onChooseSource={chooseSource} onToggleMode={toggleMode} onToggleHypothesis={toggleHypothesis} onShowLayer={showLayer}
      />
    </div>
  );
}
