// Short names for the one-line credit along the bottom of a phone screen.
// The full sentences stay on that line (scroll sideways) and, above 640px, in their usual places.

export function imageryHostName(basemap: { id: string; attribution: string; title: string }): string {
  if (basemap.id === "s2cloudless-2020" || basemap.attribution.includes("EOX")) return "EOX";
  if (basemap.id === "gibs-blue-marble" || basemap.attribution.includes("NASA")) return "NASA";
  return basemap.title;
}

/** "Wikidata CC0", "Pleiades CC BY 3.0". Drops a trailing " contributors" and the " 1.0" of CC0. */
export function compactSourceCredit(source: { attribution: string; licence: string }): string {
  const name = source.attribution.replace(/ contributors$/, "").replace(/^© /, "");
  const licence = source.licence === "CC0 1.0" ? "CC0" : source.licence;
  return `${name} ${licence}`;
}

/**
 * The catalogue credits that share the phone's bottom line.
 * The OpenStreetMap megalith layer carries its own credit while it is on, so it is left out here,
 * the same way the legend's site-records line leaves it out.
 */
export function compactRecordCredits(index: {
  sources: readonly { id: string; attribution: string; licence: string }[];
  osmMegaliths?: unknown;
} | null): string {
  if (!index) return "";
  const listed = index.sources.filter((source) => !(index.osmMegaliths && source.id === "osm"));
  return listed.map(compactSourceCredit).join(" · ");
}
