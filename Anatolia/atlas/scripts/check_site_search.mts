// Site search ranking and diacritic folding, on a synthetic catalogue.
import { register } from "node:module";

// The library files import each other through the "@/" alias; teach Node where that points.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    return next(specifier.startsWith("@/") ? root + specifier.slice(2) + ".ts" : specifier, context);
  }
`)}`);

const { emptySearchIndex, foldNextNames, searchSites } = await import("../lib/world/siteSearch.ts");

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
