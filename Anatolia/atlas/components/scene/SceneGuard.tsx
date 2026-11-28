"use client";

import type { ReactNode } from "react";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import type { SceneFailureAction } from "./SceneFailureNotice";
import { WebglGate } from "./WebglGate";

type SceneGuardProps = {
  /** A new key remounts the view, which is how Try again clears a caught error. */
  resetKey: string;
  exitLabel: string;
  onExit: () => void;
  /** Omitted when `onExit` is already the retry, so the card does not offer the same action twice. */
  onRetry?: () => void;
  children: ReactNode;
};

/** Keeps a WebGL or render failure inside one view, with a way out and, when it differs, a way to try again. */
export function SceneGuard({ resetKey, exitLabel, onExit, onRetry, children }: SceneGuardProps) {
  const actions = guardActions(exitLabel, onExit, onRetry);
  return (
    <SceneErrorBoundary key={resetKey} actions={actions}>
      <WebglGate actions={actions}>{children}</WebglGate>
    </SceneErrorBoundary>
  );
}

function guardActions(exitLabel: string, onExit: () => void, onRetry?: () => void): SceneFailureAction[] {
  const actions: SceneFailureAction[] = [{ label: exitLabel, onClick: onExit }];
  if (onRetry) actions.push({ label: "Try again", onClick: onRetry });
  return actions;
}
