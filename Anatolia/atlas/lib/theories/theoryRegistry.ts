/**
 * Every record of the "Questions and theories" layer, and the lookups the app needs over them.
 * To add a site, write its data files and add its records to SITE_RECORDS.
 */

import { GIZA_RECORDS } from "./gizaTheories";
import { GOBEKLI_TEPE_RECORDS } from "./gobekliTepeTheories";
import type { EvidenceEntry, Fact, OpenQuestion, Theory, TheoryRecords } from "./theoryTypes";

const SITE_RECORDS: readonly TheoryRecords[] = [GOBEKLI_TEPE_RECORDS, GIZA_RECORDS];

export const ALL_FACTS: readonly Fact[] = SITE_RECORDS.flatMap((records) => records.facts);
export const ALL_EVIDENCE: readonly EvidenceEntry[] = SITE_RECORDS.flatMap((records) => records.evidence);
export const ALL_THEORIES: readonly Theory[] = SITE_RECORDS.flatMap((records) => records.theories);
export const ALL_QUESTIONS: readonly OpenQuestion[] = SITE_RECORDS.flatMap((records) => records.questions);

function byId<Record extends { id: string }>(records: readonly Record[]): ReadonlyMap<string, Record> {
  return new Map(records.map((record) => [record.id, record]));
}

const FACTS_BY_ID = byId(ALL_FACTS);
const EVIDENCE_BY_ID = byId(ALL_EVIDENCE);
const THEORIES_BY_ID = byId(ALL_THEORIES);
const QUESTIONS_BY_ID = byId(ALL_QUESTIONS);

export function findFact(id: string | undefined): Fact | null {
  return FACTS_BY_ID.get(id ?? "") ?? null;
}

export function findEvidence(id: string | undefined): EvidenceEntry | null {
  return EVIDENCE_BY_ID.get(id ?? "") ?? null;
}

export function findTheory(id: string | undefined): Theory | null {
  return THEORIES_BY_ID.get(id ?? "") ?? null;
}

export function findQuestion(id: string | undefined): OpenQuestion | null {
  return QUESTIONS_BY_ID.get(id ?? "") ?? null;
}

/** The entries behind a list of evidence ids, in the order given. An unknown id is left out. */
export function evidenceEntries(ids: readonly string[]): EvidenceEntry[] {
  return ids.flatMap((id) => findEvidence(id) ?? []);
}

/** True when the theory lists this id, whether it is a curated site id or a world-catalogue id. */
export function theoryTouchesSite(theory: Theory, siteId: string): boolean {
  return theory.siteIds.includes(siteId);
}

export function theoriesForSite(siteId: string): Theory[] {
  return ALL_THEORIES.filter((theory) => theoryTouchesSite(theory, siteId));
}

export function questionsForSite(siteId: string): OpenQuestion[] {
  return ALL_QUESTIONS.filter((question) => question.siteIds.includes(siteId));
}

/** A landmark id is only unique within its site, so the site id is needed too. */
export function questionsForLandmark(siteId: string, landmarkId: string): OpenQuestion[] {
  return questionsForSite(siteId).filter((question) => question.landmarkIds?.includes(landmarkId) ?? false);
}

/** The theories that try to answer a question, in the order the question lists them. */
export function theoriesForQuestion(question: OpenQuestion): Theory[] {
  return question.theoryIds.flatMap((id) => findTheory(id) ?? []);
}
