import { clipRange, type Frame } from "@/lib/trip/segmentClip";
import type { LonLat, TravelSegment } from "@/lib/trip/tripTypes";

/** Scene coordinates: X east, Y up, Z south, matching the terrain mesh. */
export type Point3 = [number, number, number];

export interface RouteSurface {
  toLocal: (position: LonLat) => [number, number];
  /** Scene Y of the ground, already exaggerated. */
  groundY: (position: LonLat) => number;
  /** Flights are cut where they leave this area, so off-map airports do not drag the view away. */
  frame?: Frame;
}

export interface TravelRoute {
  points: Point3[];
  /** Cumulative ground distance at each point, so vehicles keep a steady ground speed. */
  distances: number[];
  length: number;
}

export interface RoutePose {
  position: Point3;
  direction: Point3;
}

const ROAD_SAMPLE_M = 1500;
const FLIGHT_SAMPLES = 96;
const FLIGHT_ARC_SHARE = 0.08;
const MAX_FLIGHT_ARC_M = 90_000;
const ROAD_LIFT = 30;

/** `roadPath` is a routed road geometry. Without it, the line goes straight through the waypoints. */
export function buildTravelRoute(segment: TravelSegment, surface: RouteSurface, roadPath?: LonLat[]): TravelRoute {
  const points = segment.mode === "flight"
    ? flightArc(segment.from.position, segment.to.position, surface)
    : roadLine(roadPath ?? [segment.from.position, ...(segment.via ?? []), segment.to.position], surface);
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    const [x0, , z0] = points[index - 1];
    const [x1, , z1] = points[index];
    distances.push(distances[index - 1] + Math.hypot(x1 - x0, z1 - z0));
  }
  return { points, distances, length: distances[distances.length - 1] };
}

export function poseAlong(route: TravelRoute, fraction: number): RoutePose {
  const { points } = route;
  if (points.length < 2) return { position: points[0] ?? [0, 0, 0], direction: [0, 0, -1] };
  const index = segmentIndexAt(route, fraction);
  const from = points[index];
  const to = points[index + 1];
  const local = localFraction(route, index, fraction);
  return {
    position: [lerp(from[0], to[0], local), lerp(from[1], to[1], local), lerp(from[2], to[2], local)],
    direction: normalise([to[0] - from[0], to[1] - from[1], to[2] - from[2]]),
  };
}

/** The part of the route already travelled, ending exactly at the vehicle. */
export function travelledPoints(route: TravelRoute, fraction: number): Point3[] {
  if (fraction >= 1) return route.points;
  if (route.points.length < 2 || fraction <= 0) return [];
  const index = segmentIndexAt(route, fraction);
  return [...route.points.slice(0, index + 1), poseAlong(route, fraction).position];
}

function flightArc(start: LonLat, end: LonLat, surface: RouteSurface): Point3[] {
  const [x0, z0] = surface.toLocal(start);
  const [x1, z1] = surface.toLocal(end);
  const y0 = surface.groundY(start);
  const y1 = surface.groundY(end);
  const arcHeight = Math.min(MAX_FLIGHT_ARC_M, Math.hypot(x1 - x0, z1 - z0) * FLIGHT_ARC_SHARE);
  const [first, last] = (surface.frame && clipRange([x0, z0], [x1, z1], surface.frame)) || [0, 1];
  return Array.from({ length: FLIGHT_SAMPLES + 1 }, (_, step) => {
    const amount = lerp(first, last, step / FLIGHT_SAMPLES);
    return [lerp(x0, x1, amount), lerp(y0, y1, amount) + 4 * amount * (1 - amount) * arcHeight, lerp(z0, z1, amount)];
  });
}

function roadLine(waypoints: LonLat[], surface: RouteSurface): Point3[] {
  const points: Point3[] = [];
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const [x0, z0] = surface.toLocal(start);
    const [x1, z1] = surface.toLocal(end);
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / ROAD_SAMPLE_M));
    for (let step = index === 0 ? 0 : 1; step <= steps; step += 1) {
      const amount = step / steps;
      const position: LonLat = [lerp(start[0], end[0], amount), lerp(start[1], end[1], amount)];
      const [x, z] = surface.toLocal(position);
      points.push([x, surface.groundY(position) + ROAD_LIFT, z]);
    }
  }
  return points;
}

function segmentIndexAt(route: TravelRoute, fraction: number): number {
  const target = Math.min(1, Math.max(0, fraction)) * route.length;
  let low = 0;
  let high = route.distances.length - 2;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (route.distances[middle] <= target) low = middle;
    else high = middle - 1;
  }
  return low;
}

function localFraction(route: TravelRoute, index: number, fraction: number): number {
  const target = Math.min(1, Math.max(0, fraction)) * route.length;
  const span = route.distances[index + 1] - route.distances[index];
  return span <= 0 ? 0 : Math.min(1, (target - route.distances[index]) / span);
}

function normalise([x, y, z]: Point3): Point3 {
  const size = Math.hypot(x, y, z) || 1;
  return [x / size, y / size, z / size];
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
