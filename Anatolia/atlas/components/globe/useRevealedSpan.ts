"use client";

import { useCallback, useMemo, useState } from "react";
import { rangeWithRevealedEnd } from "@/lib/world/historyPlayhead";
import type { YearSpan } from "@/lib/world/worldEras";

/** The visitor's year range, plus the shorter window a history sweep has revealed. */
export function useRevealedSpan(initial: YearSpan) {
  const [bounds, setBoundsState] = useState(initial);
  const [playYear, setPlayYearState] = useState<number | null>(null);
  const setBounds = useCallback((span: YearSpan) => {
    setPlayYearState(null);
    setBoundsState(span);
  }, []);
  const setPlayYear = useCallback((year: number | null) => {
    setPlayYearState((current) => (current === year ? current : year));
  }, []);
  const shownSpan = useMemo(() => reveal(bounds, playYear), [bounds, playYear]);
  return { bounds, shownSpan, playYear, setBounds, setPlayYear };
}

function reveal(bounds: YearSpan, playYear: number | null): YearSpan {
  const shown = rangeWithRevealedEnd({ start: bounds[0], end: bounds[1] }, playYear);
  if (shown.start === bounds[0] && shown.end === bounds[1]) return bounds;
  return [shown.start, shown.end];
}
