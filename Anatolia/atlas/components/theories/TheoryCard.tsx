"use client";

import { useId } from "react";
import { SafeLink } from "@/components/SafeLink";
import ui from "@/components/globe/chrome/chrome.module.css";
import { evidenceEntries, findFact, findTheory } from "@/lib/theories/theoryRegistry";
import { currentStatus, statusLabel } from "@/lib/theories/theoryStatus";
import type { EvidenceEntry, EvidenceKind, Theory, TheorySource } from "@/lib/theories/theoryTypes";
import styles from "./TheoryCard.module.css";

const KIND_LABELS: Record<EvidenceKind, string> = {
  measurement: "Measurement",
  excavation: "Excavation",
  experiment: "Experiment",
  text: "Text",
  argument: "Argument",
};

function SourceLine({ source }: { source: TheorySource }) {
  return <span className={`${ui.prose} ${styles.source}`}><SafeLink href={source.url}>{source.citation}</SafeLink></span>;
}

function EvidenceItem({ entry }: { entry: EvidenceEntry }) {
  const fact = findFact(entry.factId);
  return (
    <li className={styles.entry} data-kind={entry.kind}>
      <span className={entry.kind === "experiment" ? `${styles.kind} ${styles.experiment}` : styles.kind}>{KIND_LABELS[entry.kind]}</span>
      <p className={styles.summary}>{entry.summary}</p>
      {entry.kind === "argument" && entry.madeBy ? <p className={styles.note}>Argued by {entry.madeBy}.</p> : null}
      {fact ? <p className={styles.note}>Rests on the fact: {fact.statement}</p> : null}
      <SourceLine source={entry.source} />
    </li>
  );
}

function EvidenceSection({ heading, ids, side }: { heading: string; ids: readonly string[]; side: "for" | "against" }) {
  const entries = evidenceEntries(ids);
  return (
    <section className={styles.section} data-role={`evidence-${side}`}>
      <h4 className={ui.eyebrow}>{heading}</h4>
      {entries.length ? (
        <ul className={styles.entries}>{entries.map((entry) => <EvidenceItem key={entry.id} entry={entry} />)}</ul>
      ) : <p className={styles.note}>None recorded yet.</p>}
    </section>
  );
}

function StatusHistory({ theory }: { theory: Theory }) {
  return (
    <details className={styles.history}>
      <summary>Status history ({theory.statusLog.length})</summary>
      <ol className={styles.log}>
        {theory.statusLog.map((change, index) => (
          <li key={index}>
            <time dateTime={change.date} className={ui.numeric}>{change.date}</time> · {statusLabel(change.status)}. {change.reason}
          </li>
        ))}
      </ol>
    </details>
  );
}

/**
 * One theory as the atlas records it: who proposes it, where it stands and why, the evidence on each side,
 * what would settle it, and its sources. It reports; it does not conclude. An unknown id renders nothing.
 */
export function TheoryCard({ theoryId }: { theoryId: string }) {
  const titleId = useId();
  const theory = findTheory(theoryId);
  if (!theory) return null;
  const status = currentStatus(theory);
  return (
    <article className={styles.card} aria-labelledby={titleId} data-role="theory-card" data-theory={theory.id}>
      <p className={ui.eyebrow}>Theory</p>
      <h3 id={titleId} className={`${ui.serif} ${styles.title}`}>{theory.title}</h3>
      <p className={styles.proponents}><span className={ui.eyebrow}>Proposed by</span>{theory.proponents.join("; ")}</p>
      <p className={`${ui.serif} ${styles.claim}`}>{theory.claim}</p>
      <p className={styles.status} data-status={status.status}>
        <span className={styles.statusLabel}>{status.label}</span>
        <span className={ui.muted}>Status since <time dateTime={status.date} className={ui.numeric}>{status.date}</time></span>
        {status.reason}
      </p>
      <EvidenceSection heading="Evidence for" ids={theory.evidenceFor} side="for" />
      <EvidenceSection heading="Evidence against" ids={theory.evidenceAgainst} side="against" />
      <section className={styles.section}>
        <h4 className={ui.eyebrow}>What would settle it</h4>
        <p className={styles.summary}>{theory.wouldSettle}</p>
      </section>
      <section className={styles.section}>
        <h4 className={ui.eyebrow}>Where the claim is made</h4>
        <ul className={styles.sources}>
          {theory.claimSources.map((source) => <li key={source.citation}><SourceLine source={source} /></li>)}
        </ul>
      </section>
      <StatusHistory theory={theory} />
    </article>
  );
}
