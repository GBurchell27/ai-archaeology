import {
  WGS84_EQUATORIAL_RADIUS,
  WGS84_POLAR_RADIUS,
  cameraAltitude,
  greatCircleMetres,
  interpolateGreatCircle,
  intersectRayWithEllipsoid,
  lonLatHeightToScene,
  sceneToLonLatHeight,
} from "../lib/globe/ellipsoid.ts";
import { ENTER_WALK_DISTANCE, OFFER_WALK_DISTANCE, WALK_DIVE_DISTANCE, WALK_SITE_REACH, advanceWalkEntry, walkHandoffStage, walkSiteUnderTarget } from "../lib/atlas/walkHandoff.ts";
import { atlasLookFromGlobe, globeLookFromAtlas, handoffStage } from "../lib/globe/handoff.ts";
import { compactRecordCredits, compactSourceCredit, imageryHostName } from "../lib/globe/compactCredits.ts";
import { DEFAULT_GLOBE_BASEMAP, FALLBACK_GLOBE_BASEMAP } from "../lib/globe/basemaps.ts";
import { register } from "node:module";

// The view URL reads the theory registry, whose files import each other without an extension; teach Node to add it.
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);
const { DEFAULT_GLOBE_LOOK, parseViewUrl, serialiseViewUrl } = await import("../lib/globe/viewUrl.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

// Frame: +X at 0°E 0°N, +Y at 90°E, +Z at the north pole.
const origin = lonLatHeightToScene(0, 0, 0);
check("0E 0N sits on +X at the equatorial radius", near(origin[0], WGS84_EQUATORIAL_RADIUS, 1e-6) && near(origin[1], 0, 1e-6) && near(origin[2], 0, 1e-6));
check("90E sits on +Y", near(lonLatHeightToScene(90, 0, 0)[1], WGS84_EQUATORIAL_RADIUS, 1e-6));
check("the north pole sits on +Z at the polar radius", near(lonLatHeightToScene(0, 90, 0)[2], WGS84_POLAR_RADIUS, 1e-3));

for (const [longitude, latitude, height] of [[38, 30, 9_000_000], [-122.4, 37.8, 0], [151.2, -33.9, 450_000], [10, 89.5, 1200], [-70, -55, 25]]) {
  const back = sceneToLonLatHeight(lonLatHeightToScene(longitude, latitude, height));
  check(`round trip ${longitude},${latitude},${height}`,
    near(back.longitude, longitude, 1e-9) && near(back.latitude, latitude, 1e-9) && near(back.height, height, 1e-3));
}
check("camera altitude is height above the ellipsoid", near(cameraAltitude(lonLatHeightToScene(37, 39, 900_000)), 900_000, 1e-3));

const hit = intersectRayWithEllipsoid([2 * WGS84_EQUATORIAL_RADIUS, 0, 0], [-1, 0, 0]);
check("a ray down the X axis hits 0E 0N", hit !== null && near(hit[0], WGS84_EQUATORIAL_RADIUS, 1e-3));
check("a ray pointing away misses", intersectRayWithEllipsoid([2 * WGS84_EQUATORIAL_RADIUS, 0, 0], [1, 0, 0]) === null);
check("a ray past the limb misses", intersectRayWithEllipsoid([2 * WGS84_EQUATORIAL_RADIUS, 0, 0], [0, 0, 1]) === null);

check("a quarter of the equator is a quarter circumference",
  near(greatCircleMetres({ longitude: 0, latitude: 0 }, { longitude: 90, latitude: 0 }), Math.PI / 2 * WGS84_EQUATORIAL_RADIUS, 1));
const midway = interpolateGreatCircle({ longitude: 0, latitude: 0 }, { longitude: 90, latitude: 0 }, 0.5);
check("the midpoint of an equatorial arc stays on the equator", near(midway.longitude, 45, 1e-9) && near(midway.latitude, 0, 1e-9));
const acrossDateLine = interpolateGreatCircle({ longitude: 170, latitude: 10 }, { longitude: -170, latitude: 10 }, 0.5);
check("an arc takes the short way over the date line", near(Math.abs(acrossDateLine.longitude), 180, 1e-6));

const globeState = { view: "globe" as const, longitude: 38.123, latitude: -30.456, altitude: 1_234_567 };
const globeBack = parseViewUrl(serialiseViewUrl(globeState));
check("globe url keeps two decimals and whole km", serialiseViewUrl(globeState) === "?view=globe&lon=38.12&lat=-30.46&alt=1235");
check("globe url round trips", globeBack.view === "globe" && globeBack.longitude === 38.12 && globeBack.latitude === -30.46 && globeBack.altitude === 1_235_000);
check("site urls round trip",
  JSON.stringify(parseViewUrl(serialiseViewUrl({ view: "place", siteId: "Q12345" }))) === JSON.stringify({ view: "place", siteId: "Q12345" })
  && JSON.stringify(parseViewUrl(serialiseViewUrl({ view: "atlas", siteId: "osm-n123" }))) === JSON.stringify({ view: "atlas", siteId: "osm-n123" })
  && serialiseViewUrl({ view: "atlas" }) === "?view=atlas");
const empty = parseViewUrl("");
check("an empty url is the default globe", empty.view === "globe" && empty.longitude === DEFAULT_GLOBE_LOOK.longitude && empty.altitude === DEFAULT_GLOBE_LOOK.altitude);
const hostile = parseViewUrl("?view=place&site=../../etc&lon=abc&lat=999&alt=-5");
check("a malformed site id falls back to the globe", hostile.view === "globe");
check("out of range numbers are clamped or defaulted",
  hostile.view === "globe" && hostile.longitude === DEFAULT_GLOBE_LOOK.longitude && hostile.latitude === 90 && hostile.altitude === 100_000);
check("a walk url round trips",
  serialiseViewUrl({ view: "walk", siteId: "karahan-tepe" }) === "?view=walk&site=karahan-tepe"
  && JSON.stringify(parseViewUrl("?view=walk&site=karahan-tepe")) === JSON.stringify({ view: "walk", siteId: "karahan-tepe" }));
check("a walk url keeps the photographs and leaves the model out",
  serialiseViewUrl({ view: "walk", siteId: "gobekli-tepe", source: "photographs" }) === "?view=walk&site=gobekli-tepe&source=photographs"
  && serialiseViewUrl({ view: "walk", siteId: "gobekli-tepe", source: "model" }) === "?view=walk&site=gobekli-tepe"
  && JSON.stringify(parseViewUrl("?view=walk&site=gobekli-tepe&source=photographs")) === JSON.stringify({ view: "walk", siteId: "gobekli-tepe", source: "photographs" }));
check("an address with an unknown walk source is rewritten without it",
  serialiseViewUrl(parseViewUrl("?view=walk&site=gobekli-tepe&source=bogus")) === "?view=walk&site=gobekli-tepe"
  && serialiseViewUrl(parseViewUrl("?view=walk&site=gobekli-tepe&source=photographs&source=bogus")) === "?view=walk&site=gobekli-tepe&source=photographs");
check("an unknown walk source is the default, and other views ignore the parameter",
  JSON.stringify(parseViewUrl("?view=walk&site=gobekli-tepe&source=lidar")) === JSON.stringify({ view: "walk", siteId: "gobekli-tepe" })
  && JSON.stringify(parseViewUrl("?view=place&site=Q1&source=photographs")) === JSON.stringify({ view: "place", siteId: "Q1" }));
check("a walk url without a usable site id falls back to the globe",
  parseViewUrl("?view=walk").view === "globe" && parseViewUrl("?view=walk&site=../x").view === "globe");
check("server-style search params parse", parseViewUrl({ view: "atlas", site: ["gobekli-tepe"] }).view === "atlas");

const overTurkey = { longitude: 38.9, latitude: 37.2 };
check("high over Turkey: no offer", handoffStage({ ...overTurkey, altitude: 900_000 }) === "none");
check("below 900 km over Turkey: offer", handoffStage({ ...overTurkey, altitude: 899_000 }) === "offer");
check("at 450 km the offer still stands", handoffStage({ ...overTurkey, altitude: 450_000 }) === "offer");
check("below 450 km over Turkey: enter", handoffStage({ ...overTurkey, altitude: 449_000 }) === "enter");
check("low over Egypt: nothing", handoffStage({ longitude: 31.1, latitude: 29.9, altitude: 200_000 }) === "none");
check("the bounds edge counts as inside", handoffStage({ longitude: 25.5, latitude: 35.8, altitude: 500_000 }) === "offer");
check("the atlas opens no further out than the handoff altitude", atlasLookFromGlobe({ ...overTurkey, altitude: 800_000 }).cameraDistance === 450_000);
check("coming back to the globe does not re-offer the atlas", handoffStage(globeLookFromAtlas(overTurkey)) === "none");

const walkAnchors = [{ id: "west", x: 0, z: 0 }, { id: "east", x: 35_000, z: 2000 }];
check("the walk site under the camera target is the nearest one in reach",
  walkSiteUnderTarget({ x: 34_700, z: 2100 }, walkAnchors)?.id === "east" && walkSiteUnderTarget({ x: 0, z: WALK_SITE_REACH }, walkAnchors)?.id === "west");
check("a target out of reach is over no walk site", walkSiteUnderTarget({ x: 0, z: WALK_SITE_REACH + 1 }, walkAnchors) === null);
check("far above a walk site: no offer", walkHandoffStage(OFFER_WALK_DISTANCE, true) === "none");
check("close above a walk site: offer", walkHandoffStage(OFFER_WALK_DISTANCE - 1, true) === "offer" && walkHandoffStage(ENTER_WALK_DISTANCE, true) === "offer");
check("closer still: enter", walkHandoffStage(ENTER_WALK_DISTANCE - 1, true) === "enter");
check("close over open country: nothing", walkHandoffStage(300, false) === "none");
check("the dive ends inside the enter line", WALK_DIVE_DISTANCE < ENTER_WALK_DISTANCE && ENTER_WALK_DISTANCE < OFFER_WALK_DISTANCE);
const openedLow = advanceWalkEntry(false, "enter");
check("a camera that starts below the line does not bounce in", !openedLow.enter && !openedLow.crossedFromAbove);
const seenAbove = advanceWalkEntry(false, "offer");
const crossed = advanceWalkEntry(seenAbove.crossedFromAbove, "enter");
check("a zoom that crosses the line enters once", seenAbove.crossedFromAbove && crossed.enter && !advanceWalkEntry(crossed.crossedFromAbove, "enter").enter);

const { historyEntryForView } = await import("../lib/globe/viewHistory.ts");
check("a change of view adds one history entry", historyEntryForView("atlas", "walk", false) === "push" && historyEntryForView("globe", "atlas", false) === "push");
check("a write within a view rewrites its entry", historyEntryForView("globe", "globe", false) === "replace");
check("landing on an entry with Back or Forward adds none", historyEntryForView("walk", "atlas", true) === "replace");

// The theory lens: `&theory=<id>` on a globe address.
const lensAddress = parseViewUrl("?view=globe&theory=giza-power-plant");
check("a globe address opens the lens on a recorded theory", lensAddress.view === "globe" && lensAddress.theoryId === "giza-power-plant");
check("the theory rides along when the globe address is written",
  serialiseViewUrl({ ...globeState, theoryId: "giza-power-plant" }) === "?view=globe&lon=38.12&lat=-30.46&alt=1235&theory=giza-power-plant"
  && serialiseViewUrl(parseViewUrl("?view=globe&lon=31&lat=30&alt=900&theory=giza-power-plant")) === "?view=globe&lon=31.00&lat=30.00&alt=900&theory=giza-power-plant");
check("the theory is read whether or not the address names the globe", (parseViewUrl("?theory=giza-power-plant") as { theoryId?: string }).theoryId === "giza-power-plant");
check("an unknown or malformed theory is dropped",
  !("theoryId" in parseViewUrl("?view=globe&theory=no-such-theory")) && !("theoryId" in parseViewUrl("?view=globe&theory=../Giza"))
  && serialiseViewUrl(parseViewUrl("?view=globe&lon=31&lat=30&alt=900&theory=no-such-theory")) === "?view=globe&lon=31.00&lat=30.00&alt=900");
check("other views ignore the theory", JSON.stringify(parseViewUrl("?view=atlas&site=gobekli-tepe&theory=giza-power-plant")) === JSON.stringify({ view: "atlas", siteId: "gobekli-tepe" }));
check("a globe address without a theory has none", !("theoryId" in globeBack) && !("theoryId" in empty));

const { altitudeToSee, spanOfSites } = await import("../lib/globe/siteSpan.ts");
const oneSite = spanOfSites([{ longitude: 31.1, latitude: 29.9 }]);
check("one site is its own middle, with no reach", oneSite !== null && near(oneSite.longitude, 31.1, 1e-9) && near(oneSite.latitude, 29.9, 1e-9) && oneSite.reachMetres < 1e-3);
const acrossEquator = spanOfSites([{ longitude: 0, latitude: 0 }, { longitude: 90, latitude: 0 }]);
check("two sites are centred between them and reach to each",
  acrossEquator !== null && near(acrossEquator.longitude, 45, 1e-9) && near(acrossEquator.reachMetres, Math.PI / 4 * WGS84_EQUATORIAL_RADIUS, 1));
const overDateLine = spanOfSites([{ longitude: 170, latitude: 10 }, { longitude: -170, latitude: 10 }]);
check("sites either side of the date line are centred on it", overDateLine !== null && near(Math.abs(overDateLine.longitude), 180, 1e-6));
const opposite = spanOfSites([{ longitude: 20, latitude: 0 }, { longitude: -160, latitude: 0 }]);
check("sites on opposite sides of the Earth fall back to the first", opposite !== null && near(opposite.longitude, 20, 1e-9));
check("no sites give no span, and a wider span needs a higher camera",
  spanOfSites([]) === null && acrossEquator !== null && oneSite !== null && altitudeToSee(acrossEquator) > altitudeToSee(oneSite));

// A walk reached from the globe: which card offers it, and where its exit leads.
const { walkOfferedOnGlobe, walkReturn, walkSiteForCard } = await import("../lib/globe/walkHandoff.ts");
const { findWalkSite } = await import("../lib/walk/walkSites.ts");
const gizaWalk = findWalkSite("Q12508");
const gobekliWalk = findWalkSite("gobekli-tepe");
check("the Giza complex and the Great Pyramid both offer the Giza walk on the globe", gizaWalk !== null && walkOfferedOnGlobe("Q12508") === gizaWalk && walkOfferedOnGlobe("Q37200") === gizaWalk);
check("no other globe card offers a walk: Göbekli Tepe's is offered by the Anatolia map", walkOfferedOnGlobe("Q214944") === null && walkOfferedOnGlobe("gobekli-tepe") === null && walkOfferedOnGlobe("Q1") === null);
check("an address may name the walk or a card that offers it", walkSiteForCard("Q37200") === gizaWalk && walkSiteForCard("Q12508") === gizaWalk && walkSiteForCard("gobekli-tepe") === gobekliWalk && walkSiteForCard("Q214944") === null && walkSiteForCard(undefined) === null);
check("the Giza walk parses as a walk address", JSON.stringify(parseViewUrl("?view=walk&site=Q12508")) === JSON.stringify({ view: "walk", siteId: "Q12508" }) && serialiseViewUrl({ view: "walk", siteId: "Q12508" }) === "?view=walk&site=Q12508");
check("a walk entered from a globe card returns to the globe with that card open",
  gizaWalk !== null && JSON.stringify(walkReturn(gizaWalk, "Q37200")) === JSON.stringify({ view: "globe", siteId: "Q37200" }) && walkReturn(gizaWalk, "Q12508").siteId === "Q12508");
check("opened by its address, or after another site's card, it returns to the card of the complex",
  gizaWalk !== null && JSON.stringify(walkReturn(gizaWalk)) === JSON.stringify({ view: "globe", siteId: "Q12508" }) && walkReturn(gizaWalk, "Q214944").siteId === "Q12508");
check("an Anatolian walk returns to the Anatolia map whatever card the globe last showed",
  gobekliWalk !== null && JSON.stringify(walkReturn(gobekliWalk, "Q12508")) === JSON.stringify({ view: "atlas", siteId: "gobekli-tepe" }) && walkReturn(findWalkSite("karahan-tepe")!).view === "atlas");
check("leaving a walk for the globe is a change of view like any other", historyEntryForView("walk", "globe", false) === "push" && historyEntryForView("globe", "walk", true) === "replace");

check("the phone credit names EOX and NASA by the basemap", imageryHostName(DEFAULT_GLOBE_BASEMAP) === "EOX" && imageryHostName(FALLBACK_GLOBE_BASEMAP) === "NASA");
check("a catalogue credit keeps the licence and shortens CC0",
  compactSourceCredit({ attribution: "Wikidata", licence: "CC0 1.0" }) === "Wikidata CC0"
  && compactSourceCredit({ attribution: "Pleiades contributors", licence: "CC BY 3.0" }) === "Pleiades CC BY 3.0");
check("the phone line names Wikidata and Pleiades and leaves OpenStreetMap to its own credit",
  compactRecordCredits({
    sources: [
      { id: "wikidata", attribution: "Wikidata", licence: "CC0 1.0" },
      { id: "pleiades", attribution: "Pleiades contributors", licence: "CC BY 3.0" },
      { id: "osm", attribution: "© OpenStreetMap contributors", licence: "ODbL 1.0" },
    ],
    osmMegaliths: { count: 1, file: "osm.json" },
  }) === "Wikidata CC0 · Pleiades CC BY 3.0");
check("with no separate OpenStreetMap file, that source stays on the line",
  compactRecordCredits({
    sources: [{ id: "osm", attribution: "© OpenStreetMap contributors", licence: "ODbL 1.0" }],
  }) === "OpenStreetMap ODbL 1.0");

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
