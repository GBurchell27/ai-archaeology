// Share slugs: unique, stable, and free of coordinates. Run from Anatolia/atlas.

import { readFile } from "node:fs/promises";
import { register } from "node:module";

// The share modules import each other without an extension; teach Node to add it.
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);

const { catalogueIdFromPath, keepsPrettyShareAddress, siteSharePath, viewSharePath } = await import("../lib/share/shareAddress.ts");
const { shareChannel } = await import("../lib/share/shareChannel.ts");
const { shareDescription, shareLine, shareTitle } = await import("../lib/share/shareCopy.ts");
const { canonicalCatalogueId, catalogueIdFromSlug, shareSlug, slugifySiteName } = await import("../lib/share/siteSlug.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const COORDINATE = /-?\d{1,3}\.\d{4,}/;

const PINNED: [string, string, string][] = [
  ["Q214944", "Göbekli Tepe", "gobekli-tepe--q214944"],
  ["Q39671", "Stonehenge", "stonehenge--q39671"],
  ["Q12508", "Giza pyramid complex", "giza-pyramid-complex--q12508"],
  ["Q2060780", "America's Stonehenge", "america-s-stonehenge--q2060780"],
];

for (const [id, name, slug] of PINNED) {
  check(`${name} keeps its slug`, shareSlug(id, name) === slug && shareSlug(id, name) === shareSlug(id, name));
  check(`${name} round-trips`, catalogueIdFromSlug(slug) === id && siteSharePath(id, name) === `/site/${slug}`);
}

check("a Turkish capital folds", slugifySiteName("İstanbul") === "istanbul");
check("the same name and two ids never share a slug", shareSlug("Q1", "Tumulus") === "tumulus--q1" && shareSlug("Q2", "Tumulus") === "tumulus--q2");
check("a nameless record still has its id", shareSlug("Q214944", "…") === "q214944");
check("an OpenStreetMap id stays intact", shareSlug("osm-n42", "Menhir") === "menhir--osm-n42" && catalogueIdFromSlug("menhir--osm-n42") === "osm-n42");
check("a bare id is accepted and a Wikidata Q is restored", catalogueIdFromSlug("q214944") === "Q214944" && canonicalCatalogueId("Q214944") === "Q214944");
check("a wrong name still yields the id, so the page can redirect", catalogueIdFromSlug("not-the-name--q214944") === "Q214944");
check("a coordinate is not an id", catalogueIdFromSlug("38.12--30.45") === null && catalogueIdFromSlug("../q214944") === null);
check("a slug has no decimal point", PINNED.every(([, , slug]) => !slug.includes(".")));

const why = "Carved T-shaped limestone pillars in large round enclosures, raised by communities who had not yet adopted farming.";
const description = shareDescription({ why, kind: "monumental enclosure" });
check("the preview uses the published why and no coordinates", description === why && !COORDINATE.test(description));
check("a record without a why stays a published record", shareDescription({ kind: "megalith" }).startsWith("A published megalith"));
check("the line prefers period and country", shareLine({ period: "Pre-Pottery Neolithic", country: "Turkey", kind: "monumental enclosure" }) === "Pre-Pottery Neolithic · Turkey");
check("the title names the site", shareTitle("Göbekli Tepe") === "Göbekli Tepe · Atlas of early monuments");

const sharePath = "/site/gobekli-tepe--q214944";
check("the globe keeps the pretty path while that card is open",
  keepsPrettyShareAddress(sharePath, "?view=globe&lon=38.92&lat=37.22&alt=120&site=Q214944", "Q214944"));
check("closing the card or leaving the globe drops the pretty path",
  !keepsPrettyShareAddress(sharePath, "?view=globe&lon=38.92&lat=37.22&alt=120", "Q214944")
  && !keepsPrettyShareAddress(sharePath, "?view=atlas&site=gobekli-tepe", "Q214944"));
check("a view share of a site path drops the query", viewSharePath(sharePath, "?lon=38.92&lat=37.22") === sharePath);
check("a view share of the globe keeps the existing address", viewSharePath("/", "?view=globe&site=Q214944") === "/?view=globe&site=Q214944");
check("a view share drops the recording-pattern layer",
  viewSharePath("/", "?view=globe&lon=38.00&lat=30.00&alt=13000&site=Q214944&model=any_all") === "/?view=globe&lon=38.00&lat=30.00&alt=13000&site=Q214944"
  && viewSharePath("/", "?model=funerary_mid-holocene") === "/");
check("a view share keeps a model value that is not a layer", viewSharePath("/", "?view=globe&model=nope") === "/?view=globe&model=nope");
check("the path parser reads the share id", catalogueIdFromPath(sharePath) === "Q214944" && catalogueIdFromPath("/") === null);

check("a desktop copies even when a share sheet exists", shareChannel({ nativeShare: true, coarsePointer: false, narrow: false }) === "copy");
check("a phone uses the share sheet", shareChannel({ nativeShare: true, coarsePointer: true, narrow: true }) === "native");
check("a phone without a share sheet copies", shareChannel({ nativeShare: false, coarsePointer: true, narrow: true }) === "copy");

interface NameBlock {
  id: string[];
  name: string[];
}

function rowsOf(block: NameBlock): { id: string; name: string }[] {
  return block.id.map((id, index) => ({ id, name: block.name[index] ?? "" }));
}

function checkMapping(rows: { id: string; name: string }[], label: string): void {
  const seen = new Map<string, string>();
  let collisions = 0;
  let broken = 0;
  const fromEnd = new Map<string, string>();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const slug = shareSlug(rows[index].id, rows[index].name);
    if (slug) fromEnd.set(rows[index].id, slug);
  }
  for (const row of rows) {
    const slug = shareSlug(row.id, row.name);
    const id = canonicalCatalogueId(row.id);
    if (!slug || slug !== fromEnd.get(row.id) || catalogueIdFromSlug(slug) !== id || COORDINATE.test(slug) || slug.includes(".")) broken += 1;
    else if (seen.has(slug)) collisions += 1;
    else seen.set(slug, row.id);
  }
  check(`${label}: every slug is unique (${collisions} collisions)`, collisions === 0);
  check(`${label}: slugs are stable, round-trip, and carry no coordinates (${broken} bad)`, broken === 0);
}

const featured = JSON.parse(await readFile("public/world/featured.json", "utf8")) as { id: string; name: string }[];
const core = JSON.parse(await readFile("public/world/core.json", "utf8")) as NameBlock;
checkMapping(featured.map((site) => ({ id: site.id, name: site.name })), "featured");
checkMapping(rowsOf(core), "core");

const pinnedIds = new Map(PINNED.map(([id, name]) => [id, name]));
for (const site of featured) {
  const expected = pinnedIds.get(site.id);
  if (expected) check(`featured name of ${site.id} is still the pinned one`, site.name === expected);
}

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
