"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { MODE_KEY } from "@/lib/walk/walkKeys";
import type { MoveMode } from "@/lib/walk/walkMovement";
import type { WalkSite } from "@/lib/walk/walkSites";
import { pointerLockTrigger } from "./pointerLockTrigger";
import { WalkHud } from "./WalkHud";
import { useKeyCommand } from "./useWalkKeys";
import styles from "./WalkView.module.css";

const WalkScene = dynamic(() => import("./WalkScene"), { ssr: false });

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

function useMoveMode(): [MoveMode, () => void] {
  const [mode, setMode] = useState<MoveMode>("walk");
  const toggleMode = useCallback(() => setMode((current) => (current === "walk" ? "fly" : "walk")), []);
  useKeyCommand(MODE_KEY, toggleMode);
  return [mode, toggleMode];
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

function StatusNote({ state, splatShown }: { state: SplatState; splatShown: boolean }) {
  if (state === "ready" && splatShown) return null;
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

/** A walk or flight through the splat of one site, or a plain note when that splat has not been built. */
export function WalkView({ site, onExit }: { site: WalkSite; onExit?: () => void }) {
  const state = useSplatState(site.splatUrl);
  const [mode, toggleMode] = useMoveMode();
  const [locked, setLocked] = useState(false);
  const [splatShown, setSplatShown] = useState(false);
  const markSplatShown = useCallback(() => setSplatShown(true), []);
  const ready = state === "ready";
  return (
    <div className={styles.walk} data-view="walk" data-site={site.id} data-walk-state={state} data-walk-mode={mode} data-walk-locked={locked} data-walk-shown={splatShown}>
      {ready ? (
        <div className={styles.stage} {...pointerLockTrigger}>
          <WalkScene site={site} mode={mode} onLockChange={setLocked} onSplatShown={markSplatShown} />
        </div>
      ) : null}
      <div className={styles.chrome}>
        <header className={styles.header}>
          <ExitControl onExit={onExit} />
          <h1 className={styles.name}>{site.name}</h1>
        </header>
        <StatusNote state={state} splatShown={splatShown} />
        {ready ? <WalkHud mode={mode} locked={locked} onToggleMode={toggleMode} /> : null}
        {ready ? (
          <footer className={styles.footer}>
            A reconstruction from visitors&apos; photographs, not a survey. Anything the photographs did not see is
            guessed or missing. <a href={site.creditsUrl}>Photograph credits and licences</a>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
