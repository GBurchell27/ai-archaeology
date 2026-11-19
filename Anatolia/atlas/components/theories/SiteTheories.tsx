"use client";

import type { ReactNode } from "react";
import ui from "@/components/globe/chrome/chrome.module.css";
import { ALL_QUESTIONS, theoriesForSite } from "@/lib/theories/theoryRegistry";
import { QuestionList } from "./QuestionList";

/** Every question asked of the site, and any question a theory about the site answers. */
function questionIdsForSite(siteId: string): string[] {
  const theoryIds = new Set(theoriesForSite(siteId).map((theory) => theory.id));
  return ALL_QUESTIONS
    .filter((question) => question.siteIds.includes(siteId) || question.theoryIds.some((id) => theoryIds.has(id)))
    .map((question) => question.id);
}

/**
 * The "Questions and theories" section of a site card: what has been asked and proposed about the site, kept
 * apart from its published record. Nothing for a site without any. The card it sits in supplies its own
 * section and heading styles, and may put an open theory's card in `children`.
 */
export function SiteTheories(props: {
  siteId: string;
  onOpenTheory(theoryId: string): void;
  openTheoryId?: string | null;
  className?: string;
  headingClassName?: string;
  children?: ReactNode;
}) {
  const questionIds = questionIdsForSite(props.siteId);
  if (!questionIds.length) return null;
  return (
    <section className={props.className} data-role="site-theories" aria-label="Questions and theories">
      <h3 className={props.headingClassName}>Questions and theories</h3>
      <p className={ui.muted}>What people have asked and proposed about this site. Not part of its published record.</p>
      <QuestionList questionIds={questionIds} onOpenTheory={props.onOpenTheory} openTheoryId={props.openTheoryId} />
      {props.children}
    </section>
  );
}
