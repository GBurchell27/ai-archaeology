// The address-bar contract for the four views:
//   ?view=globe&lon=38.00&lat=30.00&alt=13000  (alt is camera altitude in whole km)
//   ?view=atlas&site=<id>                       (site optional)
//   ?view=place&site=<id>
//   ?view=walk&site=<id>                        (the coordinator checks the id has a walk)

import type { GlobeLook } from "./ellipsoid";

export type WorldViewState =
  | ({ view: "globe" } & GlobeLook)
  | { view: "atlas"; siteId?: string }
  | { view: "place"; siteId: string }
  | { view: "walk"; siteId: string };

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

export function parseViewUrl(search: SearchInput): WorldViewState {
  const view = readParameter(search, "view");
  const site = readParameter(search, "site");
  const siteId = site && SITE_ID.test(site) ? site : undefined;
  if ((view === "place" || view === "walk") && siteId) return { view, siteId };
  if (view === "atlas") return siteId ? { view: "atlas", siteId } : { view: "atlas" };
  return {
    view: "globe",
    longitude: readNumber(search, "lon", -180, 180, DEFAULT_GLOBE_LOOK.longitude),
    latitude: readNumber(search, "lat", -90, 90, DEFAULT_GLOBE_LOOK.latitude),
    altitude: 1000 * readNumber(search, "alt", MIN_GLOBE_ALTITUDE / 1000, MAX_GLOBE_ALTITUDE / 1000, DEFAULT_GLOBE_LOOK.altitude / 1000),
  };
}

export function serialiseViewUrl(state: WorldViewState): string {
  if (state.view === "globe") {
    return `?view=globe&lon=${state.longitude.toFixed(2)}&lat=${state.latitude.toFixed(2)}&alt=${Math.round(state.altitude / 1000)}`;
  }
  return state.siteId ? `?view=${state.view}&site=${encodeURIComponent(state.siteId)}` : `?view=${state.view}`;
}
