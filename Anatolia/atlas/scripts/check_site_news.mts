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

const { NEWS_ITEMS, NEWS_STATUSES, NEWS_STATUS_LABEL, isIsoDate, formatNewsDate, newsForSite } = news;

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
check("the Sefer Tepe record plotted on Göbekli Tepe is not given that exhibition", newsForSite("Q134611641").every((item) => item.id !== "tas-tepeler-ankara-exhibition-2026"));
check("Pleiades 961911, a different place, gets no reports", newsForSite("961911").length === 0);
check("Çemka Höyük carries the Antiquity report under its catalogue id", newsForSite("Q132182967").some((item) => item.sourceName === "Antiquity" && item.date === "2026-06-15"));
check("a site with no reports gets none", newsForSite("hattusa").length === 0 && newsForSite("no-such-site").length === 0);

const section = readFileSync(new URL("../components/SiteNews.tsx", import.meta.url), "utf8");
check("a site with no items draws nothing", section.includes("if (items.length === 0) return null"));
check("the source is a link, and the status is text on the item", section.includes("<SafeLink") && section.includes("data-status"));
check("the section is named by its heading", section.includes("aria-labelledby={headingId}") && section.includes("id={headingId}") && !section.includes("aria-label="));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, items: NEWS_ITEMS.length }));
