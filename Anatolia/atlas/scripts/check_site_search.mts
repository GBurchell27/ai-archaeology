// Site search ranking and diacritic folding, on a synthetic catalogue.
import { register } from "node:module";

// The library files import each other through the "@/" alias; teach Node where that points.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    return next(specifier.startsWith("@/") ? root + specifier.slice(2) + ".ts" : specifier, context);
  }
`)}`);

const { emptySearchIndex, foldNextNames, searchSiteIndexes, searchSites } = await import("../lib/world/siteSearch.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

// name, importance, featured
const SITES: [string, number, number][] = [
  ["Stonehenge", 143, 1],
  ["Stone of Scone", 300, 0],
  ["Stones of Stenness", 40, 0],
  ["Standing Stones of Callanish", 500, 0],
  ["Blackstone Edge", 900, 0],
  ["Göbekli Tepe", 120, 1],
  ["Çatalhöyük", 110, 1],
  ["Ġgantija", 60, 1],
  ["Kızılkoyun", 5, 0],
  ["Carnac stones", 80, 1],
  ...Array.from({ length: 20 }, (_, n): [string, number, number] => [`Stonefield ${n}`, n, 0]),
];
const columns = {
  name: SITES.map((site) => site[0]),
  importance: SITES.map((site) => site[1]),
  featured: SITES.map((site) => site[2]),
};
const index = emptySearchIndex(columns);
function emptyThenFolded(names: string[]) {
  const folded = emptySearchIndex({ name: names });
  foldNextNames(folded, names.length);
  return folded;
}
const names = (query: string, limit?: number) => searchSites(index, query, limit).map((row) => columns.name[row]);

check("nothing is searchable before the names are folded", names("stone").length === 0);
check("folding reports when it is not finished", foldNextNames(index, 4) === false && index.foldedRows === 4);
check("a partly folded index searches the folded rows", names("stone").join() === "Stonehenge,Stone of Scone,Stones of Stenness,Standing Stones of Callanish");
check("folding finishes", foldNextNames(index, 1000) === true && index.foldedRows === SITES.length);

const stone = names("stone");
check("results are capped at eight", stone.length === 8);
check("a featured prefix match comes first", stone[0] === "Stonehenge");
check("prefix matches then run by importance", stone[1] === "Stone of Scone" && stone[2] === "Stones of Stenness");
check("every capped result is a name prefix", stone.every((name) => name.toLowerCase().startsWith("stone")));

const all = names("stone", 100);
const at = (name: string) => all.indexOf(name);
check("a later-word match follows every name prefix", at("Carnac stones") > at("Stonefield 0") && at("Standing Stones of Callanish") > at("Stonefield 0"));
check("among later-word matches the featured one leads", at("Carnac stones") < at("Standing Stones of Callanish"));
check("a match inside a word comes last, whatever its importance", at("Blackstone Edge") === all.length - 1);

check("o matches ö", names("gobekli")[0] === "Göbekli Tepe");
check("typing the diacritics also works", names("Göbekli")[0] === "Göbekli Tepe");
check("c and o and u match ç, ö and ü", names("catalhoyuk")[0] === "Çatalhöyük");
check("g matches ġ", names("ggantija")[0] === "Ġgantija");
check("dotless ı matches i", names("kizilkoyun")[0] === "Kızılkoyun");
check("case and outer spaces are ignored", names("  STONEHENGE ")[0] === "Stonehenge");
check("a second word is found", names("tepe")[0] === "Göbekli Tepe");
check("one letter is too short", names("s").length === 0);
check("no match gives nothing", names("zzzz").length === 0);
check("an empty or blank query gives nothing", names("").length === 0 && names("   ").length === 0 && names(" s ").length === 0);
check("regex characters are plain text", [".*", "(", "[stone", "st.ne", "stone$", "\\", "s+"].every((query) => names(query).length === 0));
check("a regex character inside a real name still matches literally", searchSites(emptyThenFolded(["Tell (el-)Amarna"]), "(el-)am").length === 1);
const started = performance.now();
check("a very long query gives nothing, quickly", names("stone".repeat(20_000)).length === 0 && performance.now() - started < 500);
check("a zero or negative limit gives nothing", names("stone", 0).length === 0);

// The names file: every site outside core, best known first, with no importance or featured columns.
const rest = emptySearchIndex({ name: ["Stone Row of Nowhere", "Stonehaven cairn", "Old Blackstone", "Newgrange North", "Stonehenge Cursus"] });
const restNames = (rest.columns as { name: string[] }).name;
const both = (query: string, limit?: number) => searchSiteIndexes([index, rest], query, limit)
  .map((hit) => (hit.index === 0 ? columns.name[hit.row] : `+${restNames[hit.row]}`));
check("an unfolded names index adds nothing", both("stone").join() === names("stone").join());
foldNextNames(rest, 1000);
check("a name only the names file has is found", both("newgrange")[0] === "+Newgrange North");
const merged = both("stone", 100);
const lastCorePrefix = merged.indexOf("Stonefield 0");
check("core prefix matches come before names-file prefix matches", merged.indexOf("+Stone Row of Nowhere") > lastCorePrefix && merged.indexOf("+Stone Row of Nowhere") < merged.indexOf("Carnac stones"));
check("the names file keeps its best-known-first order among equal lengths apart", merged.indexOf("+Stonehaven cairn") < merged.indexOf("+Old Blackstone"));
check("a names-file prefix match beats a core match inside a word", merged.indexOf("+Stonehenge Cursus") < merged.indexOf("Blackstone Edge"));
check("the merged list is capped", both("stone").length === 8);

// Which curated Anatolia sites are best known, read from the catalogue.
const { curatedRenown } = await import("../lib/atlas/curatedRenown.ts");
const curated = [
  { id: "antioch", names: ["Antioch", "Antakya"], longitude: 36.2, latitude: 36.2 },
  { id: "sayburc", names: ["Sayburç"], longitude: 38.6, latitude: 37.1 },
  { id: "ephesus", names: ["Ephesus"], longitude: 27.3, latitude: 37.9 },
  { id: "ravendel", names: ["Ravendel"], longitude: 37.2, latitude: 36.8 },
  { id: "tarsus", names: ["Tarsus"], longitude: 34.9, latitude: 36.9 },
  { id: "goreme", names: ["Göreme", "Cappadocia"], longitude: 34.8, latitude: 38.6 },
  { id: "harran", names: ["Harran"], longitude: 39, latitude: 36.9 },
];
const renown = curatedRenown(curated, {
  core: {
    name: ["Antioch", "Antioch", "EPHESUS", "Sayburc", "Tarsus?/Antiochia ad Cydnum", "Göreme National Park", "Harran", "Harran University", "New Ravendel"],
    lon: [31.2, 36.1, 27.4, 38.5, 34.9, 34.9, 39, 39, 37.2],
    lat: [38.3, 36.3, 38, 37.2, 36.9, 38.7, 36.9, 36.9, 36.8],
    importance: [90, 80, 97, 4, 7, 37, 4, 60, 50],
  },
  featured: [{ name: "Sayburç", lon: 38.6, lat: 37.1 }],
});
check("a namesake far away lends no renown", renown.get("antioch") === 80);
check("names match without case or diacritics", renown.get("ephesus") === 97);
check("a featured monument outranks any sitelink count", renown.get("sayburc")! > renown.get("ephesus")! && renown.get("sayburc")! % 100 === 4);
check("a site the catalogue does not know scores nothing", renown.get("ravendel") === 0);
check("one of several names in a catalogue title is enough", renown.get("tarsus") === 7);
check("a longer catalogue name that begins with the site's name counts when nothing matches exactly", renown.get("goreme") === 37);
check("an exact match is not outbid by a longer name", renown.get("harran") === 4);

// Which curated site a catalogue record stands for: what "Open in Anatolia atlas" on a globe card selects.
const { curatedSiteForRecord } = await import("../lib/atlas/curatedMatch.ts");
const standsFor = (name: string, lon: number, lat: number) => curatedSiteForRecord(curated, { name, lon, lat });
check("a catalogue record selects the curated site that shares its name close by", standsFor("EPHESUS", 27.4, 38) === "ephesus");
check("a namesake far away selects nothing", standsFor("Antioch", 31.2, 38.3) === null);
check("one of several names in a catalogue title is enough to select", standsFor("Tarsus?/Antiochia ad Cydnum", 34.9, 36.9) === "tarsus");
check("a longer catalogue name selects the site it begins with", standsFor("Göreme National Park", 34.9, 38.7) === "goreme");
check("a record no curated site matches selects nothing", standsFor("Miletus", 27.3, 37.5) === null);
const twins = [
  { id: "far-twin", names: ["Twin"], longitude: 30.2, latitude: 40 },
  { id: "near-twin", names: ["Twin"], longitude: 30.05, latitude: 40 },
  { id: "twin-fort", names: ["Twin Fort"], longitude: 30, latitude: 40 },
];
check("of several namesakes close by, the nearest is selected", curatedSiteForRecord(twins, { name: "Twin", lon: 30, lat: 40 }) === "near-twin");
check("a shared name is preferred to a longer name that begins with it", curatedSiteForRecord(twins, { name: "Twin Fort", lon: 30.2, lat: 40 }) === "twin-fort");

// The addresses a found site's card links to.
const { commonsFilePage, commonsThumbnail, osmElementPage } = await import("../lib/world/siteMedia.ts");
const picture = "https://commons.wikimedia.org/wiki/Special:FilePath/Stonehenge%202007.jpg";
check("a Commons picture is asked for at a limited width", commonsThumbnail(picture, 640) === `${picture}?width=640`);
check("a Commons picture links to its file page", commonsFilePage(picture) === "https://commons.wikimedia.org/wiki/File:Stonehenge%202007.jpg");
check("a picture from anywhere else is not shown", commonsThumbnail("https://example.org/wiki/Special:FilePath/a.jpg", 640) === null && commonsThumbnail(null, 640) === null);
check("an OSM node id links to its element", osmElementPage("osm-n123") === "https://www.openstreetmap.org/node/123");
check("an OSM way id links to its element", osmElementPage("osm-w45") === "https://www.openstreetmap.org/way/45");
check("other ids have no OSM page", osmElementPage("Q39671") === null);

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
