/** The status ladder of docs/philosophy.md: its order, its wording, and the first entry of a theory's log. */

import type { StatusChange, Theory, TheoryStatus } from "./theoryTypes";

/** Strongest first. */
export const STATUS_LADDER: readonly TheoryStatus[] = ["well-supported", "contested", "weakly-supported", "unsupported-so-far", "shelved"];

export const STATUS_LABELS: Record<TheoryStatus, string> = {
  "well-supported": "Well supported",
  contested: "Contested",
  "weakly-supported": "Weakly supported",
  "unsupported-so-far": "Unsupported so far",
  shelved: "Shelved",
};

export const STATUS_MEANINGS: Record<TheoryStatus, string> = {
  "well-supported": "Several independent lines of evidence; survives the known objections.",
  contested: "Real evidence on both sides; specialists disagree.",
  "weakly-supported": "Some evidence or a coherent argument; serious gaps or objections.",
  "unsupported-so-far": "An idea with an argument but no evidence yet found for it.",
  shelved: "No evidence and no argument to examine. Kept on record, awaiting evidence.",
};

export const THEORY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function statusLabel(status: TheoryStatus): string {
  return STATUS_LABELS[status];
}

/** The last entry of the log: the theory's status now, with the date and reason of the last change. */
export function currentStatus(theory: Theory): StatusChange & { label: string } {
  const last = theory.statusLog[theory.statusLog.length - 1];
  return { ...last, label: statusLabel(last.status) };
}

/** The two status fields of a new theory. A later change appends to `statusLog` and updates `status`. */
export function firstStatus(date: string, status: TheoryStatus, reason: string): Pick<Theory, "status" | "statusLog"> {
  return { status, statusLog: [{ date, status, reason }] };
}
