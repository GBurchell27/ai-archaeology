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

/** A pretty site path is shared on its own. Any other view shares the address, without the recording-pattern layer. */
export function viewSharePath(pathname: string, search: string): string {
  if (pathname.startsWith("/site/")) return pathname;
  return `${pathname}${searchWithoutPredictModel(search)}`;
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
  const view = params.get("view") ?? "globe";
  return view === "globe" && params.get("site") === sharedSiteId;
}
