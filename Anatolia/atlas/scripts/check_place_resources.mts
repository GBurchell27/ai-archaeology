import { readFileSync } from "node:fs";
import { safeExternalHref } from "../lib/externalHref.ts";
import { closeupHref, osmHref, resourceBucket, resourceUrl } from "../lib/placeResources.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

check("Miletus and Göbekli use different shards", resourceBucket("Q169460") === "Q16" && resourceBucket("gobekli-tepe") === "go");
check("Hattusa shard", resourceBucket("hattusa") === "ha" && resourceUrl("hattusa") === "/resources/ha.json");
check("a malformed id cannot build a resource path", resourceUrl("../etc/passwd") === null && resourceUrl("Q1/../../x") === null && resourceUrl("javascript:alert(1)") === null);
check("userinfo is stripped from an allowlisted url", safeExternalHref("https://user:pass@pleiades.stoa.org/places/599799") === "https://pleiades.stoa.org/places/599799");

const miletus = JSON.parse(readFileSync(new URL("../public/resources/Q16.json", import.meta.url), "utf8")).Q169460;
const gobekli = JSON.parse(readFileSync(new URL("../public/resources/go.json", import.meta.url), "utf8"))["gobekli-tepe"];
check("Miletus names include Miletos", miletus.names.includes("Miletos"));
check("Miletus links Pleiades", miletus.pleiadesUrl === "https://pleiades.stoa.org/places/599799");
check("Miletus links English and Turkish Wikipedia", miletus.wikipedia.some((item) => item.lang === "en" && item.url.includes("/wiki/Miletus")) && miletus.wikipedia.some((item) => item.lang === "tr" && item.url.includes("/wiki/Milet")));
check("Miletus links a Commons category", miletus.commons === "https://commons.wikimedia.org/wiki/Category:Miletus");
check("Göbekli links Pleiades, UNESCO, and Klaus Schmidt",
  gobekli.pleiadesUrl === "https://pleiades.stoa.org/places/245438984"
  && gobekli.heritage.some((item) => item.url === "https://whc.unesco.org/en/list/1572")
  && gobekli.directors.some((item) => item.name === "Klaus Schmidt" && item.url === "https://www.wikidata.org/wiki/Q88419"));
check("Göbekli links both Wikipedias", gobekli.wikipedia.some((item) => item.lang === "en") && gobekli.wikipedia.some((item) => item.lang === "tr"));

check("an unknown host is not a link", safeExternalHref("https://evil.example/place") === null);
check("plain http is not a link", safeExternalHref("http://www.muze.gov.tr/miletus-en") === null);
check("Miletus keeps the verified https museum site", safeExternalHref(miletus.website) === "https://www.muze.gov.tr/miletus-en");
check("the ministry museum site is a link", safeExternalHref(gobekli.website) === gobekli.website);
check("OpenStreetMap is a link", safeExternalHref(osmHref(27.28, 37.53))?.startsWith("https://www.openstreetmap.org/#map=15/") === true);
check("the close-up route stays on this site", closeupHref("Q169460") === "/api/closeup?id=Q169460&part=hillshade" && closeupHref("gobekli-tepe") === "/api/closeup?id=gobekli-tepe&part=hillshade");

const panel = readFileSync(new URL("../components/PlaceResources.tsx", import.meta.url), "utf8");
check("resource links go through SafeLink", panel.includes("<SafeLink") && !panel.includes("<img"));
check("the panel does not hotlink an image", !panel.includes("<img"));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
