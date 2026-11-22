// Run: node --experimental-strip-types scripts/check_trip.mts
import { readFileSync } from "node:fs";
import { register } from "node:module";
import type { RouteSurface } from "../lib/trip/tripRoute.ts";
import type { TripRoadsFile } from "../lib/trip/tripRoads.ts";
import type { TravelSegment } from "../lib/trip/tripTypes.ts";

// The trip library imports itself through the "@/" alias, with no extension. Teach Node both.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) return next(root + specifier.slice(2) + ".ts", context);
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);

const { boundsContain, lonLatToMercator } = await import("../lib/geo.ts");
const { TripClock } = await import("../lib/trip/tripClock.ts");
const { clockLabel, localTimeZone } = await import("../lib/trip/tripFormat.ts");
const { storyPlaybackRate } = await import("../lib/trip/tripPlayback.ts");
const { buildTravelRoute, poseAlong, travelledPoints } = await import("../lib/trip/tripRoute.ts");
const { adjacentBoundary, dayMarks, locateSegment, startPlace, timelineProblems, timeSegments, tripSpan } = await import("../lib/trip/tripTimeline.ts");
const { roadFor, roadsFromFile, routedSegments } = await import("../lib/trip/tripRoads.ts");
const { PLACES } = await import("../lib/trip/turkeyTripPlaces.ts");
const { TURKEY_TRIP_2026 } = await import("../lib/trip/turkeyTrip2026.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const timed = timeSegments(TURKEY_TRIP_2026);
const span = tripSpan(timed);
const problems = timelineProblems(timed);
problems.forEach((problem) => console.error("  ", problem));
check("the trip is one unbroken timeline that starts where it ended", problems.length === 0);

check("departs Amsterdam 12:40 local", span.startMs === Date.parse("2026-04-14T10:40:00Z"));
check("lands in Amsterdam 15:25 local", span.endMs === Date.parse("2026-04-21T13:25:00Z"));
check("first clock reads Amsterdam time", clockLabel(span.startMs, "Europe/Amsterdam") === "Tue 14 Apr, 12:40");

const ticketed = timed.filter(({ segment }) => segment.kind === "travel" && segment.mode === "flight").map(({ segment }) => segment.title);
check("four Pegasus flights", ticketed.length === 4 && ticketed.every((title) => title.startsWith("Pegasus")));

const outbound = locateSegment(timed, span.startMs + 60 * 60_000);
check("an hour in, still on the first flight", outbound.timed.index === 0 && outbound.progress > 0 && outbound.progress < 1);
check("the watch keeps Amsterdam time mid-flight", localTimeZone(outbound) === "Europe/Amsterdam");
check("after landing the watch is on Turkey time", localTimeZone(locateSegment(timed, timed[1].startMs + 1)) === "Europe/Istanbul");
check("the end is the last segment, finished", locateSegment(timed, span.endMs).timed.index === timed.length - 1
  && locateSegment(timed, span.endMs).progress === 1);
check("Göbeklitepe on Wednesday afternoon", locateSegment(timed, Date.parse("2026-04-15T14:00:00+03:00")).timed.segment.title === "Göbeklitepe");
check("on the road to Karadut on Thursday", locateSegment(timed, Date.parse("2026-04-16T13:30:00+03:00")).timed.segment.kind === "travel");

check("next stop from inside a segment", adjacentBoundary(timed, timed[0].startMs + 1, 1) === timed[1].startMs);
check("previous stop from inside a segment is its start", adjacentBoundary(timed, timed[2].startMs + 1, -1) === timed[2].startMs);
check("next stop at the very end stays at the end", adjacentBoundary(timed, span.endMs, 1) === span.endMs);

const days = dayMarks(span, "Europe/Istanbul");
check("eight labelled days, Tue 14 to Tue 21", days.length === 8 && days[0].label === "Tue 14" && days[7].label === "Tue 21");

const rate = storyPlaybackRate(timed);
check("nights play faster than drives", rate(Date.parse("2026-04-15T03:00:00+03:00")) > rate(Date.parse("2026-04-16T13:30:00+03:00")));

const metadata = JSON.parse(readFileSync(new URL("../public/terrain/metadata.json", import.meta.url), "utf8")) as {
  bounds: [number, number, number, number];
};
for (const [key, place] of Object.entries(PLACES)) {
  const inside = boundsContain(metadata.bounds, ...lonLatToMercator(...place.position));
  check(`${place.name} is ${key === "amsterdamAirport" ? "off" : "on"} the atlas`, inside === (key !== "amsterdamAirport"));
}
check("every segment starts at a named place", timed.every(({ segment }) => startPlace(segment).name.length > 0));

const flatSurface: RouteSurface = { toLocal: ([longitude, latitude]) => [longitude * 1000, -latitude * 1000], groundY: () => 0 };
const flight = TURKEY_TRIP_2026.segments[2] as TravelSegment;
const arc = buildTravelRoute(flight, flatSurface);
const middle = poseAlong(arc, 0.5);
check("flights arc above the ground", middle.position[1] > 0);
check("flights take off and land at ground level", arc.points[0][1] === 0 && arc.points[arc.points.length - 1][1] === 0);
check("the vehicle starts at the origin airport", poseAlong(arc, 0).position[0] === arc.points[0][0]);
check("the travelled line ends at the vehicle", travelledPoints(arc, 0.5).at(-1)?.[0] === middle.position[0]);
check("nothing travelled before departure", travelledPoints(arc, 0).length === 0);
check("ground distance only grows", arc.distances.every((distance, index) => index === 0 || distance >= arc.distances[index - 1]));

const framed: RouteSurface = { ...flatSurface, frame: { minX: 33_000, maxX: 41_000, minZ: -39_000, maxZ: -36_000 } };
const clipped = buildTravelRoute(flight, framed);
const [entryX, entryY, entryZ] = clipped.points[0];
const onEdge = [entryX - 33_000, entryX - 41_000, entryZ + 39_000, entryZ + 36_000].some((gap) => Math.abs(gap) < 1e-6);
check("a flight from off the map starts at the map's edge", onEdge && entryY > 0);
check("a clipped flight still lands at its airport", clipped.points.at(-1)?.[0] === flight.to.position[0] * 1000 && clipped.points.at(-1)?.[1] === 0);

const roadsFile = JSON.parse(readFileSync(new URL(`../public${TURKEY_TRIP_2026.roadsUrl}`, import.meta.url), "utf8")) as TripRoadsFile;
const roads = roadsFromFile(roadsFile);
const drives = routedSegments(TURKEY_TRIP_2026).filter((segment) => segment.mode === "drive");
check("the roads file is for this trip", roadsFile.tripId === TURKEY_TRIP_2026.id);
check("every drive has a routed road", drives.every((segment) => roadFor(roads, segment) !== undefined));
const roadStartsNearby = (segment: TravelSegment) => {
  const first = roadFor(roads, segment)?.coordinates[0];
  return !first || Math.hypot(first[0] - segment.from.position[0], first[1] - segment.from.position[1]) < 0.02;
};
check("every road starts close to its stop", routedSegments(TURKEY_TRIP_2026).every(roadStartsNearby));
const climb = drives.find((segment) => segment.to === PLACES.nemrutVisitorCentre) as TravelSegment;
check("the Nemrut climb stops at the visitor centre car park", (roadFor(roads, climb)?.distanceM ?? Infinity) < 15_000);
const climbRoad = roadFor(roads, climb)?.coordinates ?? [];
const followed = buildTravelRoute(climb, flatSurface, climbRoad);
const bend = climbRoad[Math.floor(climbRoad.length / 2)];
check("a drive follows its road", followed.points.some(([x, , z]) => x === bend[0] * 1000 && z === -bend[1] * 1000));

const clock = new TripClock(span, rate);
clock.seek(span.startMs - 1);
check("the clock cannot go before the trip", clock.getSnapshot().timeMs === span.startMs);
clock.seek(span.endMs + 1);
check("the clock cannot go past the trip", clock.getSnapshot().timeMs === span.endMs);

if (failed) {
  console.error(`${failed} trip check(s) failed`);
  process.exit(1);
}
console.log(`trip checks passed: ${timed.length} segments, ${(span.endMs - span.startMs) / 3_600_000} hours`);
console.log(JSON.stringify({ ok: true }));
