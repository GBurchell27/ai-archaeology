/**
 * The puzzles index: every standing question grouped by site, each with the facts it rests on, the theories
 * that try to explain it, and the experiments those theories list, marked by which theory each one supports
 * or goes against. It derives everything from the records and adds no reading of its own.
 */

import { ALL_QUESTIONS, evidenceEntries, findFact, theoriesForQuestion } from "./theoryRegistry";
import type { EvidenceEntry, Fact, OpenQuestion, Theory } from "./theoryTypes";

/** Display names, keyed by the first site id a question lists. A site without one is shown by its id. */
const SITE_NAMES: Readonly<Record<string, string>> = {
  "gobekli-tepe": "Göbekli Tepe",
  Q12508: "Giza",
};

export type ExperimentSide = "supports" | "goes-against";

/** One experiment and every theory of the question it bears on. The side is the listing theory's, not the entry's. */
export type PuzzleExperiment = {
  entry: EvidenceEntry;
  bearings: readonly { theory: Theory; side: ExperimentSide }[];
};

export type Puzzle = {
  question: OpenQuestion;
  facts: readonly Fact[];
  /** Empty when the question stands as "not known". */
  theories: readonly Theory[];
  experiments: readonly PuzzleExperiment[];
};

export type SitePuzzles = { siteId: string; siteName: string; puzzles: readonly Puzzle[] };

/** Every `experiment` entry these theories list, once each, in the order first met. */
export function experimentsBearingOn(theories: readonly Theory[]): PuzzleExperiment[] {
  const byEntryId = new Map<string, { entry: EvidenceEntry; bearings: { theory: Theory; side: ExperimentSide }[] }>();
  for (const theory of theories) {
    const sides = [["supports", theory.evidenceFor], ["goes-against", theory.evidenceAgainst]] as const;
    for (const [side, ids] of sides) {
      for (const entry of evidenceEntries(ids)) {
        if (entry.kind !== "experiment") continue;
        const listed = byEntryId.get(entry.id) ?? { entry, bearings: [] };
        listed.bearings.push({ theory, side });
        byEntryId.set(entry.id, listed);
      }
    }
  }
  return [...byEntryId.values()];
}

export function puzzleFor(question: OpenQuestion): Puzzle {
  const theories = theoriesForQuestion(question);
  return {
    question,
    facts: question.factIds.flatMap((id) => findFact(id) ?? []),
    theories,
    experiments: experimentsBearingOn(theories),
  };
}

/** Sites in the order their first question appears; questions in the order recorded. */
export function puzzlesBySite(questions: readonly OpenQuestion[] = ALL_QUESTIONS): SitePuzzles[] {
  const bySiteId = new Map<string, Puzzle[]>();
  for (const question of questions) {
    const siteId = question.siteIds[0] ?? "";
    bySiteId.set(siteId, [...(bySiteId.get(siteId) ?? []), puzzleFor(question)]);
  }
  return [...bySiteId].map(([siteId, puzzles]) => ({ siteId, siteName: SITE_NAMES[siteId] ?? siteId, puzzles }));
}
