import { readFileSync } from "node:fs";
import { register } from "node:module";
import { safeExternalHref } from "../lib/externalHref.ts";

register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);

const news = await import("../lib/news/siteNews.ts");

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
const siteIdPattern = /^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const knownSite = (id: string) => siteIdPattern.test(id) && (curatedIds.has(id) || catalogueIds.has(id));
const httpsUrl = /^https:\/\/[^\s]+$/;
const filled = (value: string) => value.trim().length > 0;
const oneLine = (value: string) => filled(value) && !value.includes("\n");

const recent = await import("../lib/news/recentNews.ts");
const { NEWS_ITEMS, NEWS_STATUSES, NEWS_STATUS_LABEL, isIsoDate, formatNewsDate, newsForSite } = news;
const {
  NEWS_RECENCY_DAYS, NEWS_PINS_START_ON, calendarDaysBetween, isWithinLastDays, isCatalogueSiteId, localIsoDay, newsPinCaption, recentNewsSites,
} = recent;

check("the list is not empty", NEWS_ITEMS.length > 0);
check("item ids are unique", new Set(NEWS_ITEMS.map((item) => item.id)).size === NEWS_ITEMS.length);

for (const item of NEWS_ITEMS) {
  const label = item.id || "(item without an id)";
  check(`${label}: id, title, summary and source name are filled`, filled(item.id) && oneLine(item.title) && oneLine(item.summary) && filled(item.sourceName));
  check(`${label}: the date is a real ISO day`, isIsoDate(item.date));
  check(`${label}: the status is one this panel can label`, (NEWS_STATUSES as readonly string[]).includes(item.status) && filled(NEWS_STATUS_LABEL[item.status]));
  check(`${label}: the source is an https address the panel will link`, httpsUrl.test(item.sourceUrl) && safeExternalHref(item.sourceUrl) === item.sourceUrl);
  check(`${label}: it names at least one site, each an id the atlas holds`, item.siteIds.length > 0 && item.siteIds.every(knownSite));
  check(`${label}: no site id is repeated on it`, new Set(item.siteIds).size === item.siteIds.length);
}

check("a date that is not a calendar day is refused", !isIsoDate("2026-02-31") && !isIsoDate("2026-11") && !isIsoDate("19 Nov 2026"));
check("an ISO day is printed as a day, month and year", formatNewsDate("2026-11-19") === "19 Nov 2026");

const gobekli = newsForSite("gobekli-tepe");
check("Göbekli Tepe's reports are newest first", gobekli.map((item) => item.date).join(",") === "2026-11-19,2026-08-13");
check("Göbekli Tepe's reports are the same under its catalogue id", newsForSite("Q214944").map((item) => item.id).join(",") === gobekli.map((item) => item.id).join(","));
check("the Ankara exhibition is on all four sites", ["gobekli-tepe", "karahan-tepe", "sayburc", "Q118133735"].every((id) => newsForSite(id).some((item) => item.id === "tas-tepeler-ankara-exhibition-2026")));
check("Pleiades 961911, a different place, gets no reports", newsForSite("961911").length === 0);
check("the Sefer Tepe record plotted on Göbekli Tepe gets no reports", newsForSite("Q134611641").length === 0);
check("no report is filed under either of those ids", NEWS_ITEMS.every((item) => !item.siteIds.includes("961911") && !item.siteIds.includes("Q134611641")));
check("Çemka Höyük carries the Antiquity report under its catalogue id", newsForSite("Q132182967").some((item) => item.sourceName === "Antiquity" && item.date === "2026-06-15"));
check("a site with no reports gets none", newsForSite("hattusa").length === 0 && newsForSite("no-such-site").length === 0);

const section = readFileSync(new URL("../components/SiteNews.tsx", import.meta.url), "utf8");
check("a site with no items draws nothing", section.includes("if (items.length === 0) return null"));
check("the source is a link, and the status is text on the item", section.includes("<SafeLink") && section.includes("data-status"));
check("the section is named by its heading", section.includes("aria-labelledby={headingId}") && section.includes("id={headingId}") && !section.includes("aria-label="));

checkRecency(catalogueIds);

/** The globe marks a catalogue site only while its newest report is inside the window. */
function checkRecency(publishedIds: ReadonlySet<string>): void {
  const asOf = "2026-11-23";
  check("the window is 90 days and the rings start on", NEWS_RECENCY_DAYS === 90 && NEWS_PINS_START_ON === true);
  check("ninety days before 23 Nov 2026 is 25 Aug", calendarDaysBetween("2026-08-25", asOf) === 90);
  check("the boundary day is kept and the day before it is not", isWithinLastDays("2026-08-25", asOf, 90) && !isWithinLastDays("2026-08-24", asOf, 90));
  check("a later day is outside the window", !isWithinLastDays("2026-11-24", asOf, 90));
  check("a local calendar day keeps its year, month and day", localIsoDay(new Date(2026, 10, 23)) === "2026-11-23");
  checkWindow(publishedIds, asOf);
  checkPublishedGate(asOf);
  checkRecencyWording();
}

