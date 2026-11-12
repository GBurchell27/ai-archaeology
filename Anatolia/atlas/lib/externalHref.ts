const EXACT_HOSTS = new Set([
  "whc.unesco.org",
  "doi.org",
  "zenodo.org",
  "www.naturalearthdata.com",
  "naturalearthdata.com",
  "soilgrids.org",
  "www.soilgrids.org",
  "corona.cast.uark.edu",
  "s2maps.eu",
  "www.s2maps.eu",
  "tiles.maps.eox.at",
  "creativecommons.org",
  "www.creativecommons.org",
  "pleiades.stoa.org",
]);

const HOST_SUFFIXES = ["wikipedia.org", "wikidata.org", "noaa.gov"];

/** https URLs whose host is on the atlas allowlist. Anything else is not linked. */
export function safeExternalHref(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const allowed = EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  if (!allowed) return null;
  return url.toString();
}
