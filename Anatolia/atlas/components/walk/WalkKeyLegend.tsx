"use client";

import styles from "./WalkView.module.css";

const KEY_LEGEND: ReadonlyArray<readonly [keys: string, action: string]> = [
  ["Mouse", "Look around"],
  ["W A S D", "Move"],
  ["← →", "Turn without the mouse (↑ ↓ also move)"],
  ["Page Up / Page Down", "Look up / down without the mouse"],
  ["Shift", "Move faster"],
  ["F", "Switch between walking and flying"],
  ["Scroll or E / Q", "Up / down (scroll down to rise; it also takes off)"],
  ["R", "Return to the start"],
  ["Esc", "Free the pointer, then close open panels"],
];

/** Shared by the disclosures of the right-hand column, so opening one closes the other. */
export const WALK_PANEL_GROUP = "walk-panel";

/** Every key of the walk, closed until asked for. `hint` is one sentence about the reconstruction on screen. */
export function WalkKeyLegend({ locked, hint }: { locked: boolean; hint?: string }) {
  return (
    <details className={styles.disclosure} name={WALK_PANEL_GROUP} data-locked={locked} data-role="walk-keys">
      <summary>Keys</summary>
      <dl className={styles.legend}>
        {KEY_LEGEND.map(([keys, action]) => (
          <div key={keys} className={styles.legendRow}>
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
      {hint ? <p className={styles.legendHint}>{hint}</p> : null}
    </details>
  );
}
