// The address-bar contract for the four views:
//   ?view=globe&lon=38.00&lat=30.00&alt=13000  (alt is camera altitude in whole km)
//   …&theory=<id> on a globe address            (the theory lens; an id the registry does not hold is dropped)
//   ?view=atlas&site=<id>                       (site optional)
//   ?view=place&site=<id>
//   ?view=walk&site=<id>&source=photographs     (the coordinator checks the id has a walk; source is left out for the model)

import { findTheory } from "../theories/theoryRegistry";
import { THEORY_ID_PATTERN } from "../theories/theoryStatus";
import type { GlobeLook } from "./ellipsoid";

/** Which reconstruction of a site a walk shows. The model is the default, so only the photographs are named in the address. */
export type WalkSource = "model" | "photographs";

export type WorldViewState =
  | ({ view: "globe"; theoryId?: string } & GlobeLook)
  | { view: "atlas"; siteId?: string }
  | { view: "place"; siteId: string }
  | { view: "walk"; siteId: string; source?: WalkSource };

export const DEFAULT_GLOBE_LOOK: GlobeLook = { longitude: 38, latitude: 30, altitude: 13_000_000 };
export const MIN_GLOBE_ALTITUDE = 100_000;
export const MAX_GLOBE_ALTITUDE = 40_000_000;

const SITE_ID = /^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

type SearchInput = string | URLSearchParams | Record<string, string | string[] | undefined>;

function readParameter(search: SearchInput, key: string): string | null {
  if (typeof search === "string") return new URLSearchParams(search).get(key);
  if (search instanceof URLSearchParams) return search.get(key);
  const value = search[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function readNumber(search: SearchInput, key: string, low: number, high: number, fallback: number): number {
  const raw = readParameter(search, key);
  const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
}

/** The theory the globe's lens is on: a well-formed id of a theory the atlas records, else nothing. */
function readTheoryId(search: SearchInput): string | undefined {
  const theory = readParameter(search, "theory");
  return theory && THEORY_ID_PATTERN.test(theory) && findTheory(theory) ? theory : undefined;
}

export function parseViewUrl(search: SearchInput): WorldViewState {
  const view = readParameter(search, "view");
  const site = readParameter(search, "site");
  const siteId = site && SITE_ID.test(site) ? site : undefined;
  if (view === "place" && siteId) return { view, siteId };
  if (view === "walk" && siteId) return readParameter(search, "source") === "photographs" ? { view, siteId, source: "photographs" } : { view, siteId };
  if (view === "atlas") return siteId ? { view: "atlas", siteId } : { view: "atlas" };
  const theoryId = readTheoryId(search);
  return {
    ...(theoryId ? { theoryId } : {}),
    view: "globe",
    longitude: readNumber(search, "lon", -180, 180, DEFAULT_GLOBE_LOOK.longitude),
    latitude: readNumber(search, "lat", -90, 90, DEFAULT_GLOBE_LOOK.latitude),
    altitude: 1000 * readNumber(search, "alt", MIN_GLOBE_ALTITUDE / 1000, MAX_GLOBE_ALTITUDE / 1000, DEFAULT_GLOBE_LOOK.altitude / 1000),
  };
}

export function serialiseViewUrl(state: WorldViewState): string {
  if (state.view === "globe") {
    const theory = state.theoryId ? `&theory=${state.theoryId}` : "";
    return `?view=globe&lon=${state.longitude.toFixed(2)}&lat=${state.latitude.toFixed(2)}&alt=${Math.round(state.altitude / 1000)}${theory}`;
  }
  const site = state.siteId ? `&site=${encodeURIComponent(state.siteId)}` : "";
  const source = state.view === "walk" && state.source === "photographs" ? "&source=photographs" : "";
  return `?view=${state.view}${site}${source}`;
}
