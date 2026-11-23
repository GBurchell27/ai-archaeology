"use client";

import { useRef } from "react";
import { walkReturn } from "@/lib/globe/walkHandoff";
import type { WalkModel } from "@/lib/walk/enclosureModel";
import type { HypothesisLayer, HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import type { MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { HypothesisPanel } from "./HypothesisPanel";
import { LandmarkCard } from "./LandmarkCard";
import { ViewpointStepper } from "./ViewpointStepper";
import { SourceFootnote } from "./WalkFootnote";
import { LookPrompt, ModeButton } from "./WalkHud";
import { WalkKeyLegend } from "./WalkKeyLegend";
import { WalkSettings } from "./WalkSettings";
import { SceneFailureNotice, type SceneFailureAction } from "@/components/scene/SceneFailureNotice";
import type { SceneFailureKind } from "@/lib/scene/sceneFailure";
import { WalkSourceToggle, type WalkSource } from "./WalkSourceToggle";
import { useKeyCommand } from "./useWalkKeys";
import styles from "./WalkView.module.css";

/** Whether there is a reconstruction to draw: a model always is, a splat may still be looked for, missing, or failed. */
export type WalkState = "checking" | "ready" | "missing" | "unavailable";

/** A photograph or a scene that failed. The header shows it, and the column steps aside so the card can be used. */
export type WalkFailure = {
  kind: SceneFailureKind;
  detail?: string;
  reported?: string;
  actions: readonly SceneFailureAction[];
};

/** Shown under the key legend in the photographs: a splat is only sharp from where its photographs were taken. */
const PHOTOGRAPHS_HINT = "Sharpest from where the photographers stood: you start at one such place, and a pale ring on the ground marks each. Away from them the photographs fade out, because nothing there was seen. The arrows beside Sharp viewpoints step between them, and R brings you back to the start.";
/** The third line of the entry prompt: the one thing worth knowing first about the reconstruction on screen. */
const PHOTOGRAPHS_TIP = "Sharpest at the pale rings · R returns to the start";
const LANDMARKS_TIP = "Walk up to a gold ring to read about it";
const START_TIP = "R returns to the start";
const CLOSE_KEY = "Escape";

/** Escape closes whatever disclosure is open. With the pointer locked the browser keeps Escape for itself, to free it. */
function useCloseOpenPanels() {
  const chrome = useRef<HTMLDivElement>(null);
  useKeyCommand(CLOSE_KEY, () => chrome.current?.querySelectorAll("details[open]").forEach((panel) => panel.removeAttribute("open")));
  return chrome;
}

/** Names where it leads: back to the view that holds the site, the Anatolia map or the globe, with this site selected. */
function ExitControl({ site, onExit }: { site: WalkSite; onExit?: () => void }) {
  const leadsTo = walkReturn(site).view === "globe" ? { label: "Globe", name: "globe" } : { label: "Anatolia map", name: "Anatolia map" };
  if (!onExit) {
    return (
      <a className={styles.exit} href="/" data-action="walk-exit">
        <span aria-hidden="true">←</span> Globe
      </a>
    );
  }
  return (
    <button type="button" className={styles.exit} data-action="walk-exit" aria-label={`Back to the ${leadsTo.name} at ${site.name}`} onClick={onExit}>
      <span aria-hidden="true">←</span> {leadsTo.label}
    </button>
  );
}

function StatusNote({ state, shown }: { state: WalkState; shown: boolean }) {
  if (state === "unavailable" || (state === "ready" && shown)) return null;
  return (
    <p className={styles.note} role="status">
      {state === "missing" ? (
        <>
          No splat has been built for this site yet. The steps are in <code>scripts/splat/README.md</code>.
        </>
      ) : (
        "Loading the reconstruction…"
      )}
    </p>
  );
}

function entryTip(model: WalkModel | null, landmarkCount: number): string {
  if (!model) return PHOTOGRAPHS_TIP;
  return landmarkCount > 0 ? LANDMARKS_TIP : START_TIP;
}

export type WalkChromeProps = {
  site: WalkSite;
  /** Whether the site has a model as well as photographs, and so a choice between them. */
  hasModel: boolean;
  /** The model on screen, or null for the photographs. */
  model: WalkModel | null;
  source: WalkSource;
  state: WalkState;
  /** The scene has been drawn. */
  shown: boolean;
  locked: boolean;
  mode: MoveMode;
  /** The visitor has moved or taken off, so the entry prompt steps back to one line. */
  hasSetOff: boolean;
  landmarkCount: number;
  nearLandmark: PlacedLandmark | null;
  hypotheses: readonly HypothesisLayerId[];
  /** How many sharp viewpoints the photographs on screen have, and the one last jumped to. None for a model. */
  viewpointCount: number;
  viewpoint: number | null;
  onExit?: () => void;
  onChooseSource: (source: WalkSource) => void;
  onToggleMode: () => void;
  onToggleHypothesis: (layerId: HypothesisLayerId) => void;
  onShowLayer: (layer: HypothesisLayer) => void;
  onStepViewpoint: (step: 1 | -1) => void;
  /** Set when the photographs or the scene failed. The column is hidden so this card stays usable. */
  failure?: WalkFailure | null;
};

/** Everything of the walk view that is not the scene: the header, the entry prompt, the right-hand column and the footer. */
export function WalkChrome({ site, hasModel, model, source, state, shown, locked, mode, hasSetOff, landmarkCount, nearLandmark, hypotheses, viewpointCount, viewpoint, failure, ...actions }: WalkChromeProps) {
  const chrome = useCloseOpenPanels();
  const open = state === "ready" && !failure;
  return (
    <div className={styles.chrome} ref={chrome}>
      <header className={styles.header}>
        <ExitControl site={site} onExit={actions.onExit} />
        <h1 className={styles.name}>{site.name}</h1>
        <StatusNote state={state} shown={shown} />
        {failure ? <SceneFailureNotice placement="inline" kind={failure.kind} detail={failure.detail} reported={failure.reported} actions={failure.actions} /> : null}
      </header>
      {open ? <LookPrompt shown={shown && !locked} compact={hasSetOff} tip={entryTip(model, landmarkCount)} /> : null}
      {failure ? null : (
        <WalkColumn
          siteId={site.id} hasModel={hasModel} model={model} source={source} open={open} locked={locked} mode={mode}
          nearLandmark={nearLandmark} hypotheses={hypotheses} viewpointCount={viewpointCount} viewpoint={viewpoint} actions={actions}
        />
      )}
      {open ? <SourceFootnote site={site} model={model} hypotheses={hypotheses} /> : null}
    </div>
  );
}

type WalkColumnProps = {
  siteId: string;
  hasModel: boolean;
  model: WalkModel | null;
  source: WalkSource;
  open: boolean;
  locked: boolean;
  mode: MoveMode;
  nearLandmark: PlacedLandmark | null;
  hypotheses: readonly HypothesisLayerId[];
  viewpointCount: number;
  viewpoint: number | null;
  actions: Pick<WalkChromeProps, "onChooseSource" | "onToggleMode" | "onToggleHypothesis" | "onShowLayer" | "onStepViewpoint">;
};

/** The right-hand column. Hidden while a failure card is up, so the card is not covered on a narrow screen. */
function WalkColumn({ siteId, hasModel, model, source, open, locked, mode, nearLandmark, hypotheses, viewpointCount, viewpoint, actions }: WalkColumnProps) {
  return (
    <div className={styles.side}>
      <div className={styles.controls}>
        {hasModel ? <WalkSourceToggle source={source} locked={locked} onChoose={actions.onChooseSource} /> : null}
        {open ? <ModeButton mode={mode} locked={locked} onToggleMode={actions.onToggleMode} /> : null}
        {open && viewpointCount > 0 ? <ViewpointStepper count={viewpointCount} current={viewpoint} locked={locked} onStep={actions.onStepViewpoint} /> : null}
      </div>
      <div className={styles.panels}>
        {open ? <WalkKeyLegend locked={locked} hint={model ? undefined : PHOTOGRAPHS_HINT} /> : null}
        {model && model.hypotheses.length > 0 ? (
          <HypothesisPanel layers={model.hypotheses} active={hypotheses} locked={locked} onToggle={actions.onToggleHypothesis} onShow={actions.onShowLayer} />
        ) : null}
        <WalkSettings
          locked={locked} hasModel={hasModel} hasLayers={Boolean(model && model.hypotheses.length > 0)} ready={open}
          source={source} mode={mode} onChooseSource={actions.onChooseSource} onToggleMode={actions.onToggleMode}
        />
      </div>
      <LandmarkCard siteId={siteId} placed={open ? nearLandmark : null} />
    </div>
  );
}
