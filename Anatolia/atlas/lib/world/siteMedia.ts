// Addresses the site card links to: Wikimedia Commons pictures and OpenStreetMap elements.

import { safeExternalHref } from "@/lib/externalHref";

const FILE_PATH = "/wiki/Special:FilePath/";

function commonsFileUrl(image: string | null | undefined): URL | null {
  const href = safeExternalHref(image);
  if (!href) return null;
  const url = new URL(href);
  return url.hostname === "commons.wikimedia.org" && url.pathname.startsWith(FILE_PATH) ? url : null;
}

/** A width-limited rendering of a Commons `Special:FilePath` image; null for anything that is not one. */
export function commonsThumbnail(image: string | null | undefined, widthPixels: number): string | null {
  const url = commonsFileUrl(image);
  if (!url) return null;
  url.search = `?width=${widthPixels}`;
  return url.toString();
}

/** The file's own page, which carries its author and licence. */
export function commonsFilePage(image: string | null | undefined): string | null {
  const url = commonsFileUrl(image);
  return url ? `https://commons.wikimedia.org/wiki/File:${url.pathname.slice(FILE_PATH.length)}` : null;
}

/** "osm-n123" / "osm-w123" / "osm-r123" → that element's page on openstreetmap.org; null for any other id. */
export function osmElementPage(siteId: string): string | null {
  const match = /^osm-([nwr])(\d+)$/.exec(siteId);
  if (!match) return null;
  const kind = { n: "node", w: "way", r: "relation" }[match[1] as "n" | "w" | "r"];
  return `https://www.openstreetmap.org/${kind}/${match[2]}`;
}
