import { useEffect, useState } from "react";
import { fetchWorldFile, loadSiteDetail } from "@/lib/world/catalogueLoader";
import { cellKeyFor, type FeaturedSite, type SiteColumns, type SiteDetail, type WorldIndex } from "@/lib/world/catalogueTypes";
import { formatYearRange } from "./placeGeometry";

/** What the close-up header and marker need to know about a published site. */
export interface PlaceSite {
  name: string;
  longitude: number;
  latitude: number;
  kind: string | null;
  dates: string | null;
  country: string | null;
  why: string | null;
  recordCredit: string | null;
  recordUrl: string | null;
}

const fetchJson = <Shape,>(file: string) => fetchWorldFile<Shape>(file).catch(() => null);

const readable = (label: string) => label.replace(/-/g, " ");

/** Type and dates of a site that is not featured: its row in the core block, else in its 10° cell. */
async function catalogueRow(id: string, detail: SiteDetail): Promise<{ kind: string | null; dates: string | null }> {
  const index = await fetchJson<WorldIndex>("index.json");
  for (const file of ["core.json", `cells/${cellKeyFor(detail.lon, detail.lat)}.json`]) {
    const columns = await fetchJson<SiteColumns>(file);
    const row = columns ? columns.id.indexOf(id) : -1;
    if (columns && row >= 0) {
      const kind = index?.siteTypes[columns.type[row]] ?? null;
      return { kind: kind && kind !== "other" ? readable(kind) : null, dates: formatYearRange(columns.start[row], columns.end[row]) };
    }
  }
  return { kind: detail.types[0] ?? null, dates: null };
}

export async function loadPlaceSite(id: string): Promise<PlaceSite | null> {
  const [detail, featuredSites] = await Promise.all([
    loadSiteDetail(id).catch(() => null),
    fetchJson<FeaturedSite[]>("featured.json"),
  ]);
  const featured = featuredSites?.find((site) => site.id === id);
  if (!detail && !featured) return null;
  const row = featured
    ? { kind: `${readable(featured.category)} · ${featured.period}`, dates: formatYearRange(featured.startYear, featured.endYear) }
    : await catalogueRow(id, detail as SiteDetail);
  // Radiocarbon-derived years are a rough calibration of samples matched by name: never shown bare.
  const dates = row.dates && !featured && detail?.datingSource === "c14" ? `${row.dates}, radiocarbon (± centuries)` : row.dates;
  return {
    name: featured?.name ?? (detail as SiteDetail).name,
    longitude: detail?.lon ?? (featured as FeaturedSite).lon,
    latitude: detail?.lat ?? (featured as FeaturedSite).lat,
    kind: row.kind,
    dates,
    country: featured?.country ?? null,
    why: featured?.why ?? null,
    recordCredit: detail ? `${detail.attribution}, ${detail.licence}` : null,
    recordUrl: detail?.sourceUrl ?? null,
  };
}

/** `undefined` while loading, `null` when the id is not in the catalogue. */
export function usePlaceSite(siteId: string): PlaceSite | null | undefined {
  const [site, setSite] = useState<PlaceSite | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setSite(undefined);
    loadPlaceSite(siteId).then((loaded) => live && setSite(loaded), () => live && setSite(null));
    return () => {
      live = false;
    };
  }, [siteId]);
  return site;
}
