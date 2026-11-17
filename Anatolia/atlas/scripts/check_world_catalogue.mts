// The world catalogue as the globe reads it: key functions agree with the files on disk,
// core rows are placeable, and the filter, cell choice, picking grid and label layout behave.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isOnNearSide } from "../lib/globe/visibleSites.ts";
import { placeLabels } from "../lib/globe/labelLayout.ts";
import { buildSiteGrid, countShownByBucket, nearestSite } from "../lib/globe/siteGrid.ts";
import { cellKeyFor, detailBucket, type SiteColumns, type WorldIndex } from "../lib/world/catalogueTypes.ts";
import { CELL_ALTITUDE_LIMIT, SiteCellCache, cellKeysInView } from "../lib/world/cellLoader.ts";
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
  check("a detail bucket holds the ids that hash to it", sample in readJson<Record<string, unknown>>(`detail/${detailBucket(sample)}.json`));
  onDisk = { core: count, cells: cellFiles.length };
}

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, onDisk }));
