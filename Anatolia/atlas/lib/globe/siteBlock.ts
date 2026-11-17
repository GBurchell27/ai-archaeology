// A block of catalogue rows turned into the typed arrays one THREE.Points draw call needs.

import type { SiteColumns, WorldIndex } from "@/lib/world/catalogueTypes";
import { siteTypeStyle } from "@/lib/world/siteTypeStyle";
import { lonLatHeightToScene } from "./ellipsoid";
import { buildSiteGrid, type SiteGrid } from "./siteGrid";

/** What one THREE.Points draw call needs. */
export interface PointsBlock {
  key: string;
  /** Scene (ECEF metre) xyz per row. */
  positions: Float32Array;
  /** sRGB bytes per row. */
  tints: Uint8Array;
  /** Relative dot size per row, about 0.85 to 1.6. */
  sizes: Float32Array;
}

export interface SiteBlock extends PointsBlock {
  columns: SiteColumns;
  grid: SiteGrid;
}

/** A block together with the rows the current filter lets through (1 = shown). */
export interface SiteLayer {
  block: SiteBlock;
  shown: Uint8Array;
}

export interface PickedSite {
  id: string;
  name: string;
  lon: number;
  lat: number;
  siteType: string;
  startYear: number | null;
  endYear: number | null;
  featured: boolean;
  /** Source id, e.g. "wikidata" | "pleiades" | "osm". */
  source: string;
}

export function hexToBytes(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const IMPORTANCE_CEILING = Math.log1p(150);

/** `fixedColor` paints every row alike (the OpenStreetMap layer); otherwise rows are coloured by site type. */
export function buildSiteBlock(key: string, columns: SiteColumns, siteTypes: string[], fixedColor?: string): SiteBlock {
  const count = columns.id.length;
  const positions = new Float32Array(count * 3);
  const tints = new Uint8Array(count * 3);
  const sizes = new Float32Array(count);
  const palette = siteTypes.map((siteType) => hexToBytes(fixedColor ?? siteTypeStyle(siteType).color));
  const fallback = hexToBytes(fixedColor ?? siteTypeStyle("other").color);
  for (let row = 0; row < count; row += 1) {
    positions.set(lonLatHeightToScene(columns.lon[row], columns.lat[row], 0), row * 3);
    tints.set(palette[columns.type[row]] ?? fallback, row * 3);
    sizes[row] = 0.85 + 0.75 * Math.min(1, Math.log1p(columns.importance[row] ?? 0) / IMPORTANCE_CEILING);
  }
  return { key, columns, positions, tints, sizes, grid: buildSiteGrid(columns.lon, columns.lat) };
}

export function pickedSiteFromRow(block: SiteBlock, row: number, index: WorldIndex): PickedSite {
  const { columns } = block;
  return {
    id: columns.id[row],
    name: columns.name[row],
    lon: columns.lon[row],
    lat: columns.lat[row],
    siteType: index.siteTypes[columns.type[row]] ?? "other",
    startYear: columns.start[row],
    endYear: columns.end[row],
    featured: columns.featured[row] === 1,
    source: index.sources[columns.source[row]]?.id ?? "unknown",
  };
}