function checkWindow(publishedIds: ReadonlySet<string>, asOf: string): void {
  const pins = recentNewsSites(NEWS_ITEMS, asOf, publishedIds);
  const ids = pins.map((pin) => pin.siteId).join(",");
  check("the last 90 days mark the four catalogue sites of the November report", ids === "Q115679382,Q118133735,Q214944,Q5996986");
  check("each of those pins carries the November report", pins.every((pin) => pin.item.id === "tas-tepeler-ankara-exhibition-2026"));
  check("curated ids are not pins", ["gobekli-tepe", "karahan-tepe", "sayburc"].every((id) => !ids.includes(id)));
  check("Çemka Höyük's June report is outside 90 days", !ids.includes("Q132182967"));
  check("a different place and the misplaced Sefer Tepe record are not pins", !ids.split(",").includes("961911") && !ids.split(",").includes("Q134611641"));
  const wider = recentNewsSites(NEWS_ITEMS, asOf, publishedIds, 200);
  const cemka = wider.find((pin) => pin.siteId === "Q132182967");
  const gobekli = wider.find((pin) => pin.siteId === "Q214944");
  check("a wider window adds Çemka Höyük and keeps Göbekli Tepe on the newer report", cemka?.item.id === "cemka-hoyuk-fired-clay-2026" && gobekli?.item.id === "tas-tepeler-ankara-exhibition-2026");
  check("the older report sorts last", wider.at(-1)?.siteId === "Q132182967");
  const august = recentNewsSites(NEWS_ITEMS, "2026-08-20", publishedIds, 30);
  check("before the November report, only Göbekli Tepe is marked, on the August report", august.map((pin) => `${pin.siteId}:${pin.item.id}`).join(",") === "Q214944:gobekli-tepe-rectangular-buildings-2026");
  check("an empty catalogue marks nothing", recentNewsSites(NEWS_ITEMS, asOf, new Set()).length === 0);
}

function checkPublishedGate(asOf: string): void {
  const stuffed = new Set(["gobekli-tepe", "osm-1", "candidate-hidden", "Q214944"]);
  const stray = recentNewsSites([report("stray", asOf, ["gobekli-tepe", "osm-1", "candidate-hidden", "Q214944"])], asOf, stuffed);
  check("a curated id, an OpenStreetMap id and any other id stay unmarked even if a set names them", stray.map((pin) => pin.siteId).join(",") === "Q214944");
  check("catalogue ids are Wikidata items and Pleiades numbers", isCatalogueSiteId("Q214944") && isCatalogueSiteId("961911"));
  check("a curated slug, an OpenStreetMap id and any other id are refused", !isCatalogueSiteId("gobekli-tepe") && !isCatalogueSiteId("osm-1") && !isCatalogueSiteId("candidate-hidden"));
}

function checkRecencyWording(): void {
  const exhibition = NEWS_ITEMS.find((item) => item.id === "tas-tepeler-ankara-exhibition-2026");
  check("the list line names the source and quotes the headline", exhibition !== undefined && newsPinCaption(exhibition) === "GAP Gündemi: “Taş Tepeler finds on show in Ankara”");
  check("a disputed report is labelled before the quotation", exhibition !== undefined && newsPinCaption({ ...exhibition, status: "disputed" }) === "Disputed. GAP Gündemi: “Taş Tepeler finds on show in Ankara”");
  const ui = ["../lib/news/recentNews.ts", "../components/globe/chrome/NewsPinList.tsx", "../components/globe/GlobeNewsRings.tsx", "../components/globe/chrome/GlobeSettingsPanel.tsx"]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
  check("the atlas's own wording does not call a report a discovery", !/discovery/i.test(ui));
  const rings = readFileSync(new URL("../components/globe/chrome/NewsRingOverlay.module.css", import.meta.url), "utf8");
  const explorer = readFileSync(new URL("../components/globe/useGlobeExplorer.ts", import.meta.url), "utf8");
  check("reduced motion leaves the news ring still", rings.includes("prefers-reduced-motion") && rings.includes(".newsRing::after") && rings.includes("animation: none"));
  check("the rings start from the shared switch", explorer.includes("useState(NEWS_PINS_START_ON)"));
}

function report(id: string, date: string, siteIds: string[]) {
  return {
    id, date, siteIds, title: "A reported note", summary: "A source reports a note.",
    sourceName: "A paper", sourceUrl: "https://www.cambridge.org/core/example", status: "reported" as const,
  };
}

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, items: NEWS_ITEMS.length }));
