/**
 * The record format of the "Questions and theories" layer. Three kinds of record are kept apart, as
 * docs/philosophy.md asks: a fact (measured or excavated), an evidence entry (a point for or against a theory,
 * with its source), and a theory (a claim with an owner and a status). An open question ties them together.
 * No record here changes a site's published record, and none carries a location.
 */

export type SourceKind = "excavation-report" | "peer-reviewed-paper" | "popular-book" | "project-page" | "other";

export type TheorySource = {
  /** Author, year, title, where published. */
  citation: string;
  kind: SourceKind;
  /** An https address that was opened when the record was written. Shown only if its host is on the allowlist. */
  url?: string;
};

export type FactKind = "measurement" | "excavation" | "experiment" | "text";

/** A measured or excavated fact. It carries no interpretation. */
export type Fact = {
  id: string;
  statement: string;
  siteIds: readonly string[];
  kind: FactKind;
  source: TheorySource;
};

export type EvidenceKind = FactKind | "argument";

/** One point that bears on a theory. Whether it counts for or against is said by the theory that lists it. */
export type EvidenceEntry = {
  id: string;
  /** One or two sentences. */
  summary: string;
  kind: EvidenceKind;
  source: TheorySource;
  /** The fact this entry rests on, when it rests on one. */
  factId?: string;
  /** Who makes the point. Expected when the kind is "argument". */
  madeBy?: string;
};

/** The ladder in docs/philosophy.md, strongest first. */
export type TheoryStatus = "well-supported" | "contested" | "weakly-supported" | "unsupported-so-far" | "shelved";

export type StatusChange = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  status: TheoryStatus;
  reason: string;
};

export type Theory = {
  /** A slug: lower-case words joined by hyphens. */
  id: string;
  title: string;
  /** What the theory says, worded as its proponents' claim. */
  claim: string;
  proponents: readonly string[];
  /** Where the claim itself is made. At least one. */
  claimSources: readonly TheorySource[];
  /** Every id the app uses for the sites it touches: curated ids and world-catalogue ids alike. */
  siteIds: readonly string[];
  /** Evidence ids. */
  evidenceFor: readonly string[];
  evidenceAgainst: readonly string[];
  wouldSettle: string;
  /** Always equal to the status of the last entry of `statusLog`. */
  status: TheoryStatus;
  /** Append only: a change of status adds an entry, and no entry is edited or removed. */
  statusLog: readonly StatusChange[];
};

/** A question worth showing. With no theory ids it stands as an honest "not known". */
export type OpenQuestion = {
  id: string;
  question: string;
  siteIds: readonly string[];
  /** Walk-view landmark ids (lib/walk/*Landmarks.ts) the question belongs beside. */
  landmarkIds?: readonly string[];
  factIds: readonly string[];
  theoryIds: readonly string[];
};

/** Everything one data file contributes. */
export type TheoryRecords = {
  facts: readonly Fact[];
  evidence: readonly EvidenceEntry[];
  theories: readonly Theory[];
  questions: readonly OpenQuestion[];
};
