// One-degree buckets over a block of sites: nearest-site lookup for picking, and per-bucket
// counts for the cluster badges. Pure, no imports.

export interface SiteGrid {
  /** Bucket id → rows in that square degree. */
  buckets: Map<number, number[]>;
}

export interface GridCount {
  longitude: number;
  latitude: number;
  count: number;
}

const RADIANS = Math.PI / 180;

function bucketId(lonIndex: number, latIndex: number): number {
  return latIndex * 360 + ((lonIndex % 360) + 360) % 360;
}

const lonIndexOf = (longitude: number) => Math.floor(longitude + 180);
const latIndexOf = (latitude: number) => Math.min(179, Math.max(0, Math.floor(latitude + 90)));

export function buildSiteGrid(lon: ArrayLike<number>, lat: ArrayLike<number>): SiteGrid {
  const buckets = new Map<number, number[]>();
  for (let row = 0; row < lon.length; row += 1) {
    const id = bucketId(lonIndexOf(lon[row]), latIndexOf(lat[row]));
    const rows = buckets.get(id);
    if (rows) rows.push(row);
    else buckets.set(id, [row]);
  }
  return { buckets };
}

export interface NearestSite {
  row: number;
  /** Ground distance in degrees of arc, after any preference discount. */
  degrees: number;
}

/**
 * The closest row within `reachDegrees` of a place that `weigh` accepts.
 * `weigh` returns a factor on the distance (below 1 prefers the row) or 0 to skip it.
 */
export function nearestSite(
  grid: SiteGrid,
  lon: ArrayLike<number>,
  lat: ArrayLike<number>,
  longitude: number,
  latitude: number,
  reachDegrees: number,
  weigh: (row: number) => number,
): NearestSite | null {
  const shrink = Math.max(0.01, Math.cos(latitude * RADIANS));
  const lonReach = Math.min(180, reachDegrees / shrink);
  let best: NearestSite | null = null;
  for (let latIndex = latIndexOf(latitude - reachDegrees); latIndex <= latIndexOf(latitude + reachDegrees); latIndex += 1) {
    for (let lonIndex = lonIndexOf(longitude - lonReach); lonIndex <= lonIndexOf(longitude + lonReach); lonIndex += 1) {
      for (const row of grid.buckets.get(bucketId(lonIndex, latIndex)) ?? []) {
        const weight = weigh(row);
        if (weight === 0) continue;
        const acrossDateLine = ((lon[row] - longitude + 540) % 360) - 180;
        const degrees = Math.hypot(acrossDateLine * shrink, lat[row] - latitude);
        if (degrees <= reachDegrees && (!best || degrees * weight < best.degrees)) {
          best = { row, degrees: degrees * weight };
        }
      }
    }
  }
  return best;
}

/** Shown sites per occupied square degree, each at the mean position of its shown rows. */
export function countShownByBucket(
  grid: SiteGrid,
  lon: ArrayLike<number>,
  lat: ArrayLike<number>,
  shown: ArrayLike<number>,
): GridCount[] {
  const counts: GridCount[] = [];
  for (const rows of grid.buckets.values()) {
    let count = 0;
    let lonSum = 0;
    let latSum = 0;
    for (const row of rows) {
      if (!shown[row]) continue;
      count += 1;
      lonSum += lon[row];
      latSum += lat[row];
    }
    if (count > 0) counts.push({ longitude: lonSum / count, latitude: latSum / count, count });
  }
  return counts;
}
