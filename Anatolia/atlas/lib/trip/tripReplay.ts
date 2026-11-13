import { TripClock } from "@/lib/trip/tripClock";
import { storyPlaybackRate, type PlaybackRate } from "@/lib/trip/tripPlayback";
import { timeSegments, tripSpan, type TripSpan } from "@/lib/trip/tripTimeline";
import type { TimedSegment, Trip } from "@/lib/trip/tripTypes";

/** Everything the replay UI and the map layer share for one trip. */
export interface TripReplay {
  trip: Trip;
  timed: TimedSegment[];
  span: TripSpan;
  clock: TripClock;
}

export function createTripReplay(trip: Trip, rate?: (timed: TimedSegment[]) => PlaybackRate): TripReplay {
  const timed = timeSegments(trip);
  const span = tripSpan(timed);
  return { trip, timed, span, clock: new TripClock(span, (rate ?? storyPlaybackRate)(timed)) };
}
