"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { WalkModel } from "@/lib/walk/enclosureModel";
import { MODE_KEY } from "@/lib/walk/walkKeys";
import { findWalkModel } from "@/lib/walk/walkModels";
import type { MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { pointerLockTrigger } from "./pointerLockTrigger";
import { WalkHud } from "./WalkHud";
import { WalkSourceToggle, type WalkSource } from "./WalkSourceToggle";
import { useKeyCommand } from "./useWalkKeys";
import styles from "./WalkView.module.css";

const WalkScene = dynamic(() => import("./WalkScene"), { ssr: false });
const ModelScene = dynamic(() => import("./ModelScene"), { ssr: false });

type SplatState = "checking" | "ready" | "missing";

function useSplatState(splatUrl: string): SplatState {
  const [state, setState] = useState<SplatState>("checking");
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

function useMoveMode(): [MoveMode, () => void, () => void] {
  const [mode, setMode] = useState<MoveMode>("walk");
  const toggleMode = useCallback(() => setMode((current) => (current === "walk" ? "fly" : "walk")), []);
  useKeyCommand(MODE_KEY, toggleMode);
  const fly = useCallback(() => setMode("fly"), []);
  return [mode, toggleMode, fly];
}

function ExitControl({ onExit }: { onExit?: () => void }) {
  if (!onExit) {
    return (
      <a className={styles.exit} href="/">
        Globe
      </a>
    );
  }
  return (
    <button type="button" className={styles.exit} onClick={onExit}>
      Back
    </button>
  );
}

function StatusNote({ state, shown }: { state: SplatState; shown: boolean }) {
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

/** Says what the reconstruction on screen is made from, and so how far to trust it. */
function SourceFootnote({ site, model }: { site: WalkSite; model: WalkModel | null }) {
  if (!model) {
    return (
      <footer className={styles.footer}>
        A reconstruction from visitors&apos; photographs, not a survey. Anything the photographs did not see is guessed
        or missing. <a href={site.creditsUrl}>Photograph credits and licences</a>
      </footer>
    );
  }
  return (
    <footer className={styles.footer}>
      {model.note} Source:{" "}
      {model.sources.map((source) => (
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ))}
    </footer>
  );
}

type WalkStageProps = {
  site: WalkSite;
  /** The model to walk, or null for the splat. */
  model: WalkModel | null;
  mode: MoveMode;
  onLockChange: (locked: boolean) => void;
  onLiftOff: () => void;
  onShown: () => void;
};

function WalkStage({ site, model, mode, onLockChange, onLiftOff, onShown }: WalkStageProps) {
  return (
    <div className={styles.stage} {...pointerLockTrigger}>
      {model ? (
        <ModelScene model={model} eyeHeightM={site.eyeHeightM} mode={mode} onLockChange={onLockChange} onLiftOff={onLiftOff} onShown={onShown} />
      ) : (
        <WalkScene site={site} mode={mode} onLockChange={onLockChange} onLiftOff={onLiftOff} onSplatShown={onShown} />
      )}
    </div>
  );
}

/**
 * A walk or flight through one site: its modelled reconstruction when it has one, or the splat from photographs,
 * or a plain note when that splat has not been built.
 */
export function WalkView({ site, onExit }: { site: WalkSite; onExit?: () => void }) {
  const siteModel = findWalkModel(site);
  const [source, setSource] = useState<WalkSource>(siteModel ? "model" : "photographs");
  const model = source === "model" ? siteModel : null;
  const splatState = useSplatState(site.splatUrl);
  const state = model ? "ready" : splatState;
  const [mode, toggleMode, liftOff] = useMoveMode();
  const [locked, setLocked] = useState(false);
  // Remembering which source was shown makes a switch count as not shown yet, with nothing to reset.
  const [shownSource, setShownSource] = useState<WalkSource | null>(null);
  const markShown = useCallback(() => setShownSource(source), [source]);
  const shown = shownSource === source;
  const ready = state === "ready";
  return (
    <div className={styles.walk} data-view="walk" data-site={site.id} data-walk-source={source} data-walk-state={state} data-walk-mode={mode} data-walk-locked={locked} data-walk-shown={shown}>
      {ready ? <WalkStage site={site} model={model} mode={mode} onLockChange={setLocked} onLiftOff={liftOff} onShown={markShown} /> : null}
      <div className={styles.chrome}>
        <header className={styles.header}>
          <ExitControl onExit={onExit} />
          <h1 className={styles.name}>{site.name}</h1>
        </header>
        <StatusNote state={state} shown={shown} />
        {siteModel ? <WalkSourceToggle source={source} locked={locked} onChoose={setSource} /> : null}
        {ready ? <WalkHud mode={mode} locked={locked} onToggleMode={toggleMode} /> : null}
        {ready ? <SourceFootnote site={site} model={model} /> : null}
      </div>
    </div>
  );
}
