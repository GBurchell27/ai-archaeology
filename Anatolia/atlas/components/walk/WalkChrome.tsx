"use client";

import { useRef } from "react";
import type { WalkModel } from "@/lib/walk/enclosureModel";
import type { HypothesisLayer, HypothesisLayerId } from "@/lib/walk/hypothesisLayers";
import type { PlacedLandmark } from "@/lib/walk/landmarks";
import type { MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { HypothesisPanel } from "./HypothesisPanel";
import { LandmarkCard } from "./LandmarkCard";
import { SourceFootnote } from "./WalkFootnote";
import { LookPrompt, ModeButton } from "./WalkHud";
import { WalkKeyLegend } from "./WalkKeyLegend";
import { WalkSourceToggle, type WalkSource } from "./WalkSourceToggle";
import { useKeyCommand } from "./useWalkKeys";
import styles from "./WalkView.module.css";

/** Whether there is a reconstruction to draw: a model always is, a splat may still be looked for or not be built. */
export type WalkState = "checking" | "ready" | "missing";

/** Shown under the key legend in the photographs: a splat is only sharp from where its photographs were taken. */
const PHOTOGRAPHS_HINT = "Sharpest from where the photographers stood, which is where you start. Elsewhere it thins out into streaks. R brings you back.";
/** The third line of the entry prompt: the one thing worth knowing first about the reconstruction on screen. */
const PHOTOGRAPHS_TIP = "Sharpest near the start · R returns there";
const LANDMARKS_TIP = "Walk up to a gold ring to read about it";
const START_TIP = "R returns to the start";
const CLOSE_KEY = "Escape";

/** Escape closes whatever disclosure is open. With the pointer locked the browser keeps Escape for itself, to free it. */
function useCloseOpenPanels() {
  const chrome = useRef<HTMLDivElement>(null);
  useKeyCommand(CLOSE_KEY, () => chrome.current?.querySelectorAll("details[open]").forEach((panel) => panel.removeAttribute("open")));
  return chrome;
}

/** Names where it leads: the walk is entered from the Anatolia map and goes back to it, with this site selected. */
function ExitControl({ siteName, onExit }: { siteName: string; onExit?: () => void }) {
  if (!onExit) {
    return (
      <a className={styles.exit} href="/" data-action="walk-exit">
        <span aria-hidden="true">←</span> Globe
      </a>
    );
  }
  return (
    <button type="button" className={styles.exit} data-action="walk-exit" aria-label={`Back to the Anatolia map at ${siteName}`} onClick={onExit}>
      <span aria-hidden="true">←</span> Anatolia map
    </button>
  );
}

function StatusNote({ state, shown }: { state: WalkState; shown: boolean }) {
  if (state === "ready" && shown) return null;
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
  onExit?: () => void;
  onChooseSource: (source: WalkSource) => void;
  onToggleMode: () => void;
  onToggleHypothesis: (layerId: HypothesisLayerId) => void;
  onShowLayer: (layer: HypothesisLayer) => void;
};

/** Everything of the walk view that is not the scene: the header, the entry prompt, the right-hand column and the footer. */
export function WalkChrome({ site, hasModel, model, source, state, shown, locked, mode, hasSetOff, landmarkCount, nearLandmark, hypotheses, ...actions }: WalkChromeProps) {
  const chrome = useCloseOpenPanels();
  const ready = state === "ready";
  return (
    <div className={styles.chrome} ref={chrome}>
      <header className={styles.header}>
        <ExitControl siteName={site.name} onExit={actions.onExit} />
        <h1 className={styles.name}>{site.name}</h1>
        <StatusNote state={state} shown={shown} />
      </header>
      {ready ? <LookPrompt shown={shown && !locked} compact={hasSetOff} tip={entryTip(model, landmarkCount)} /> : null}
      {/* Top to bottom in one column, so the controls, an open panel and the card can never cover one another. */}
      <div className={styles.side}>
        <div className={styles.controls}>
          {hasModel ? <WalkSourceToggle source={source} locked={locked} onChoose={actions.onChooseSource} /> : null}
          {ready ? <ModeButton mode={mode} locked={locked} onToggleMode={actions.onToggleMode} /> : null}
        </div>
        <div className={styles.panels}>
          {ready ? <WalkKeyLegend locked={locked} hint={model ? undefined : PHOTOGRAPHS_HINT} /> : null}
          {model && model.hypotheses.length > 0 ? (
            <HypothesisPanel layers={model.hypotheses} active={hypotheses} locked={locked} onToggle={actions.onToggleHypothesis} onShow={actions.onShowLayer} />
          ) : null}
        </div>
        <LandmarkCard placed={ready ? nearLandmark : null} />
      </div>
      {ready ? <SourceFootnote site={site} model={model} hypotheses={hypotheses} /> : null}
    </div>
  );
}
