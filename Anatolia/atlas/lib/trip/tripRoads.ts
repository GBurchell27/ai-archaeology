import type { LonLat, TravelSegment, Trip } from "@/lib/trip/tripTypes";

/** A routed road or footpath between two stops, with the router's own distance and time. */
export interface RoadPath {
  distanceM: number;
  durationS: number;
  coordinates: LonLat[];
}

export interface TripRoadsFile {
  tripId: string;
  source: string;
  licence: string;
  fetched: string;
  roads: Record<string, RoadPath>;
}

export type TripRoads = Map<string, RoadPath>;

export function routedSegments(trip: Trip): TravelSegment[] {
  return trip.segments.filter((segment): segment is TravelSegment => segment.kind === "travel" && segment.mode !== "flight");
}

/** Same stops and mode give the same key, so editing times keeps the saved road. */
export function roadKey(segment: TravelSegment): string {
  const stops = [segment.from.position, ...(segment.via ?? []), segment.to.position];
  return `${segment.mode}:${stops.map(([longitude, latitude]) => `${longitude.toFixed(5)},${latitude.toFixed(5)}`).join(";")}`;
}

export function roadsFromFile(file: TripRoadsFile): TripRoads {
  return new Map(Object.entries(file.roads));
}

export function roadFor(roads: TripRoads | null, segment: TravelSegment): RoadPath | undefined {
  return segment.mode === "flight" ? undefined : roads?.get(roadKey(segment));
}
