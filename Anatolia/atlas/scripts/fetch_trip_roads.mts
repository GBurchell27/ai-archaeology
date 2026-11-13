// Routes every drive and walk of the trip along OpenStreetMap roads with the FOSSGIS OSRM servers,
// and writes public/trips/<trip id>.roads.json. Run from Anatolia/atlas:
//   ../explorer/node_modules/.bin/esbuild scripts/fetch_trip_roads.mts --bundle --platform=node --format=esm --outfile=.next/fetch_trip_roads.mjs
//   node .next/fetch_trip_roads.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { simplifyPath } from "../lib/trip/simplifyPath.ts";
import { roadKey, routedSegments, type RoadPath, type TripRoadsFile } from "../lib/trip/tripRoads.ts";
import type { LonLat, TravelSegment } from "../lib/trip/tripTypes.ts";
import { TURKEY_TRIP_2026 } from "../lib/trip/turkeyTrip2026.ts";

const PROFILES = {
  drive: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  walk: "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
} as const;
const USER_AGENT = "ai-archaeology-atlas trip replay (personal, one-off route fetch)";
const PAUSE_MS = 1100;
const SIMPLIFY_DEGREES = 0.00015;
/** Paths inside sites are often missing from OpenStreetMap, and the router then invents long detours. */
const DETOUR_FACTOR = 3;
const DETOUR_ALLOWANCE_M = 2000;
const EARTH_RADIUS_M = 6_371_000;

function straightDistanceM(stops: readonly LonLat[]): number {
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    const [lon0, lat0] = stops[index - 1].map((degrees) => (degrees * Math.PI) / 180);
    const [lon1, lat1] = stops[index].map((degrees) => (degrees * Math.PI) / 180);
    const haversine = Math.sin((lat1 - lat0) / 2) ** 2 + Math.cos(lat0) * Math.cos(lat1) * Math.sin((lon1 - lon0) / 2) ** 2;
    total += 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));
  }
  return total;
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

async function routeSegment(segment: TravelSegment): Promise<RoadPath> {
  const stops = [segment.from.position, ...(segment.via ?? []), segment.to.position];
  const url = `${PROFILES[segment.mode as "drive" | "walk"]}/${stops.map(([lon, lat]) => `${lon},${lat}`).join(";")}?overview=full&geometries=geojson`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const body = await response.json() as OsrmResponse;
  const route = body.routes?.[0];
  if (!response.ok || body.code !== "Ok" || !route) throw new Error(`${segment.title}: ${body.code} ${body.message ?? response.status}`);
  const coordinates = simplifyPath(route.geometry.coordinates as LonLat[], SIMPLIFY_DEGREES)
    .map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))] as LonLat);
  return { distanceM: Math.round(route.distance), durationS: Math.round(route.duration), coordinates };
}

const trip = TURKEY_TRIP_2026;
const roads: Record<string, RoadPath> = {};
const skipped = new Set<string>();
for (const segment of routedSegments(trip)) {
  const key = roadKey(segment);
  if (roads[key] || skipped.has(key)) continue;
  const road = await routeSegment(segment);
  await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  const straight = straightDistanceM([segment.from.position, ...(segment.via ?? []), segment.to.position]);
  if (road.distanceM > Math.max(straight * DETOUR_FACTOR, straight + DETOUR_ALLOWANCE_M)) {
    skipped.add(key);
    console.warn(`${segment.title}: kept as a straight line, the router went ${(road.distanceM / 1000).toFixed(1)} km for ${(straight / 1000).toFixed(1)} km`);
    continue;
  }
  roads[key] = road;
  console.log(`${segment.title}: ${(road.distanceM / 1000).toFixed(1)} km, ${Math.round(road.durationS / 60)} min, ${road.coordinates.length} points`);
}

const file: TripRoadsFile = {
  tripId: trip.id,
  source: "OSRM on OpenStreetMap data, FOSSGIS routing servers (routing.openstreetmap.de)",
  licence: "© OpenStreetMap contributors, ODbL 1.0",
  fetched: new Date().toISOString().slice(0, 10),
  roads,
};
const folder = new URL("../public/trips/", import.meta.url);
await mkdir(folder, { recursive: true });
await writeFile(new URL(`${trip.id}.roads.json`, folder), `${JSON.stringify(file)}\n`);
console.log(`wrote ${Object.keys(roads).length} roads`);
