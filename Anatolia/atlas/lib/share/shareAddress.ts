// Which address a share button copies, and when the globe may keep a pretty path.

import { isPredictLayerId } from "../world/predictIndex";
import { catalogueIdFromSlug, shareSlug } from "./siteSlug";

export function siteSharePath(id: string, name: string): string | null {
  const slug = shareSlug(id, name);
  return slug ? `/site/${slug}` : null;
}

export function absoluteShareUrl(origin: string, path: string): string {
  return `${origin}${path}`;
}

/** Drops `&model=<predictLayerId>`. Any other parameter, including a model value that is not a layer, stays. */
function searchWithoutPredictModel(search: string): string {
  const lead = search.startsWith("?") ? "?" : "";
  const params = new URLSearchParams(lead ? search.slice(1) : search);
  const model = params.get("model");
  if (!model || !isPredictLayerId(model)) return search;
  params.delete("model");
  const rest = params.toString();
  return rest ? `${lead}${rest}` : "";
}

/** `tour` and `stop` from an address, kept when a view of a tour is shared. */
function tourShareQuery(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tour = params.get("tour");
  if (!tour) return "";
  const kept = new URLSearchParams();
  kept.set("tour", tour);
  const stop = params.get("stop");
  if (stop) kept.set("stop", stop);
  return `?${kept.toString()}`;
}

/**
 * A pretty site path is shared on its own, plus a tour and its stop when one is running.
 * Any other view shares the address, without the recording-pattern layer, and keeps the tour.
 */
export function viewSharePath(pathname: string, search: string): string {
  const cleaned = searchWithoutPredictModel(search);
  if (!pathname.startsWith("/site/")) return `${pathname}${cleaned}`;
  const tour = tourShareQuery(cleaned);
  return tour ? `${pathname}${tour}` : pathname;
}

/** The catalogue id in `/site/<slug>`, or null when this address is not a share page. */
export function catalogueIdFromPath(pathname: string): string | null {
  const match = /^\/site\/([^/]+)$/.exec(pathname);
  return match ? catalogueIdFromSlug(match[1]) : null;
}

/**
 * While the open globe card is the site this path names, the address stays on the path.
 * Camera coordinates, which the globe would otherwise write, are left out.
 */
export function keepsPrettyShareAddress(pathname: string, search: string, sharedSiteId: string | null): boolean {
  if (!sharedSiteId || !pathname.startsWith("/site/")) return false;
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  // A tour names its stop in the query, so the pretty path, which drops the query, cannot hold it.
  if (params.get("tour")) return false;
  const view = params.get("view") ?? "globe";
  return view === "globe" && params.get("site") === sharedSiteId;
}
