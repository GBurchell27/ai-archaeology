import {
  formatYearRange,
  framingCameraOffset,
  gridHeightAt,
  groundMetresPerPixel,
  lonLatToMercator,
  perimeterCells,
  scaleBarFor,
  verticalScale,
} from "../lib/place/placeGeometry.ts";
import { FAILURE_TEXT, placeFailureForStatus } from "../lib/place/placeFailure.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

// Heights: at 60° latitude a Mercator metre is half a ground metre, so heights double in scene units.
check("no projection stretch leaves the exaggeration alone", verticalScale(2, 15, 15) === 2);
check("heights follow the Mercator stretch", near(verticalScale(1.5, 30, 15), 3, 1e-12));

const [east, north] = lonLatToMercator(180, 0);
check("180°E is half the Mercator world", near(east, 20037508.34, 0.01) && near(north, 0, 1e-6));
check("the southern hemisphere is negative north", lonLatToMercator(30.933, -20.27)[1] < 0);
check("Great Zimbabwe lands in its close-up window", near(lonLatToMercator(30.933, -20.27)[0], 3443512, 500));

// Camera: from the south-east means +x (east) and +z (south), 35° up, far enough to fit the span.
const offset = framingCameraOffset(10000, 35, 16 / 10, 135, 35);
const distance = Math.hypot(...offset);
check("south-east is +x and +z", offset[0] > 0 && offset[2] > 0 && near(offset[0], offset[2], 1e-6));
check("the camera sits 35° above the horizon", near(Math.asin(offset[1] / distance), (35 * Math.PI) / 180, 1e-9));
check("the window fits a landscape view", near(distance, 6200 / Math.sin((17.5 * Math.PI) / 180), 1e-6));
check("a portrait view stands further back", Math.hypot(...framingCameraOffset(10000, 35, 390 / 844, 135, 35)) > distance * 2);

// Scale bar
check("ground metres per pixel undo the Mercator stretch",
  near(groundMetresPerPixel(1000, 90, 1000, 30, 15), 1, 1e-9));
const bar = scaleBarFor(17, 120);
check("the bar is a 1-2-5 length that fits", bar.metres === 2000 && bar.label === "2 km" && bar.pixels <= 120);
check("short bars are in metres", scaleBarFor(1.2, 120).label === "100 m");
check("an exact fit is kept", scaleBarFor(10, 100).metres === 1000);

// Skirt perimeter
const edge = perimeterCells(4, 3);
check("the perimeter visits every edge cell once", edge.length === 10 && new Set(edge.map(String)).size === 10);
check("the perimeter starts north-west and runs east", String(edge[0]) === "0,0" && String(edge[1]) === "0,1");

// Height lookup: row 0 is the north edge.
const grid = { width: 2, height: 2, bounds: [0, 0, 20, 20] as [number, number, number, number], metres: new Float32Array([1, 2, 3, 4]) };
check("north-west cell", gridHeightAt(grid, 5, 15) === 1);
check("south-east cell", gridHeightAt(grid, 15, 5) === 4);
check("points outside clamp to the edge", gridHeightAt(grid, -50, 500) === 1);

check("BCE range", formatYearRange(-3000, -1500) === "3000–1500 BCE");
check("range across the eras", formatYearRange(-200, 400) === "200 BCE – 400 CE");
check("CE range", formatYearRange(1000, 1450) === "1000–1450 CE");
check("open start", formatYearRange(null, -800) === "until 800 BCE");
check("undated", formatYearRange(null, null) === null);

// A server that builds no close-ups (503) is its own failure, with words for it; the others are unchanged.
check("503 means close-ups are unavailable", placeFailureForStatus(503) === "unavailable");
check("404 and 400 mean no close-up for this place", placeFailureForStatus(404) === "outside" && placeFailureForStatus(400) === "outside");
check("502 is a failed build", placeFailureForStatus(502) === "failed");
check("the unavailable text does not ask to try again", !/try again/i.test(FAILURE_TEXT.unavailable.body) && FAILURE_TEXT.unavailable.title.length > 0);

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
