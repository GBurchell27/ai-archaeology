"use client";

import { useEffect, useRef } from "react";
import { sceneFailureLead, type SceneFailureKind } from "@/lib/scene/sceneFailure";
import styles from "./SceneFailureNotice.module.css";

export type SceneFailureAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

type SceneFailureNoticeProps = {
  kind: SceneFailureKind;
  /** `screen` covers the view. `inline` sits in the walk header, under the title. */
  placement: "screen" | "inline";
  detail?: string;
  /** The browser's own message, under a disclosure, clipped so a minified stack cannot fill the card. */
  reported?: string;
  actions: readonly SceneFailureAction[];
};

/** The card a failed 3D view shows, with the actions that leave it or try it again. */
export function SceneFailureNotice({ kind, placement, detail, reported, actions }: SceneFailureNoticeProps) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const control = card.current?.querySelector("button, a");
    if (control instanceof HTMLElement) control.focus();
  }, []);
  const browserText = reported?.trim().slice(0, 300);
  return (
    <div className={placement === "screen" ? styles.screen : styles.inline} role="alert" data-role="scene-failure" data-failure={kind}>
      <div className={styles.card} ref={card}>
        <h2 className={styles.title}>The view stopped</h2>
        <p>{sceneFailureLead(kind)}</p>
        {detail ? <p>{detail}</p> : null}
        <FailureActions actions={actions} />
        {browserText ? <FailureReport text={browserText} /> : null}
      </div>
    </div>
  );
}

function FailureActions({ actions }: { actions: readonly SceneFailureAction[] }) {
  return (
    <div className={styles.actions}>
      {actions.map((action) => <FailureAction key={action.label} action={action} />)}
    </div>
  );
}

function FailureAction({ action }: { action: SceneFailureAction }) {
  if (action.href) return <a href={action.href}>{action.label}</a>;
  return <button type="button" onClick={action.onClick}>{action.label}</button>;
}

function FailureReport({ text }: { text: string }) {
  return (
    <details className={styles.report}>
      <summary>What the browser reported</summary>
      <p>{text}</p>
    </details>
  );
}
