// The world catalogue as the globe reads it: key functions agree with the files on disk,
// core rows are placeable, and the filter, cell choice, picking grid and label layout behave.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isOnNearSide } from "../lib/globe/visibleSites.ts";
import { AROUND_MARKER, labelBox, placeLabels } from "../lib/globe/labelLayout.ts";
import { pinSeparationPx, prominentPoints } from "../lib/atlas/pinDeclutter.ts";
import { buildSiteGrid, countShownByBucket, nearestSite } from "../lib/globe/siteGrid.ts";
import {
  cellKeyFor, detailBucket, siteDetailFromStored, sourceUrlFor,
  type NameColumns, type SiteColumns, type StoredSiteDetail, type WorldIndex,
} from "../lib/world/catalogueTypes.ts";
import { CELL_ALTITUDE_LIMIT, HEAVY_CELL_SITES, SiteCellCache, cellKeysInView } from "../lib/world/cellLoader.ts";
import { ALL_SITES, siteMatches, siteVisibility, type SiteFilter } from "../lib/world/siteFilter.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

// --- Filter semantics, on synthetic rows.
const siteTypes = ["settlement", "megalith"];
const rows: SiteColumns = {
  id: ["a", "b", "c", "d"], name: ["A", "B", "C", "D"], lon: [0, 1, 2, 3], lat: [0, 1, 2, 3],
  type: [0, 1, 0, 1], start: [-3000, -500, null, null], end: [-1000, null, null, 200],
  importance: [0, 0, 0, 0], source: [0, 0, 0, 0], featured: [1, 0, 0, 0],
};
const during = (range: [number, number] | null, more: Partial<SiteFilter> = {}): SiteFilter => ({ ...ALL_SITES, range, ...more });
const megalithsOnly = during(null, { types: new Set(["megalith"]) });
check("null range shows everything", [0, 1, 2, 3].every((row) => siteMatches(rows, row, ALL_SITES, siteTypes)));
check("a range overlapping [start,end] matches", siteMatches(rows, 0, during([-1200, -800]), siteTypes));
check("touching the end year still overlaps", siteMatches(rows, 0, during([-1000, 0]), siteTypes));
check("a range before the site does not match", !siteMatches(rows, 0, during([-9000, -3001]), siteTypes));
check("a range after the site does not match", !siteMatches(rows, 0, during([-999, 500]), siteTypes));
check("undated sites show only with showUndated",
  siteMatches(rows, 2, during([-500, 0]), siteTypes) && !siteMatches(rows, 2, during([-500, 0], { showUndated: false }), siteTypes));
check("undated sites show under a null range even without showUndated", siteMatches(rows, 2, during(null, { showUndated: false }), siteTypes));
check("a single known bound is a moment",
  siteMatches(rows, 1, during([-600, -400], { showUndated: false }), siteTypes) && !siteMatches(rows, 3, during([-600, -400]), siteTypes));
check("type filter", !siteMatches(rows, 0, megalithsOnly, siteTypes) && siteMatches(rows, 1, megalithsOnly, siteTypes));
check("featured only", siteVisibility(rows, during(null, { featuredOnly: true }), siteTypes).join("") === "1000");

// --- Cell choice and cache.
const allCells = Object.fromEntries(Array.from({ length: 36 * 18 }, (_, n) => [`${n % 36}_${Math.floor(n / 36)}`, 1]));
check("no cells from orbit", cellKeysInView({ longitude: 0, latitude: 0, altitude: CELL_ALTITUDE_LIMIT }, allCells).length === 0);
const lowOverGiza = cellKeysInView({ longitude: 31.1, latitude: 29.9, altitude: 300_000 }, allCells);
check("the cell under the camera comes first", lowOverGiza[0] === cellKeyFor(31.1, 29.9));
check("a low camera asks for a handful of cells", lowOverGiza.length >= 1 && lowOverGiza.length <= 9);
check("cells across the date line are neighbours",
  cellKeysInView({ longitude: 179.9, latitude: 0.1, altitude: 500_000 }, allCells).includes(cellKeyFor(-179.9, 0.1)));
check("only existing cells are asked for", cellKeysInView({ longitude: 31.1, latitude: 29.9, altitude: 300_000 }, { "0_0": 5 }).length === 0);
check("cells around both poles and the date line never throw or repeat", [[180, 90], [-180, -90], [179.99, 89.99], [0, -90]].every(([longitude, latitude]) => {
  const keys = cellKeysInView({ longitude, latitude, altitude: 900_000 }, allCells);
  return new Set(keys).size === keys.length && keys.includes(cellKeyFor(longitude, latitude));
}));
check("at a pole every longitude's polar cell is a neighbour",
  cellKeysInView({ longitude: 10, latitude: 89.9, altitude: 900_000 }, allCells).includes(cellKeyFor(-170, 85)));
