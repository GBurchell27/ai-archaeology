"use client";

import type { MoveMode } from "@/lib/walk/walkMovement";
import { pointerLockTrigger } from "./pointerLockTrigger";
import styles from "./WalkView.module.css";

const MODE_LABEL: Record<MoveMode, string> = { walk: "Walking", fly: "Flying" };
const OTHER_MODE_HINT: Record<MoveMode, string> = { walk: "F to fly", fly: "F to walk" };
const OTHER_MODE_ACTION: Record<MoveMode, string> = { walk: "Switch to flying", fly: "Switch to walking" };

/**
 * The way in: a small chip low on the screen, so the view stays in sight. Clicking it, or the scene, starts the look.
 * It carries the two things a first visit needs; the rest of the keys are behind the Keys disclosure.
 * `shown` is false until there is something to look around in, and with the pointer locked it is out of the way.
 * `compact` is for a visitor who has set off: one line at the foot of the screen, clear of the names over the markers.
 */
export function LookPrompt({ shown, compact, tip }: { shown: boolean; compact: boolean; tip: string }) {
  return (
    // Hidden, not unmounted: see pointerLockTrigger.
    <button type="button" className={styles.prompt} hidden={!shown} data-compact={compact} data-role="walk-prompt" {...pointerLockTrigger}>
      <strong className={styles.promptTitle}>Click to look around</strong>
      <span className={styles.promptHint}>W A S D to move · arrows to turn · scroll down to fly</span>
      <span className={styles.promptHint}>{tip}</span>
    </button>
  );
}

/** Says whether the visitor is walking or flying, and switches between the two. */
export function ModeButton({ mode, locked, onToggleMode }: { mode: MoveMode; locked: boolean; onToggleMode: () => void }) {
  return (
    <button
      type="button"
      className={styles.mode}
      data-locked={locked}
      data-role="walk-mode"
      aria-label={`${MODE_LABEL[mode]}. ${OTHER_MODE_ACTION[mode]} (F)`}
      onClick={onToggleMode}
    >
      <strong>{MODE_LABEL[mode]}</strong> <span>{OTHER_MODE_HINT[mode]}</span>
    </button>
  );
}
