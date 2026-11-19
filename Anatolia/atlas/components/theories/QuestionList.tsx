"use client";

import ui from "@/components/globe/chrome/chrome.module.css";
import { findQuestion, theoriesForQuestion } from "@/lib/theories/theoryRegistry";
import { currentStatus } from "@/lib/theories/theoryStatus";
import styles from "./TheoryCard.module.css";

/**
 * Open questions, each with the theories that try to answer it as buttons. A question with no theory is
 * shown as not known. Unknown ids are left out.
 */
export function QuestionList(props: {
  questionIds: readonly string[];
  onOpenTheory(theoryId: string): void;
  /** The theory whose card is showing, so its button reads as pressed. */
  openTheoryId?: string | null;
}) {
  const questions = props.questionIds.flatMap((id) => findQuestion(id) ?? []);
  if (!questions.length) return null;
  return (
    <ul className={styles.questions} aria-label="Open questions" data-role="question-list">
      {questions.map((question) => {
        const theories = theoriesForQuestion(question);
        return (
          <li key={question.id} data-question={question.id}>
            <p className={`${ui.serif} ${styles.question}`}>{question.question}</p>
            {theories.length ? (
              <ul className={styles.theories} aria-label={`Theories on: ${question.question}`}>
                {theories.map((theory) => (
                  <li key={theory.id}>
                    <button
                      type="button"
                      className={`${ui.button} ${styles.theoryButton}`}
                      data-action="open-theory"
                      data-theory={theory.id}
                      aria-pressed={props.openTheoryId === theory.id}
                      onClick={() => props.onOpenTheory(theory.id)}
                    >
                      <span>{theory.title} <span className={styles.theoryStatus}>· {currentStatus(theory).label}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className={ui.muted}>Not known. No theory is recorded yet.</p>}
          </li>
        );
      })}
    </ul>
  );
}
