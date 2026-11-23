import { useCallback, useEffect, useState } from "react";
import { PERIODS } from "@/lib/periods";
import { DEFAULT_SHOW_UNDATED } from "@/lib/settings/settingsPresets";
import { RANGE_END, RANGE_START, activeChip, nextPlayRange, rangeForChip, type YearRange } from "@/lib/timeline";

export interface TimelineState {
  range: YearRange;
  showUndated: boolean;
  playing: boolean;
  /** The period chip the range matches, or an empty value for a custom range. */
  periodId: ReturnType<typeof activeChip>;
  selectPeriod: (id: string) => void;
  changeRange: (next: YearRange) => void;
  togglePlay: () => void;
  setShowUndated: (show: boolean) => void;
}

export function useTimelineState(): TimelineState {
  const [range, setRange] = useState<YearRange>({ start: RANGE_START, end: RANGE_END });
  const [showUndated, setShowUndated] = useState(DEFAULT_SHOW_UNDATED);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setRange((current) => {
        const next = nextPlayRange(current);
        if (!next) {
          window.setTimeout(() => setPlaying(false), 0);
          return current;
        }
        return next;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing]);

  const selectPeriod = useCallback((id: string) => {
    const chip = PERIODS.find((item) => item.id === id);
    if (!chip) return;
    setPlaying(false);
    setRange(rangeForChip(chip));
  }, []);
  const changeRange = useCallback((next: YearRange) => {
    setPlaying(false);
    setRange(next);
  }, []);
  const togglePlay = useCallback(() => setPlaying((current) => !current), []);

  return { range, showUndated, playing, periodId: activeChip(range, PERIODS), selectPeriod, changeRange, togglePlay, setShowUndated };
}
