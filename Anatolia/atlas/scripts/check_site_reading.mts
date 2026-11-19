import { readFileSync } from "node:fs";
import { register } from "node:module";
import { safeExternalHref } from "../lib/externalHref.ts";
import { resourceUrl } from "../lib/placeResources.ts";

// The reading files import each other without an extension; teach Node to add it.
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);
const { READING_KIND_LABEL, SITE_READING_LISTS, readingListForSite, readingRowsForSite } = await import("../lib/reading/readingLists.ts");
const { FOLLOW_KIND_LABEL, FOLLOW_LINKS, WHOLE_ATLAS, followLinksForSite, followRowsForAtlas, followRowsForSite } = await import("../lib/reading/followLinks.ts");

let failed = 0;
function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

function readJson(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}
const curatedIds = new Set<string>(readJson("../public/sites.geojson").features.map((site: { id: string }) => site.id));
const catalogueIds = new Set<string>([...readJson("../public/world/core.json").id, ...readJson("../public/world/names.json").id]);
/** Well-formed, and a site the atlas really holds: curated ids in sites.geojson, the rest in the world catalogue. */
const knownSite = (id: string) => resourceUrl(id) !== null && (curatedIds.has(id) || catalogueIds.has(id));
/** An address SafeLink would render unchanged. */
const linkable = (url: string) => url.startsWith("https://") && safeExternalHref(url) === url;
const filled = (...values: string[]) => values.every((value) => value.trim().length > 0);

const listedIds = SITE_READING_LISTS.flatMap((list) => list.siteIds);
check("no site id sits in two reading lists", new Set(listedIds).size === listedIds.length);
for (const list of SITE_READING_LISTS) {
  check(`${list.site}: every id is a site the atlas holds`, list.siteIds.length > 0 && list.siteIds.every(knownSite));
  check(`${list.site}: the list is found under each of its ids`, list.siteIds.every((id) => readingListForSite(id) === list.entries));
  check(`${list.site}: no work is listed twice`, new Set(list.entries.map((work) => work.title)).size === list.entries.length);
  for (const work of list.entries) {
    check(`${list.site}: "${work.title}" has a full citation and a note`, filled(work.authors, work.title, work.publishedIn, work.note) && work.year > 1700 && work.year < 2100);
    check(`${list.site}: "${work.title}" has a known kind`, work.kind in READING_KIND_LABEL);
    check(`${list.site}: "${work.title}" links only to an allowlisted https address`, work.url === undefined || linkable(work.url));
  }
}

check("Göbekli Tepe is found under its curated id and its catalogue id",
  readingListForSite("gobekli-tepe").length > 0 && readingListForSite("gobekli-tepe") === readingListForSite("Q214944"));
const gobekliKinds = new Set(readingListForSite("gobekli-tepe").map((work) => work.kind));
check("Göbekli Tepe lists all three kinds", gobekliKinds.size === 3);
check("Giza has a list under its catalogue id", readingListForSite("Q12508").some((work) => work.authors.includes("Petrie")));
check("a site with no list gets an empty one", readingListForSite("hattusa").length === 0 && readingRowsForSite("../x").length === 0);
check("a row leads its credit with the kind", readingRowsForSite("karahan-tepe").every((row) => Object.values(READING_KIND_LABEL).some((label) => row.credit.startsWith(`${label} · `))));

for (const link of FOLLOW_LINKS) {
  check(`follow "${link.name}" has a name, a description and a topic`, filled(link.name, link.what, link.topic));
  check(`follow "${link.name}" has a known kind`, link.kind in FOLLOW_KIND_LABEL);
  check(`follow "${link.name}" is an allowlisted https address`, linkable(link.url));
  check(`follow "${link.name}" names sites the atlas holds, or the whole atlas`, link.sites === WHOLE_ATLAS || (link.sites.length > 0 && link.sites.every(knownSite)));
}
check("no follow address is listed twice", new Set(FOLLOW_LINKS.map((link) => link.url)).size === FOLLOW_LINKS.length);
check("Göbekli Tepe's follow links are found under either id",
  followLinksForSite("gobekli-tepe").length > 0 && followLinksForSite("gobekli-tepe").length === followLinksForSite("Q214944").length);
check("a whole-atlas link is not repeated on a site", FOLLOW_LINKS.some((link) => link.sites === WHOLE_ATLAS) && followLinksForSite(WHOLE_ATLAS).length === 0);
check("the whole-atlas list holds every link", followRowsForAtlas().length === FOLLOW_LINKS.length);
check("a site with no links gets none", followRowsForSite("hattusa").length === 0);

const sections = readFileSync(new URL("../components/SiteReading.tsx", import.meta.url), "utf8");
check("the sections draw through the shared reading list, with no anchor of their own", sections.includes("<ReadingList") && !sections.includes("<a "));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, lists: SITE_READING_LISTS.length, follow: FOLLOW_LINKS.length }));
