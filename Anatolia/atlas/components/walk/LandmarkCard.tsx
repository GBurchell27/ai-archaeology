"use client";

import type { PlacedLandmark } from "@/lib/walk/landmarks";
import styles from "./WalkView.module.css";

/**
 * What the walker has come up to. It appears by itself, because with the pointer locked nothing can be clicked.
 * The region stays mounted while empty so a screen reader announces each new card politely.
 */
export function LandmarkCard({ placed }: { placed: PlacedLandmark | null }) {
  const landmark = placed?.landmark;
  return (
    <aside className={styles.landmark} aria-live="polite" aria-label="Landmark nearby" data-role="walk-landmark" data-shown={Boolean(landmark)}>
      {landmark ? (
        <>
          <h2 className={styles.landmarkTitle}>{landmark.name}</h2>
          <p>{landmark.description}</p>
          <p className={styles.landmarkSource}>
            Source:{" "}
            <a href={landmark.source.url} target="_blank" rel="noreferrer">
              {landmark.source.label}
            </a>
          </p>
        </>
      ) : null}
    </aside>
  );
}
