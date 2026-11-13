import type { TravelMode } from "@/lib/trip/tripTypes";

/** Shared by the map lines and the scrubber bands, so a colour means the same thing in both. */
export const MODE_COLORS: Record<TravelMode, string> = {
  flight: "#7fc8ff",
  drive: "#f4a340",
  walk: "#a6e08f",
};

export const MODE_NAMES: Record<TravelMode, string> = {
  flight: "Flight",
  drive: "Drive",
  walk: "Walk",
};
