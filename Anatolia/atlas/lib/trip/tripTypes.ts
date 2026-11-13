/** A personal journey replayed over the atlas. Pure data: no three.js and no DOM. */

export type TravelMode = "flight" | "drive" | "walk";

export type LonLat = readonly [longitude: number, latitude: number];

export interface TripPlace {
  name: string;
  position: LonLat;
  /** IANA zone used for the clock while the traveller is here. */
  timeZone: string;
  /** Town-level or estimated position rather than a known address. */
  approximate?: boolean;
}

interface SegmentTiming {
  /** ISO 8601 with an explicit UTC offset. */
  starts: string;
  ends: string;
  /** Times are reconstructed, not taken from a ticket or receipt. */
  estimatedTimes?: boolean;
  note?: string;
}

export interface TravelSegment extends SegmentTiming {
  kind: "travel";
  mode: TravelMode;
  title: string;
  from: TripPlace;
  to: TripPlace;
  /** Places the route must pass through, in order. */
  via?: LonLat[];
}

export interface StaySegment extends SegmentTiming {
  kind: "stay";
  title: string;
  place: TripPlace;
}

export type TripSegment = TravelSegment | StaySegment;

export interface Trip {
  id: string;
  title: string;
  segments: TripSegment[];
  /** Routed roads for the drives and walks, written by scripts/fetch_trip_roads.mts. */
  roadsUrl?: string;
}

/** A segment with its times parsed once, so lookups stay cheap during playback. */
export interface TimedSegment {
  index: number;
  segment: TripSegment;
  startMs: number;
  endMs: number;
}
