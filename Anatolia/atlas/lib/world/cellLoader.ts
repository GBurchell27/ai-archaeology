// Which 10° catalogue cells the globe camera needs, and a bounded cache of the ones fetched.
// No imports beyond types, so the node check script can load it.

import type { SiteColumns } from "./catalogueTypes";

/** Above this camera altitude only core.json is drawn. */
export const CELL_ALTITUDE_LIMIT = 2_500_000;
export const MAX_CELLS_IN_VIEW = 40;
export const MAX_CELLS_CACHED = 90;

const EARTH_RADIUS = 6_371_000;
const CELL_DEGREES = 10;
const CELL_HALF_DIAGONAL = (CELL_DEGREES / 2) * Math.SQRT2;
const RADIANS = Math.PI / 180;

interface CellLook {
  longitude: number;
  latitude: number;
  altitude: number;
}

function angleBetween(lonA: number, latA: number, lonB: number, latB: number): number {
  const cosine = Math.sin(latA * RADIANS) * Math.sin(latB * RADIANS)
    + Math.cos(latA * RADIANS) * Math.cos(latB * RADIANS) * Math.cos((lonA - lonB) * RADIANS);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / RADIANS;
}

/** Degrees of arc from the look point that the screen can show at this altitude. */
function viewRadiusDegrees(altitude: number): number {
  const horizon = Math.acos(EARTH_RADIUS / (EARTH_RADIUS + altitude));
  // 1.3 altitudes covers the corner of a wide window and a moderate tilt.
  return Math.min(horizon, 1.3 * altitude / EARTH_RADIUS) / RADIANS;
}

/** Keys of the existing cells in view, nearest first; empty when the camera is too high. */
export function cellKeysInView(look: CellLook, cells: Record<string, number>): string[] {
  if (!(look.altitude < CELL_ALTITUDE_LIMIT)) return [];
  const reach = viewRadiusDegrees(look.altitude) + CELL_HALF_DIAGONAL;
  const near: { key: string; angle: number }[] = [];
  for (const key of Object.keys(cells)) {
    const [lonIndex, latIndex] = key.split("_").map(Number);
    const angle = angleBetween(
      look.longitude, look.latitude,
      lonIndex * CELL_DEGREES - 180 + CELL_DEGREES / 2, latIndex * CELL_DEGREES - 90 + CELL_DEGREES / 2,
    );
    if (angle <= reach) near.push({ key, angle });
  }
  return near.sort((left, right) => left.angle - right.angle).slice(0, MAX_CELLS_IN_VIEW).map((cell) => cell.key);
}

export type CellFetcher = (key: string) => Promise<SiteColumns | null>;

/** Fetches each cell once and forgets the least recently wanted ones beyond the cap. */
export class SiteCellCache {
  private readonly loaded = new Map<string, SiteColumns>(); // insertion order = least recently wanted first
  private readonly pending = new Set<string>();

  private readonly fetchCell: CellFetcher;
  private readonly capacity: number;

  // Plain fields, not parameter properties: node's type stripping cannot erase those.
  constructor(fetchCell: CellFetcher, capacity = MAX_CELLS_CACHED) {
    this.fetchCell = fetchCell;
    this.capacity = capacity;
  }

  /** The wanted cells that are ready now; the rest are fetched and announced through `onArrival`. */
  request(keys: readonly string[], onArrival: () => void): { key: string; columns: SiteColumns }[] {
    const ready: { key: string; columns: SiteColumns }[] = [];
    for (const key of keys) {
      const columns = this.loaded.get(key);
      if (columns) {
        this.loaded.delete(key);
        this.loaded.set(key, columns);
        ready.push({ key, columns });
      } else if (!this.pending.has(key)) {
        this.pending.add(key);
        this.fetchCell(key)
          .then((fetched) => { if (fetched) this.store(key, fetched); })
          .catch(() => undefined) // a failed cell is simply asked for again on the next look
          .finally(() => { this.pending.delete(key); onArrival(); });
      }
    }
    return ready;
  }

  get size(): number {
    return this.loaded.size;
  }

  private store(key: string, columns: SiteColumns): void {
    this.loaded.set(key, columns);
    while (this.loaded.size > this.capacity) {
      this.loaded.delete(this.loaded.keys().next().value as string);
    }
  }
}
