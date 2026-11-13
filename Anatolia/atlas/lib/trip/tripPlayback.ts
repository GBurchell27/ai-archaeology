import { locateSegment } from "@/lib/trip/tripTimeline";
import type { TimedSegment, TravelMode } from "@/lib/trip/tripTypes";

/** Trip minutes shown per second of playback. Nights pass quickly and journeys stay watchable. */
export const MINUTES_PER_SECOND: Record<TravelMode | "stay", number> = {
  flight: 60,
  drive: 50,
  walk: 15,
  stay: 360,
};

export type PlaybackRate = (timeMs: number) => number;

/** Trip milliseconds per real millisecond at a given moment of the trip. */
export function storyPlaybackRate(timed: TimedSegment[], minutesPerSecond = MINUTES_PER_SECOND): PlaybackRate {
  return (timeMs) => {
    const { segment } = locateSegment(timed, timeMs).timed;
    const minutes = segment.kind === "stay" ? minutesPerSecond.stay : minutesPerSecond[segment.mode];
    return (minutes * 60_000) / 1000;
  };
}
