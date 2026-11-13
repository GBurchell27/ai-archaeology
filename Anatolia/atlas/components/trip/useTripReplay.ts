"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { TripClock, TripClockState } from "@/lib/trip/tripClock";
import { createTripReplay, type TripReplay } from "@/lib/trip/tripReplay";
import type { Trip } from "@/lib/trip/tripTypes";

export function useTripReplay(trip: Trip): TripReplay {
  const [replay] = useState(() => createTripReplay(trip));
  useEffect(() => () => replay.clock.pause(), [replay]);
  return replay;
}

export function useTripClockState(clock: TripClock): TripClockState {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
}
