import type { Metadata } from "next";
import { SafeLink } from "@/components/SafeLink";
import ui from "@/components/globe/chrome/chrome.module.css";
import cards from "@/components/theories/TheoryCard.module.css";
import { puzzlesBySite, type Puzzle, type PuzzleExperiment } from "@/lib/theories/puzzlesIndex";
import { currentStatus } from "@/lib/theories/theoryStatus";
import type { Fact, FactKind, Theory, TheorySource } from "@/lib/theories/theoryTypes";
import styles from "./puzzles.module.css";
import { ThemeFromPreference } from "./ThemeFromPreference";

export const metadata: Metadata = {
  title: "Standing questions · Atlas of early monuments",
  description: "The open questions the atlas records, site by site: the measured facts each rests on, the theories that try to explain it, and the experiments that bear on it.",
};

const FACT_KIND_LABELS: Record<FactKind, string> = {
  measurement: "Measurement",
  excavation: "Excavation",
  experiment: "Experiment",
  text: "Text",
};

const SIDE_LABELS = { supports: "Supports", "goes-against": "Goes against" } as const;

function theoryHref(theoryId: string): string {
  return `/?view=globe&theory=${encodeURIComponent(theoryId)}`;
}

function SourceLine({ source }: { source: TheorySource }) {
  return <span className={`${ui.prose} ${cards.source}`}><SafeLink href={source.url}>{source.citation}</SafeLink></span>;
}

function FactItem({ fact }: { fact: Fact }) {
  return (
    <li className={cards.entry}>
      <span className={fact.kind === "experiment" ? `${cards.kind} ${cards.experiment}` : cards.kind}>{FACT_KIND_LABELS[fact.kind]}</span>
      <p className={cards.summary}>{fact.statement}</p>
      <SourceLine source={fact.source} />
    </li>
  );
}

function TheoryItem({ theory }: { theory: Theory }) {
  return (
    <li className={cards.entry} data-theory={theory.id}>
      <a className={`${ui.serif} ${styles.theoryLink}`} href={theoryHref(theory.id)}>{theory.title}</a>
      <p className={cards.note}><span className={styles.status}>{currentStatus(theory).label}</span> · Proposed by {theory.proponents.join("; ")}</p>
      <p className={cards.summary}>{theory.claim}</p>
    </li>
  );
}

function ExperimentItem({ experiment }: { experiment: PuzzleExperiment }) {
  return (
    <li className={cards.entry} data-experiment={experiment.entry.id}>
      <span className={`${cards.kind} ${cards.experiment}`}>Experiment</span>
      <p className={cards.summary}>{experiment.entry.summary}</p>
      <ul className={styles.bearings}>
        {experiment.bearings.map(({ theory, side }) => (
          <li key={theory.id} data-side={side}>
            <span className={styles.side}>{SIDE_LABELS[side]}</span> <a href={theoryHref(theory.id)}>{theory.title}</a>
          </li>
        ))}
      </ul>
      <SourceLine source={experiment.entry.source} />
    </li>
  );
}

function PuzzleCard({ puzzle }: { puzzle: Puzzle }) {
  const { question, facts, theories, experiments } = puzzle;
  return (
    <article className={styles.puzzle} aria-labelledby={question.id} data-question={question.id}>
      <h3 id={question.id} className={`${ui.serif} ${styles.question}`}>{question.question}</h3>
      <section className={styles.part}>
        <h4 className={ui.eyebrow}>What is measured or found</h4>
        {facts.length ? <ul className={cards.entries}>{facts.map((fact) => <FactItem key={fact.id} fact={fact} />)}</ul> : <p className={cards.note}>No fact is recorded yet.</p>}
      </section>
      <div className={styles.beside}>
        <section className={styles.part}>
          <h4 className={ui.eyebrow}>Theories that try to explain it</h4>
          {theories.length ? <ul className={cards.entries}>{theories.map((theory) => <TheoryItem key={theory.id} theory={theory} />)}</ul> : <p className={cards.summary}>Not known. No theory is recorded yet.</p>}
        </section>
        <section className={styles.part}>
          <h4 className={ui.eyebrow}>Experiments that bear on it</h4>
          {experiments.length ? <ul className={cards.entries}>{experiments.map((experiment) => <ExperimentItem key={experiment.entry.id} experiment={experiment} />)}</ul> : <p className={cards.note}>No experiment is recorded yet.</p>}
        </section>
      </div>
    </article>
  );
}

/** The puzzles index: a plain document of the standing questions. It reports who says what and concludes nothing. */
export default function PuzzlesPage() {
  const sites = puzzlesBySite();
  return (
    <div className={`${ui.scroll} ${styles.page}`}>
      <ThemeFromPreference />
      <div className={`${ui.prose} ${styles.sheet}`}>
        <header>
          <nav aria-label="Atlas" className={styles.back}><a href="/">← Back to the atlas</a></nav>
          <p className={ui.eyebrow}>Questions and theories</p>
          <h1 className={`${ui.serif} ${styles.title}`}>Standing questions</h1>
          <p className={`${ui.serif} ${styles.lead}`}>
            The open questions the atlas records, site by site. Each rests on measured or excavated facts with their sources.
            Beside each are the theories that try to explain it, with where each stands, and the experiments that tested what could be done with the tools of the time.
          </p>
          <p className={cards.note}>A theory&rsquo;s status follows the evidence listed under it, and can move. The atlas reports who says what; it does not conclude for the reader.</p>
          <nav aria-label="Sites" className={styles.contents}>
            {sites.map((site) => <a key={site.siteId} href={`#site-${site.siteId}`}>{site.siteName} ({site.puzzles.length})</a>)}
          </nav>
        </header>
        <main>
          {sites.map((site) => (
            <section key={site.siteId} aria-labelledby={`site-${site.siteId}`} data-site={site.siteId}>
              <h2 id={`site-${site.siteId}`} className={`${ui.serif} ${styles.site}`}>{site.siteName}</h2>
              {site.puzzles.map((puzzle) => <PuzzleCard key={puzzle.question.id} puzzle={puzzle} />)}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
