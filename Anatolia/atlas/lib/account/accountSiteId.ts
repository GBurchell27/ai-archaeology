// Which ids an account may save or vote for.

// The id rule of lib/globe/viewUrl.ts and lib/closeupCache.ts, and of the CHECK in db/schema.sql. Keep the four alike.
const SITE_ID = /^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const LONGEST_SITE_ID = 80;
/** OpenStreetMap records are share-alike and stay in their own layer, so they are kept out of saved lists and the vote table. */
const OSM_PREFIX = "osm-";

export function isAccountSiteId(value: unknown): value is string {
  return typeof value === "string" && value.length <= LONGEST_SITE_ID && SITE_ID.test(value) && !value.startsWith(OSM_PREFIX);
}
