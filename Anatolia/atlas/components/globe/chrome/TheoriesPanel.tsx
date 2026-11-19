"use client";

import { useMemo } from "react";
import { QuestionList } from "@/components/theories/QuestionList";
import { TheoryCard } from "@/components/theories/TheoryCard";
import { puzzlesBySite } from "@/lib/theories/puzzlesIndex";
import { ALL_QUESTIONS, ALL_THEORIES, findTheory } from "@/lib/theories/theoryRegistry";
import { ChevronIcon } from "./ExplorerIcons";
import ui from "./chrome.module.css";
import { PanelShell } from "./PanelShell";
import styles from "./TheoriesPanel.module.css";

/** Every question, site by site, with the theories that try to answer it as buttons. */
function TheoryIndex(props: { onOpenTheory(theoryId: string): void }) {
  const sites = useMemo(() => puzzlesBySite(), []);
  return (
    <>
      <p className={styles.intro}>
        What people have asked and proposed about these sites, each idea with its owner, its evidence and where it stands.
        Pick one to ring the sites it is about. Nothing here changes a site&rsquo;s published record.
      </p>
      {sites.map((site) => (
        <section key={site.siteId} className={styles.site} aria-label={site.siteName} data-theory-site={site.siteId}>
          <h3 className={`${ui.eyebrow} ${styles.siteName}`}>{site.siteName}</h3>
          <QuestionList questionIds={site.puzzles.map((puzzle) => puzzle.question.id)} onOpenTheory={props.onOpenTheory} />
        </section>
      ))}
    </>
  );
}

/**
 * The theory lens. With no theory picked it lists them all; with one picked it shows that theory's card, and the
 * globe rings the sites the theory is about. The ring marks a subject, not a find.
 */
export function TheoriesPanel(props: {
  /** The theory the lens is on, or null for the list. */
  theoryId: string | null;
  /** How many of that theory's sites the globe has ringed. */
  ringedSites: number;
  onOpenTheory(theoryId: string): void;
  onClearTheory(): void;
  onShowOnGlobe(): void;
  onClose(): void;
}) {
  const theory = findTheory(props.theoryId ?? undefined);
  const { ringedSites } = props;
  return (
    <PanelShell
      // A fresh frame for each theory and for the list: focus moves into it and the body starts at the top.
      key={theory?.id ?? "index"}
      dataRole="theories-panel"
      eyebrow={`${ALL_THEORIES.length} theories on ${ALL_QUESTIONS.length} questions`}
      title="Questions and theories"
      closeLabel="Close the theories"
      onClose={props.onClose}
      toolbar={theory ? (
        <button type="button" className={ui.button} data-action="clear-theory" onClick={props.onClearTheory}>
          <ChevronIcon direction="left" />All theories
        </button>
      ) : undefined}
      footer={theory ? (
        <button type="button" className={`${ui.button} ${ui.buttonPrimary}`} data-action="theory-show-on-globe" disabled={ringedSites === 0} onClick={props.onShowOnGlobe}>
          Show on globe
        </button>
      ) : undefined}
    >
      {theory ? (
        <>
          {ringedSites > 0 ? (
            <p className={styles.lit} role="status" data-role="theory-lens-note">
              {ringedSites === 1 ? "The ringed site on the globe is the one" : `The ${ringedSites} ringed sites on the globe are the ones`} this
              theory is about. A ring marks a subject, not a find.
            </p>
          ) : null}
          <TheoryCard theoryId={theory.id} />
        </>
      ) : <TheoryIndex onOpenTheory={props.onOpenTheory} />}
    </PanelShell>
  );
}
