// The guided tours: their stops are catalogue ids, the captions carry a source, and a tour stop round-trips in the address.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { register } from "node:module";

register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);

const { TAS_TEPELER_TOUR, WONDERS_TOUR, findGuidedTour, tourStopIsShowing } = await import("../lib/world/guidedTours.ts");
const { parseViewUrl, serialiseViewUrl } = await import("../lib/globe/viewUrl.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const WONDERS_ORDER = ["Q214944", "Q5996986", "Q2402267", "Q192522", "Q1535226", "Q833850", "Q216862", "Q339503", "Q39671", "Q12508", "Q219279", "Q5725"];
const root = join(import.meta.dirname, "..");
const coreIds = new Set((JSON.parse(readFileSync(join(root, "public/world/core.json"), "utf8")) as { id: string[] }).id);

function catalogueHolds(id: string): boolean {
  if (coreIds.has(id)) return true;
  const bucket = id.slice(-2).toLowerCase();
  const detail = JSON.parse(readFileSync(join(root, "public/world/detail", `${bucket}.json`), "utf8")) as Record<string, { lon?: unknown; lat?: unknown }>;
  const record = detail[id];
  return typeof record?.lon === "number" && typeof record?.lat === "number";
}

check("the wonders route keeps its order", WONDERS_TOUR.stops.map((stop) => stop.siteId).join() === WONDERS_ORDER.join());
check("a wonders stop has no extra caption", WONDERS_TOUR.stops.every((stop) => stop.caption === "" && stop.source === ""));

const seen = new Set<string>();
const forbidden = new Set(["Q134611641", "961911"]);
for (const stop of TAS_TEPELER_TOUR.stops) {
  check(`stop ${stop.siteId} is in the catalogue`, catalogueHolds(stop.siteId));
  check(`stop ${stop.siteId} is not a misplaced record`, !forbidden.has(stop.siteId));
  check(`stop ${stop.siteId} has a caption and a source`, stop.caption.length > 40 && stop.source.length > 8);
  check(`stop ${stop.siteId} is named once`, !seen.has(stop.siteId));
  seen.add(stop.siteId);
}
check("the Taş Tepeler tour names the published sites the catalogue holds",
  ["Q214944", "Q5996986", "Q115679382", "Q119166486", "Q108784502", "Q118133735", "Q1117607", "Q132182828", "Q134960980", "Q1151606"]
    .every((id) => seen.has(id)));
check("an unknown tour id is not a tour", findGuidedTour("no-such-tour") === undefined);

const marks = ["T-shaped pillars", "Karul", "Özdoğan", "slightly older", "magnetometry", "Ankara", "plain", "2025", "Hamzan Hill", "reservoir"];
check("each caption keeps the fact it was written from", TAS_TEPELER_TOUR.stops.every((stop, index) => stop.caption.includes(marks[index])));

const source = readFileSync(join(import.meta.dirname, "../lib/world/guidedTours.ts"), "utf8");
check("the tour file carries no coordinate pair", !/\d+\.\d{4,}/.test(source));

const globe = { view: "globe" as const, longitude: 38.92, latitude: 37.22, altitude: 510_000 };
check("a tour stop round-trips in the address",
  serialiseViewUrl({ ...globe, tourId: "tas-tepeler", stopId: "Q5996986" }) === "?view=globe&lon=38.92&lat=37.22&alt=510&tour=tas-tepeler&stop=Q5996986"
  && (parseViewUrl("?view=globe&tour=tas-tepeler&stop=Q1151606") as { tourId?: string; stopId?: string }).stopId === "Q1151606");
check("a tour with no stop still names the tour",
  (parseViewUrl("?tour=tas-tepeler") as { tourId?: string; stopId?: string }).tourId === "tas-tepeler"
  && !("stopId" in parseViewUrl("?tour=tas-tepeler")));
check("an unknown tour, a stop from another tour, and a malformed stop are dropped",
  !("tourId" in parseViewUrl("?view=globe&tour=../x&stop=Q214944"))
  && !("tourId" in parseViewUrl("?view=globe&tour=no-such-tour"))
  && (parseViewUrl("?view=globe&tour=tas-tepeler&stop=Q12508") as { stopId?: string }).stopId === undefined
  && (parseViewUrl("?view=globe&tour=wonders&stop=Q214944") as { tourId?: string }).tourId === "wonders");
check("other views ignore the tour", !("tourId" in parseViewUrl("?view=atlas&site=gobekli-tepe&tour=tas-tepeler&stop=Q214944")));
check("writing an unknown tour leaves it out", serialiseViewUrl({ ...globe, tourId: "nope", stopId: "Q214944" }) === "?view=globe&lon=38.92&lat=37.22&alt=510");

check("the open card is the stop", tourStopIsShowing("Q1", "Q1", null, null));
check("a lookup that has not landed still counts", tourStopIsShowing("Q2", "Q1", "Q2", "Q1"));
check("choosing another place leaves the stop", !tourStopIsShowing("Q2", "Q3", "Q2", "Q1"));
check("closing the card leaves the stop", !tourStopIsShowing("Q1", null, null, "Q1"));
check("a tour opened on an empty card can wait for its first stop", tourStopIsShowing("Q9", null, "Q9", null));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
