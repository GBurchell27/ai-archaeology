import { useCallback, useMemo, useState } from "react";
import { PERIODS } from "@/lib/periods";
import { DEFAULT_SHOW_UNDATED } from "@/lib/settings/settingsPresets";
import { RANGE_END, RANGE_START, activeChip, rangeForChip, type YearRange } from "@/lib/timeline";
import { rangeWithRevealedEnd } from "@/lib/world/historyPlayhead";

export interface TimelineState {
  /** The range the visitor chose. The thumbs and the period chips follow this. */
  range: YearRange;
  /** The range actually drawn: the chosen range, or only up to the playhead while a sweep is in progress. */
  visibleRange: YearRange;
  showUndated: boolean;
  /** The period chip the chosen range matches, or an empty value for a custom range. */
  periodId: ReturnType<typeof activeChip>;
  selectPeriod: (id: string) => void;
  changeRange: (next: YearRange) => void;
  setShowUndated: (show: boolean) => void;
  setPlayYear: (year: number | null) => void;
}

export function useTimelineState(): TimelineState {
  const [range, setRange] = useState<YearRange>({ start: RANGE_START, end: RANGE_END });
  const [showUndated, setShowUndated] = useState(DEFAULT_SHOW_UNDATED);
  const [playYear, setPlayYearState] = useState<number | null>(null);
  const visibleRange = useMemo(() => visibleWindow(range, playYear), [range, playYear]);
  const setPlayYear = useCallback((year: number | null) => {
    setPlayYearState((current) => (current === year ? current : year));
  }, []);
  const changeRange = useCallback((next: YearRange) => {
    setPlayYearState(null);
    setRange(next);
  }, []);
  const selectPeriod = useCallback((id: string) => {
    const chip = PERIODS.find((item) => item.id === id);
    if (chip) changeRange(rangeForChip(chip));
  }, [changeRange]);

  return {
    range, visibleRange, showUndated, periodId: activeChip(range, PERIODS),
    selectPeriod, changeRange, setShowUndated, setPlayYear,
  };
}

function visibleWindow(range: YearRange, playYear: number | null): YearRange {
  const shown = rangeWithRevealedEnd(range, playYear);
  if (shown.start === range.start && shown.end === range.end) return range;
  return shown;
}
