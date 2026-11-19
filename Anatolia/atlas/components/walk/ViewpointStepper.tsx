"use client";

import styles from "./WalkView.module.css";

type ViewpointStepperProps = {
  count: number;
  /** The viewpoint last jumped to, counted from 0, or null before any jump. */
  current: number | null;
  locked: boolean;
  onStep: (step: 1 | -1) => void;
};

/** Steps the walker between the places the photographs were taken from, where the splat is sharp. */
export function ViewpointStepper({ count, current, locked, onStep }: ViewpointStepperProps) {
  return (
    <div className={styles.viewpoints} role="group" aria-label="Sharp viewpoints: where the photographs were taken" data-locked={locked} data-role="walk-viewpoints">
      <button type="button" data-action="viewpoint-previous" aria-label="Previous sharp viewpoint" onClick={() => onStep(-1)}>
        <span aria-hidden="true">‹</span>
      </button>
      <span aria-live="polite">{current === null ? "Sharp viewpoints" : `Viewpoint ${current + 1} of ${count}`}</span>
      <button type="button" data-action="viewpoint-next" aria-label="Next sharp viewpoint" onClick={() => onStep(1)}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
