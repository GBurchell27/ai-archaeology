"use client";

import { useCallback, useState } from "react";
import { useTripReplay } from "@/components/trip/useTripReplay";
import { useTripRoads } from "@/components/trip/useTripRoads";
import type { TripReplay } from "@/lib/trip/tripReplay";
import type { TripRoads } from "@/lib/trip/tripRoads";
import type { Trip } from "@/lib/trip/tripTypes";

export interface TripSession {
  replay: TripReplay;
  roads: TripRoads | null;
  open: boolean;
  follow: boolean;
  toggle: () => void;
  close: () => void;
  setFollow: (follow: boolean) => void;
  stopFollowing: () => void;
}

/** Whether the trip replay is showing, and whether the camera rides along. */
export function useTripSession(trip: Trip): TripSession {
  const replay = useTripReplay(trip);
  const [open, setOpen] = useState(false);
  const [follow, setFollow] = useState(true);
  const roads = useTripRoads(trip.roadsUrl, open);
  const close = useCallback(() => {
    replay.clock.pause();
    setOpen(false);
  }, [replay]);
  const toggle = useCallback(() => {
    if (open) close();
    else setOpen(true);
  }, [open, close]);
  const stopFollowing = useCallback(() => setFollow(false), []);
  return { replay, roads, open, follow, toggle, close, setFollow, stopFollowing };
}
