"use client";

import type { WonderTourViewModel } from "../useGlobeExplorer";
import { ChevronIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./TourBar.module.css";

/**
 * Next and previous through the guided tour. Nothing advances on its own, and the flights
 * between stops become instant cuts under prefers-reduced-motion (GlobeFlight sees to that).
 */
export function TourBar(props: { tour: WonderTourViewModel }) {
  const { tour } = props;
  if (tour.at === null) return null;
  return (
    <nav className={`${ui.glass} ${styles.tour}`} aria-label="Guided tour" data-role="tour-bar">
      <p className={styles.place} aria-live="polite">
        <span className={ui.eyebrow}>Tour</span>
        <span className={ui.numeric}>{tour.at + 1} of {tour.stops.length}</span>
      </p>
      <button type="button" className={ui.button} data-action="tour-previous" disabled={tour.at === 0} onClick={() => tour.step(-1)}>
        <ChevronIcon direction="left" />Previous
      </button>
      <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="tour-next" disabled={tour.at === tour.stops.length - 1} onClick={() => tour.step(1)}>
        Next<ChevronIcon direction="right" />
      </button>
      <button type="button" className={`${ui.button} ${styles.end}`} data-action="tour-end" onClick={tour.end}>End</button>
    </nav>
  );
}
