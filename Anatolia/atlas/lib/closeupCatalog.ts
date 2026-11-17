// Resolves a published site id to its point. The close-up API never takes raw coordinates.
import { readFile } from "node:fs/promises";
import path from "node:path";

export type PublishedPoint = { longitude: number; latitude: number };

type DetailShard = Record<string, { lon?: unknown; lat?: unknown }>;

const SHARD_LIMIT = 8;
const shards = new Map<string, DetailShard>();
let anatoliaPromise: Promise<Map<string, PublishedPoint>> | null = null;

function pointFrom(longitude: unknown, latitude: unknown): PublishedPoint | undefined {
  if (typeof longitude !== "number" || typeof latitude !== "number") return undefined;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
  if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return undefined;
  return { longitude, latitude };
}

function loadAnatolia(): Promise<Map<string, PublishedPoint>> {
  if (!anatoliaPromise) {
    anatoliaPromise = (async () => {
      const found = new Map<string, PublishedPoint>();
      for (const relative of ["wikidata/sites.geojson", "sites.geojson"]) {
        const raw = JSON.parse(await readFile(path.join(process.cwd(), "public", relative), "utf8")) as {
          features: { id?: string; geometry?: { coordinates?: unknown[] } }[];
        };
        for (const feature of raw.features) {
          const coordinates = feature.geometry?.coordinates ?? [];
          const point = pointFrom(coordinates[0], coordinates[1]);
          if (point) found.set(String(feature.id ?? ""), point);
        }
      }
      return found;
    })();
  }
  return anatoliaPromise;
}

/** One detail shard, read on demand. A missing shard is not cached, so a later catalogue build is picked up. */
async function loadShard(worldDirectory: string, bucket: string): Promise<DetailShard | undefined> {
  const file = path.join(worldDirectory, "detail", `${bucket}.json`);
  const cached = shards.get(file);
  if (cached) {
    shards.delete(file);
    shards.set(file, cached);
    return cached;
  }
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const shard = JSON.parse(text) as DetailShard;
  shards.set(file, shard);
  if (shards.size > SHARD_LIMIT) shards.delete(shards.keys().next().value as string);
  return shard;
}

// The bucket is detailBucket() from lib/world/catalogueTypes.ts (Contract 2), repeated here because the
// node check script cannot resolve an extensionless value import and tsc refuses one ending in .ts.
/** `id` must already have passed isSiteId, so the bucket cannot leave the detail folder. */
export async function findPublishedPoint(
  id: string,
  worldDirectory = path.join(process.cwd(), "public", "world"),
): Promise<PublishedPoint | undefined> {
  const local = (await loadAnatolia()).get(id);
  if (local) return local;
  const shard = await loadShard(worldDirectory, id.slice(-2).toLowerCase());
  const entry = shard && Object.hasOwn(shard, id) ? shard[id] : undefined;
  return entry ? pointFrom(entry.lon, entry.lat) : undefined;
}
