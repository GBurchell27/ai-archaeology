"use client";

import { useEffect, useState } from "react";
import { roadsFromFile, type TripRoads, type TripRoadsFile } from "@/lib/trip/tripRoads";

export type TripRoadsLoader = (url: string) => Promise<TripRoadsFile>;

export async function fetchTripRoads(url: string): Promise<TripRoadsFile> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Trip roads ${url}: HTTP ${response.status}`);
  return (await response.json()) as TripRoadsFile;
}

/** Routed roads for a trip, loaded once `enabled` turns on. Null until loaded, or if loading fails. */
export function useTripRoads(
  url: string | undefined,
  enabled: boolean,
  loadRoads: TripRoadsLoader = fetchTripRoads,
): TripRoads | null {
  const [roads, setRoads] = useState<TripRoads | null>(null);
  const shouldLoad = Boolean(url) && enabled && roads === null;
  useEffect(() => {
    if (!shouldLoad || !url) return;
    let cancelled = false;
    loadRoads(url)
      .then((file) => { if (!cancelled) setRoads(roadsFromFile(file)); })
      .catch((error: unknown) => console.warn("Trip roads not loaded, drawing straight lines instead.", error));
    return () => { cancelled = true; };
  }, [shouldLoad, url, loadRoads]);
  return roads;
}
