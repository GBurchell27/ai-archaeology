import type { LonLat, StaySegment, TravelMode, TravelSegment, TripPlace } from "@/lib/trip/tripTypes";

interface SegmentExtras {
  note?: string;
  estimatedTimes?: boolean;
  via?: LonLat[];
}

/** Local wall-clock time in April 2026 with the zone's offset, for example `aprilTime(14, "12:40", 2)`. */
export function aprilTime(day: number, clock: string, utcOffsetHours = 3): string {
  const offset = `${utcOffsetHours >= 0 ? "+" : "-"}${String(Math.abs(utcOffsetHours)).padStart(2, "0")}:00`;
  return `2026-04-${String(day).padStart(2, "0")}T${clock}:00${offset}`;
}

export function travel(
  mode: TravelMode,
  title: string,
  from: TripPlace,
  to: TripPlace,
  starts: string,
  ends: string,
  extras: SegmentExtras = {},
): TravelSegment {
  return { kind: "travel", mode, title, from, to, starts, ends, ...extras };
}

export function stay(
  title: string,
  place: TripPlace,
  starts: string,
  ends: string,
  extras: Omit<SegmentExtras, "via"> = {},
): StaySegment {
  return { kind: "stay", title, place, starts, ends, ...extras };
}
