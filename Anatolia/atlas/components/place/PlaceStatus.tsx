"use client";

import { FAILURE_TEXT, type PlaceFailure } from "@/lib/place/placeTerrain";
import styles from "./PlaceView.module.css";

export function PlaceLoading({ name, draping }: { name: string | null; draping: boolean }) {
  return (
    <div className={styles.status} role="status" aria-live="polite">
      <p className={styles.statusTitle}>
        {draping ? "Laying imagery over the relief" : `Building 15 m terrain for ${name ?? "this place"} from open elevation data`}…
      </p>
      <p className={styles.statusBody}>
        A 10 km window is cut from the global surface model and satellite mosaic. The first visit to a place takes 10–15 seconds; after that it opens at once.
      </p>
      <span className={styles.progress} aria-hidden="true" />
    </div>
  );
}

export function PlaceError(props: { failure: PlaceFailure; onRetry: () => void; onExit: () => void }) {
  const text = FAILURE_TEXT[props.failure];
  return (
    <div className={styles.status} role="alert">
      <p className={styles.statusTitle}>{text.title}</p>
      <p className={styles.statusBody}>{text.body}</p>
      <div className={styles.statusActions}>
        {props.failure === "outside" || props.failure === "unavailable" ? null : <button type="button" className={styles.reset} onClick={props.onRetry}>Try again</button>}
        <button type="button" className={styles.reset} onClick={props.onExit}>← Back to the globe</button>
      </div>
    </div>
  );
}
