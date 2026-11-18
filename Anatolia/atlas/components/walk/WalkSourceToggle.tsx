"use client";

import styles from "./WalkView.module.css";

/** Which reconstruction of a site the walk shows. */
export type WalkSource = "model" | "photographs";

const SOURCE_LABEL: Record<WalkSource, string> = { model: "Model", photographs: "Photographs" };
const SOURCES = Object.keys(SOURCE_LABEL) as WalkSource[];

type WalkSourceToggleProps = { source: WalkSource; locked: boolean; onChoose: (source: WalkSource) => void };

/** Two buttons to switch between the modelled site and the splat from photographs. */
export function WalkSourceToggle({ source, locked, onChoose }: WalkSourceToggleProps) {
  return (
    <div className={styles.sources} role="group" aria-label="Reconstruction shown" data-locked={locked} data-role="walk-source">
      {SOURCES.map((option) => (
        <button key={option} type="button" aria-pressed={option === source} data-source={option} onClick={() => onChoose(option)}>
          {SOURCE_LABEL[option]}
        </button>
      ))}
    </div>
  );
}