check("cell keys stay in range at the edges", cellKeyFor(180, 90) === "35_17" && cellKeyFor(-180, -90) === "0_0");
// A very large cell (Scandinavia's is 2.4 MB) waits until it is on screen, not merely inside the tilt allowance.
const overRome = { longitude: 12.5, latitude: 41.9, altitude: 800_000 };
const north = cellKeyFor(15, 55);
check("a light cell just outside the screen is fetched ahead", cellKeysInView(overRome, { [north]: HEAVY_CELL_SITES }).includes(north));
check("a heavy cell just outside the screen is not", !cellKeysInView(overRome, { [north]: HEAVY_CELL_SITES + 1 }).includes(north));
check("a heavy cell on screen is fetched", cellKeysInView({ ...overRome, altitude: 2_000_000 }, { [north]: HEAVY_CELL_SITES + 1 }).includes(north)
  && cellKeysInView({ longitude: 15, latitude: 55, altitude: 200_000 }, { [north]: HEAVY_CELL_SITES + 1 })[0] === north);
let fetches = 0;
const cache = new SiteCellCache(async () => { fetches += 1; return rows; }, 2);
cache.request(["a", "b", "c"], () => undefined);
cache.request(["a"], () => undefined);
await new Promise((resolve) => setTimeout(resolve, 0));
check("each cell is fetched once and the cache is capped", fetches === 3 && cache.size === 2 && cache.request(["c"], () => undefined).length === 1);

// --- Picking grid, bucket counts, horizon, labels.
const grid = buildSiteGrid(rows.lon, rows.lat);
check("nearest site", nearestSite(grid, rows.lon, rows.lat, 1.2, 1.1, 1, () => 1)?.row === 1);
check("nearest skips rejected rows", nearestSite(grid, rows.lon, rows.lat, 1.2, 1.1, 2, (row) => (row === 1 ? 0 : 1))?.row === 2);
check("nothing within reach", nearestSite(grid, rows.lon, rows.lat, 40, 40, 1, () => 1) === null);
const dateLine = buildSiteGrid([179.95], [10]);
check("nearest works across the date line", nearestSite(dateLine, [179.95], [10], -179.95, 10, 0.5, () => 1)?.row === 0);
check("bucket counts add up to the shown rows",
  countShownByBucket(grid, rows.lon, rows.lat, [1, 1, 0, 1]).reduce((sum, bucket) => sum + bucket.count, 0) === 3);
check("the near side is visible, the far side and the limb are not",
  isOnNearSide(6378137, 0, 0, 2e7, 0, 0) && !isOnNearSide(-6378137, 0, 0, 2e7, 0, 0) && !isOnNearSide(0, 6378137, 0, 2e7, 0, 0));
const viewport = { width: 800, height: 600 };
const labels = placeLabels([
  { name: "Stonehenge", screenX: 400, screenY: 300 },
  { name: "Avebury", screenX: 404, screenY: 304 },
  { name: "Carnac", screenX: 400, screenY: 500 },
], 5, viewport);
check("an overlapping label takes the other side", labels.length === 3 && labels[0].side === "right" && labels[1].side === "left");
check("labels keep clear of obstacles",
  placeLabels([{ name: "Carnac", screenX: 400, screenY: 500 }], 5, viewport, [{ left: 0, right: 800, top: 480, bottom: 520 }]).length === 0);

const hemmedIn = { name: "Karahan Tepe", screenX: 400, screenY: 300 };
const flanks = [{ left: 410, right: 600, top: 290, bottom: 310 }, { left: 200, right: 390, top: 290, bottom: 310 }];
check("a name with both flanks taken stays off unless it may go above", placeLabels([hemmedIn], 5, viewport, flanks).length === 0);
check("a name with both flanks taken goes above its marker", placeLabels([hemmedIn], 5, viewport, flanks, 0, AROUND_MARKER)[0]?.side === "above");
check("a name under the top edge goes below its marker",
  placeLabels([{ ...hemmedIn, screenY: 20 }], 5, viewport, [{ left: 410, right: 600, top: 10, bottom: 30 }, { left: 200, right: 390, top: 10, bottom: 30 }], 0, AROUND_MARKER)[0]?.side === "below");
