"use client";

import type { MoveMode } from "@/lib/walk/walkMovement";
import { pointerLockTrigger } from "./pointerLockTrigger";
import styles from "./WalkView.module.css";

const KEY_LEGEND: ReadonlyArray<readonly [keys: string, action: string]> = [
  ["Mouse", "Look around"],
  ["W A S D or arrows", "Move"],
  ["Shift", "Move faster"],
  ["F", "Switch between walking and flying"],
  ["E / Q", "Up / down while flying"],
  ["R", "Return to the start"],
  ["Esc", "Free the pointer"],
];

const MODE_LABEL: Record<MoveMode, string> = { walk: "Walking", fly: "Flying" };
const OTHER_MODE_HINT: Record<MoveMode, string> = { walk: "F to fly", fly: "F to walk" };

type WalkHudProps = { mode: MoveMode; locked: boolean; onToggleMode: () => void };

/** The entry prompt with the key legend while the pointer is free, and the mode toggle at all times. */
export function WalkHud({ mode, locked, onToggleMode }: WalkHudProps) {
  return (
    <>
      {/* Hidden, not unmounted, while locked: see pointerLockTrigger. */}
      <button type="button" className={styles.prompt} hidden={locked} data-role="walk-prompt" {...pointerLockTrigger}>
        <strong className={styles.promptTitle}>Click to look around</strong>
        <span className={styles.legend}>
          {KEY_LEGEND.map(([keys, action]) => (
            <span key={keys} className={styles.legendRow}>
              <kbd>{keys}</kbd>
              <span>{action}</span>
            </span>
          ))}
        </span>
      </button>
      <button type="button" className={styles.mode} data-locked={locked} data-role="walk-mode" onClick={onToggleMode}>
        <strong>{MODE_LABEL[mode]}</strong> <span>{OTHER_MODE_HINT[mode]}</span>
      </button>
    </>
  );
}
