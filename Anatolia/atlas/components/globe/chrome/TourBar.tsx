"use client";

import { CloseButton } from "@/components/chrome/CloseButton";
import { useDismissLayer } from "@/components/chrome/useDismissLayer";
import { DISMISS_PRIORITY } from "@/lib/chrome/dismissStack";
import type { WonderTourViewModel } from "../useWonderTour";
import { ChevronIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import styles from "./TourBar.module.css";

/**
 * Next and previous through the guided tour. Nothing advances on its own, and the flights
 * between stops become instant cuts under prefers-reduced-motion (GlobeFlight sees to that).
 * Escape ends the tour and leaves the site card: the tour sits in front of that card.
 */
export function TourBar(props: { tour: WonderTourViewModel }) {
  const { tour } = props;
  useDismissLayer(tour.at !== null, tour.end, DISMISS_PRIORITY.panel + 1);
  if (tour.at === null) return null;
  const caption = tour.caption;
  return (
    <nav
      className={`${ui.glass} ${styles.tour}`}
      aria-label={tour.title ? `${tour.title}, guided tour` : "Guided tour"}
      data-role="tour-bar"
      data-tour={tour.id ?? ""}
      data-stop={tour.stops[tour.at]?.siteId ?? ""}
    >
      <p className={styles.place} aria-live="polite">
        <span className={ui.eyebrow}>{tour.title || "Tour"}</span>
        <span className={ui.numeric}>{tour.at + 1} of {tour.stops.length}</span>
      </p>
      <CloseButton name="guided tour" action="tour-end" className={styles.end} onClick={tour.end} />
      {caption ? <p className={styles.caption} aria-live="polite">{caption}</p> : null}
      {tour.source ? <p className={styles.source}>{tour.source}</p> : null}
      <div className={styles.moves}>
        <button type="button" className={`${ui.button} ${styles.prev}`} data-action="tour-previous" disabled={tour.at === 0} onClick={() => tour.step(-1)}>
          <ChevronIcon direction="left" />Previous
        </button>
        <button type="button" className={`${ui.button} ${ui.buttonPrimary} ${styles.next}`} data-action="tour-next" disabled={tour.at === tour.stops.length - 1} onClick={() => tour.step(1)}>
          Next<ChevronIcon direction="right" />
        </button>
      </div>
    </nav>
  );
}
