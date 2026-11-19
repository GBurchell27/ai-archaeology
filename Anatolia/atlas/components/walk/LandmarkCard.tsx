"use client";

import { useId, useState } from "react";
import { questionsForLandmark } from "@/lib/theories/theoryRegistry";
import type { Landmark, PlacedLandmark } from "@/lib/walk/landmarks";
import type { LandmarkTabId } from "@/lib/walk/landmarkTabs";
import { LandmarkQuestions } from "./LandmarkQuestions";
import { LandmarkTabs, landmarkPanelId, landmarkTabId } from "./LandmarkTabs";
import card from "./LandmarkCard.module.css";
import styles from "./WalkView.module.css";

function LandmarkAbout({ landmark }: { landmark: Landmark }) {
  return (
    <>
      <p>{landmark.description}</p>
      <p className={styles.landmarkSource}>
        Source:{" "}
        <a href={landmark.source.url} target="_blank" rel="noreferrer">
          {landmark.source.label}
        </a>
      </p>
    </>
  );
}

/** One landmark's card. With open questions on record it has two tabs; without, only its text, and no tab row. */
function LandmarkCardBody({ landmark, questionIds }: { landmark: Landmark; questionIds: readonly string[] }) {
  const baseId = useId();
  const [tab, setTab] = useState<LandmarkTabId>("about");
  const title = <h2 className={styles.landmarkTitle}>{landmark.name}</h2>;
  if (questionIds.length === 0) {
    return <>{title}<div className={styles.landmarkAbout}><LandmarkAbout landmark={landmark} /></div></>;
  }
  const panel = { role: "tabpanel", id: landmarkPanelId(baseId, tab), "aria-labelledby": landmarkTabId(baseId, tab) };
  return (
    <>
      {title}
      <LandmarkTabs baseId={baseId} landmarkName={landmark.name} selected={tab} onSelect={setTab} />
      {tab === "about" ? (
        <div {...panel} className={styles.landmarkAbout}><LandmarkAbout landmark={landmark} /></div>
      ) : (
        // Not read out as it changes: the visitor opened it, and the focus moves with it.
        <div {...panel} aria-live="off"><LandmarkQuestions questionIds={questionIds} /></div>
      )}
    </>
  );
}

/**
 * What the walker has come up to. It appears by itself, because with the pointer locked nothing can be clicked.
 * The region stays mounted while empty so a screen reader announces each new card politely.
 * The body is keyed by landmark, so each new card opens on its first tab.
 */
export function LandmarkCard({ siteId, placed }: { siteId: string; placed: PlacedLandmark | null }) {
  const landmark = placed?.landmark;
  return (
    <aside className={`${styles.landmark} ${card.card}`} aria-live="polite" aria-label="Landmark nearby" data-role="walk-landmark" data-shown={Boolean(landmark)}>
      {landmark ? (
        <LandmarkCardBody key={landmark.id} landmark={landmark} questionIds={questionsForLandmark(siteId, landmark.id).map((question) => question.id)} />
      ) : null}
    </aside>
  );
}