check("a wider marker pushes its name out", labelBox({ ...hemmedIn, markerGapPx: 27 }, "right").left === 427 && labelBox(hemmedIn, "right").left === 413);

check("source records derive from the id",
  sourceUrlFor("Q39671") === "https://www.wikidata.org/wiki/Q39671"
  && sourceUrlFor("579885") === "https://pleiades.stoa.org/places/579885"
  && sourceUrlFor("osm-n123") === "https://www.openstreetmap.org/node/123"
  && sourceUrlFor("osm-w45") === "https://www.openstreetmap.org/way/45");

// --- The files on disk (skipped when the catalogue has not been built).
const world = fileURLToPath(new URL("../public/world/", import.meta.url));
const readJson = <Shape,>(file: string) => JSON.parse(readFileSync(world + file, "utf8")) as Shape;
const listed = (folder: string) => (existsSync(world + folder) ? readdirSync(world + folder).map((file) => file.replace(/\.json$/, "")).sort() : []);
let onDisk: Record<string, number> | "absent" = "absent";
if (existsSync(world + "index.json") && existsSync(world + "core.json")) {
  const index = readJson<WorldIndex>("index.json");
  const core = readJson<SiteColumns>("core.json");
  const count = core.id.length;
  check("core columns are the same length",
    [core.name, core.lon, core.lat, core.type, core.start, core.end, core.importance, core.source, core.featured].every((column) => column.length === count));
  check("core count matches the index", count === index.coreCount);
  check("every core row has finite, in-range coordinates",
    core.lon.every((lon, row) => Number.isFinite(lon) && Number.isFinite(core.lat[row]) && Math.abs(lon) <= 180 && Math.abs(core.lat[row]) <= 90));
  check("every core type and source index resolves",
    core.type.every((type) => type in index.siteTypes) && core.source.every((source) => source in index.sources));
  const cellFiles = listed("cells");
  check("the index lists exactly the cell files on disk", JSON.stringify(Object.keys(index.cells).sort()) === JSON.stringify(cellFiles));
  for (const key of cellFiles) {
    const cell = readJson<SiteColumns>(`cells/${key}.json`);
    check(`cell ${key} holds only its own sites`, cell.lon.every((lon, row) => cellKeyFor(lon, cell.lat[row]) === key));
    check(`cell ${key} count matches the index`, cell.id.length === index.cells[key]);
  }
  const buckets = new Set(listed("detail"));
  check("every core id has its detail bucket on disk", core.id.every((id) => buckets.has(detailBucket(id))));
  const sample = core.id[Math.floor(count / 2)];
  const sampleShard = readJson<Record<string, StoredSiteDetail>>(`detail/${detailBucket(sample)}.json`);
  check("a detail bucket holds the ids that hash to it", sample in sampleShard);
  const sampleDetail = siteDetailFromStored(sample, sampleShard[sample]);
  check("a stored detail record reads back whole",
    sampleDetail.sourceUrl.startsWith("https://") && Array.isArray(sampleDetail.types) && Array.isArray(sampleDetail.heritage));
  let names = 0;
  if (index.namesFile) {
    const nameRows = readJson<NameColumns>(index.namesFile);
    names = nameRows.id.length;
    check("names columns are the same length",
      [nameRows.name, nameRows.lon, nameRows.lat, nameRows.type, nameRows.start, nameRows.end].every((column) => column.length === names));
    check("names cover exactly the sites outside core", names === index.count - index.coreCount);
  }
  onDisk = { core: count, cells: cellFiles.length, names };
}

// Crowded curated pins on the terrain map: the best known stand, their close neighbours stand back.
const crowd = [{ screenX: 100, screenY: 100 }, { screenX: 110, screenY: 105 }, { screenX: 135, screenY: 100 }, { screenX: 400, screenY: 300 }];
const standing = prominentPoints(crowd, 30);
check("a pin close to a better-known one stands back", standing.length === 3 && [crowd[0], crowd[2], crowd[3]].every((pin, place) => standing[place] === pin));
check("with no separation every pin stands", prominentPoints(crowd, 0).length === crowd.length);
check("pins separate fully at the overview and not at all close up", pinSeparationPx(0, 30, 0.4) === 30
  && pinSeparationPx(0.2, 30, 0.4) === 15 && pinSeparationPx(0.4, 30, 0.4) === 0 && pinSeparationPx(1, 30, 0.4) === 0);

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, onDisk }));
