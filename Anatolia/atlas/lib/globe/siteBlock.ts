// A block of catalogue rows turned into the typed arrays one THREE.Points draw call needs.

import type { SiteColumns } from "@/lib/world/catalogueTypes";
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

const SLICE_ROWS = 4000;

/** The draw arrays for a block, empty, and a function that fills a run of rows. */
function siteBlockWriter(key: string, columns: SiteColumns, siteTypes: string[], fixedColor?: string) {
  const count = columns.id.length;
  const arrays: PointsBlock = { key, positions: new Float32Array(count * 3), tints: new Uint8Array(count * 3), sizes: new Float32Array(count) };
  const palette = siteTypes.map((siteType) => hexToBytes(fixedColor ?? siteTypeStyle(siteType).color));
  const fallback = hexToBytes(fixedColor ?? siteTypeStyle("other").color);
  function fillRows(from: number, until: number): void {
    for (let row = from; row < until; row += 1) {
      arrays.positions.set(lonLatHeightToScene(columns.lon[row], columns.lat[row], 0), row * 3);
      arrays.tints.set(palette[columns.type[row]] ?? fallback, row * 3);
      arrays.sizes[row] = 0.85 + 0.75 * Math.min(1, Math.log1p(columns.importance[row] ?? 0) / IMPORTANCE_CEILING);
    }
  }
  return { count, arrays, fillRows };
}

/** `fixedColor` paints every row alike (the OpenStreetMap layer); otherwise rows are coloured by site type. */
export function buildSiteBlock(key: string, columns: SiteColumns, siteTypes: string[], fixedColor?: string): SiteBlock {
  const { count, arrays, fillRows } = siteBlockWriter(key, columns, siteTypes, fixedColor);
  fillRows(0, count);
  return { ...arrays, columns, grid: buildSiteGrid(columns.lon, columns.lat) };
}

/**
 * The same block built a few thousand rows at a time, awaiting `pause` between slices, so a
 * 37,000-point cell arriving mid-flight never holds a frame.
 */
export async function buildSiteBlockInSlices(
  key: string,
  columns: SiteColumns,
  siteTypes: string[],
  pause: () => Promise<void>,
): Promise<SiteBlock> {
  const { count, arrays, fillRows } = siteBlockWriter(key, columns, siteTypes);
  for (let from = 0; from < count; from += SLICE_ROWS) {
    await pause();
    fillRows(from, Math.min(count, from + SLICE_ROWS));
  }
  await pause();
  return { ...arrays, columns, grid: buildSiteGrid(columns.lon, columns.lat) };
}
