import type { RoadPath } from "@/lib/trip/tripRoads";
import type { TripLocation } from "@/lib/trip/tripTimeline";
import type { TravelMode } from "@/lib/trip/tripTypes";

const MODE_VERBS = { flight: "Flying", drive: "Driving", walk: "Walking" } as const;
const ROAD_NOUNS: Record<TravelMode, string> = { flight: "Flight", drive: "By road", walk: "On foot" };

const ZONE_NAMES: Record<string, string> = {
  "Europe/Amsterdam": "Amsterdam time",
  "Europe/Istanbul": "Turkey time",
};

const clockFormats = new Map<string, Intl.DateTimeFormat>();

/** The zone on the traveller's watch: a flight keeps departure time until it lands. */
export function localTimeZone(location: TripLocation): string {
  const { segment } = location.timed;
  if (segment.kind === "stay") return segment.place.timeZone;
  return location.progress < 1 ? segment.from.timeZone : segment.to.timeZone;
}

export function clockLabel(timeMs: number, timeZone: string): string {
  let format = clockFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    clockFormats.set(timeZone, format);
  }
  return format.format(timeMs);
}

export function zoneLabel(timeZone: string): string {
  return ZONE_NAMES[timeZone] ?? timeZone;
}

/** The router's own figures, which can differ from the itinerary's times. */
export function roadSummary(road: RoadPath, mode: TravelMode): string {
  const kilometres = road.distanceM / 1000;
  const distance = kilometres < 10 ? kilometres.toFixed(1) : Math.round(kilometres).toString();
  const minutes = Math.max(1, Math.round(road.durationS / 60));
  const duration = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
  return `${ROAD_NOUNS[mode]} ${distance} km, about ${duration} without stops.`;
}

export function activityKicker(location: TripLocation): string {
  const { segment } = location.timed;
  if (segment.kind === "stay") return segment.place.name;
  return `${MODE_VERBS[segment.mode]} · ${segment.from.name} to ${segment.to.name}`;
}
