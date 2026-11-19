"use client";

import { useEffect, useRef, useState } from "react";
import { QuestionList } from "@/components/theories/QuestionList";
import { TheoryCard } from "@/components/theories/TheoryCard";
import { useKeyCommand } from "./useWalkKeys";
import card from "./LandmarkCard.module.css";

const CLOSE_KEY = "Escape";

/** Moves the focus with the view: to the way back when a theory opens, and back to its button when it closes. */
function useFocusFollowsTheory(theoryId: string | null) {
  const container = useRef<HTMLDivElement>(null);
  const lastOpenedId = useRef<string | null>(null);
  useEffect(() => {
    const selector = theoryId ? "[data-action='walk-theory-back']" : `[data-theory='${lastOpenedId.current}']`;
    if (theoryId || lastOpenedId.current) container.current?.querySelector<HTMLElement>(selector)?.focus();
    lastOpenedId.current = theoryId;
  }, [theoryId]);
  return container;
}

/**
 * The open questions about a landmark, and in their place the record of a theory the visitor opened, with a way back.
 * Escape goes back too, once the pointer is free. The atlas reports each theory; it does not choose between them.
 */
export function LandmarkQuestions({ questionIds }: { questionIds: readonly string[] }) {
  const [openTheoryId, setOpenTheoryId] = useState<string | null>(null);
  const container = useFocusFollowsTheory(openTheoryId);
  useKeyCommand(CLOSE_KEY, () => setOpenTheoryId(null));
  return (
    <div ref={container} className={card.questions}>
      {openTheoryId ? (
        <div className={card.theory} data-role="walk-theory" data-theory={openTheoryId}>
          <button type="button" className={card.back} data-action="walk-theory-back" onClick={() => setOpenTheoryId(null)}>
            <span aria-hidden="true">←</span> Questions
          </button>
          <TheoryCard theoryId={openTheoryId} />
        </div>
      ) : (
        <QuestionList questionIds={questionIds} onOpenTheory={setOpenTheoryId} />
      )}
    </div>
  );
}
