"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";
import type { SceneFailureAction } from "@/components/scene/SceneFailureNotice";
import { sceneFailureKind, sceneFailureText, type SceneLoadFailure } from "@/lib/scene/sceneFailure";
import { walkReturn } from "@/lib/globe/walkHandoff";
import type { WalkModel } from "@/lib/walk/enclosureModel";
import { toggledLayers, type HypothesisLayer, type HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import { MODE_KEY, RESET_KEY } from "@/lib/walk/walkKeys";
import type { PhotoViewpoint } from "@/lib/walk/photoViewpoints";
import { placedLandmarks } from "@/lib/walk/walkLandmarks";
import { findWalkModel } from "@/lib/walk/walkModels";
import type { MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { photoViewpoints } from "@/lib/walk/walkViewpoints";
import { pointerLockTrigger } from "./pointerLockTrigger";
import { WalkChrome, type WalkFailure, type WalkState } from "./WalkChrome";
import type { WalkerHandle } from "./WalkControls";
import type { WalkSource } from "./WalkSourceToggle";
import { usePhotographSource } from "./usePhotographSource";
import { useSceneFailure } from "./useSceneFailure";
import { useViewpointSteps } from "./useViewpointSteps";
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
  /** The sharp viewpoints of the photographs. A model has none. */
  viewpoints: readonly PhotoViewpoint[];
  /** Object URL of the splat, or null while the model is on screen. */
  splatSrc: string | null;
  walker: RefObject<WalkerHandle | null>;
  onNearestLandmark: (landmarkId: string | null) => void;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onShown: () => void;
};

function WalkStage({ site, model, hypotheses, viewpoints, splatSrc, walker, onShown, ...scene }: WalkStageProps) {
  return (
    <div className={styles.stage} {...pointerLockTrigger}>
      {model ? (
        <ModelScene model={model} eyeHeightM={site.eyeHeightM} hypotheses={hypotheses} walker={walker} onShown={onShown} {...scene} />
      ) : splatSrc ? (
        <WalkScene site={site} viewpoints={viewpoints} splatSrc={splatSrc} walker={walker} onSplatShown={onShown} {...scene} />
      ) : null}
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

/** Said when the photographs fail and the site also has a model, which asks for less memory. */
const PHOTOGRAPH_NOTE = "The photographs are one large file. The model draws the site from published dimensions.";

/**
 * A walk or flight through one site: its modelled reconstruction when it has one, or the splat from photographs,
 * or a plain note when that splat has not been built or could not be opened. This owns the state; the scene and `WalkChrome` show it.
 */
export function WalkView({ site, initialSource, onSourceChange, onExit }: WalkViewProps) {
  const siteModel = findWalkModel(site);
  const hasModel = Boolean(siteModel) && !site.modelOnly;
  const [source, chooseSource] = useWalkSource(Boolean(siteModel), site.modelOnly ? "model" : initialSource, onSourceChange);
  const model = source === "model" ? siteModel : null;
  const [sceneError, reportSceneError, retryScene, attempt] = useSceneFailure(source);
  const photographs = usePhotographSource(model || site.modelOnly ? null : site.splatUrl, attempt);
  const state: WalkState = model ? "ready" : photographs.state;
  const failure = walkFailure({ site, hasModel, showingModel: Boolean(model), loadFailure: photographs.failure, sceneError, onExit, onRetry: retryScene, onShowModel: () => chooseSource("model") });
  const [mode, toggleMode, liftOff] = useMoveMode();
  const hasSetOff = useHasSetOff(mode);
  const [locked, setLocked] = useState(false);
  const [hypotheses, toggleHypothesis] = useHypotheses(model);
  const [walker, showLayer] = useShowLayer(hypotheses, toggleHypothesis);
  const [landmarks, nearLandmark, setNearLandmarkId] = useLandmarks(site.id, model);
  const viewpoints = useMemo(() => (model ? [] : photoViewpoints(site.id)), [model, site.id]);
  const [viewpoint, stepViewpoint] = useViewpointSteps(viewpoints, site.eyeHeightM, walker);
  // Remembering which source was shown makes a switch count as not shown yet, with nothing to reset.
  const [shownSource, setShownSource] = useState<WalkSource | null>(null);
  const markShown = useCallback(() => setShownSource(source), [source]);
  const shown = shownSource === source;
  return (
    <div className={styles.walk} {...walkHooks({ site, source, state, failure, mode, locked, shown, nearLandmark, hypotheses, viewpoint, model })}>
      {state === "ready" && !failure ? (
        <SceneErrorBoundary key={`${source}:${attempt}`} onCaught={reportSceneError}>
          <WalkStage site={site} model={model} mode={mode} landmarks={landmarks} hypotheses={hypotheses} viewpoints={viewpoints} splatSrc={photographs.src} walker={walker} onNearestLandmark={setNearLandmarkId} onLockChange={setLocked} onLiftOff={liftOff} onShown={markShown} />
        </SceneErrorBoundary>
      ) : null}
      <WalkChrome
        site={site} hasModel={hasModel} model={model} source={source} state={failure ? "unavailable" : state} shown={shown} locked={locked} mode={mode} hasSetOff={hasSetOff}
        landmarkCount={landmarks.length} nearLandmark={nearLandmark} hypotheses={hypotheses} viewpointCount={viewpoints.length} viewpoint={viewpoint} failure={failure}
        onExit={onExit} onChooseSource={chooseSource} onToggleMode={toggleMode} onToggleHypothesis={toggleHypothesis} onShowLayer={showLayer} onStepViewpoint={stepViewpoint}
      />
    </div>
  );
}

type WalkHookInput = {
  site: WalkSite;
  source: WalkSource;
  state: WalkState;
  failure: WalkFailure | null;
  mode: MoveMode;
  locked: boolean;
  shown: boolean;
  nearLandmark: PlacedLandmark | null;
  hypotheses: readonly HypothesisLayerId[];
  viewpoint: number | null;
  model: WalkModel | null;
};

function walkHooks({ site, source, state, failure, mode, locked, shown, nearLandmark, hypotheses, viewpoint, model }: WalkHookInput) {
  return {
    "data-view": "walk",
    "data-site": site.id,
    "data-walk-source": source,
    "data-walk-state": failure ? "unavailable" : state,
    "data-walk-failure": failure?.kind ?? "",
    "data-walk-mode": mode,
    "data-walk-locked": locked,
    "data-walk-shown": shown,
    "data-walk-landmark": nearLandmark?.landmark.id ?? "",
    "data-walk-hypotheses": hypotheses.join(" "),
    "data-walk-viewpoint": viewpoint === null || model ? "" : viewpoint + 1,
  };
}

type WalkFailureInput = {
  site: WalkSite;
  hasModel: boolean;
  showingModel: boolean;
  loadFailure: SceneLoadFailure | null;
  sceneError: unknown;
  onExit?: () => void;
  onRetry: () => void;
  onShowModel: () => void;
};

function walkFailure({ site, hasModel, showingModel, loadFailure, sceneError, onExit, onRetry, onShowModel }: WalkFailureInput): WalkFailure | null {
  const failure = sceneError ? { kind: sceneFailureKind(sceneError), reported: sceneFailureText(sceneError) } : loadFailure;
  if (!failure) return null;
  const showModel = hasModel && !showingModel && failure.kind !== "webgl";
  const detail = showModel ? PHOTOGRAPH_NOTE : undefined;
  return { kind: failure.kind, reported: failure.reported, detail, actions: failureActions(site, showModel, onExit, onRetry, onShowModel) };
}

function failureActions(site: WalkSite, showModel: boolean, onExit: (() => void) | undefined, onRetry: () => void, onShowModel: () => void): SceneFailureAction[] {
  const exitLabel = walkReturn(site).view === "globe" ? "Back to the globe" : "Back to the map";
  const actions: SceneFailureAction[] = [];
  if (showModel) actions.push({ label: "Show the model", onClick: onShowModel });
  actions.push({ label: "Try again", onClick: onRetry });
  actions.push(onExit ? { label: exitLabel, onClick: onExit } : { label: exitLabel, href: "/" });
  return actions;
}
