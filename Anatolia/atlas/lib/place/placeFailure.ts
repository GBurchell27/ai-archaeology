// Why a place's close-up did not open, and the words the place view shows for it. No imports, so a check script can read it.

export type PlaceFailure = "outside" | "unavailable" | "failed" | "timeout";

export const FAILURE_TEXT: Record<PlaceFailure, { title: string; body: string }> = {
  outside: {
    title: "No close-up for this place",
    body: "Close-ups cover published sites between 80° south and 80° north, away from the 180° meridian. This one falls outside that, or is not in the catalogue.",
  },
  unavailable: {
    title: "Terrain close-ups are not available here",
    body: "A close-up is built on request by a program that this hosted copy of the atlas does not run. Nothing is wrong with the site record. The globe and the Anatolia map work as usual, and a copy of the atlas run from its repository builds close-ups.",
  },
  failed: {
    title: "The terrain could not be built",
    body: "The open elevation or imagery source did not answer. Nothing is wrong with the site record. Try again in a moment.",
  },
  timeout: {
    title: "The terrain is taking too long",
    body: "Building this window did not finish in time. The data source may be slow. Try again in a moment.",
  },
};

/** The close-up API's status as a failure: 503 means this server builds no close-ups, so trying again cannot help. */
export function placeFailureForStatus(status: number): PlaceFailure {
  if (status === 503) return "unavailable";
  return status === 404 || status === 400 ? "outside" : "failed";
}
