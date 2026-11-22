// Dated reports about published sites. A report is not a change to the site's record.
// How to add one is in README.md beside this file.

import { KARAHAN_TEPE_IDS } from "../reading/siteIds";

export const NEWS_STATUSES = ["reported", "disputed", "rumour-denied"] as const;

export type NewsStatus = (typeof NEWS_STATUSES)[number];

/** The words the panel prints, so a disputed or denied claim is labelled in plain text. */
export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  reported: "Reported",
  disputed: "Disputed",
  "rumour-denied": "Rumour denied",
};

export interface NewsItem {
  /** Stable id. A new item gets a new one; the id is not a site. */
  id: string;
  /** The day the source gives, `YYYY-MM-DD`. */
  date: string;
  /** Curated ids from `public/sites.geojson` and world-catalogue ids for the same places. */
  siteIds: readonly string[];
  title: string;
  /** One line. What the source says, not a finding of this atlas. */
  summary: string;
  sourceName: string;
  /** https, and a host in `lib/externalHref.ts`, or the panel will not link it. */
  sourceUrl: string;
  status: NewsStatus;
}

/**
 * Göbekli Tepe in Turkey: the curated pin and the Wikidata item.
 * Pleiades 961911 is a different place (the Merv Oasis) and is not listed.
 * `GOBEKLI_TEPE_IDS` still includes it; that alias is left unchanged here.
 */
const GOBEKLI_TEPE_NEWS_IDS = ["gobekli-tepe", "Q214944"] as const;
/** Sayburç in the curated atlas and in the world catalogue. */
const SAYBURC_IDS = ["sayburc", "Q115679382"] as const;
/**
 * Sefer Tepe as the world catalogue holds it (English Wikipedia, Viranşehir).
 * Q134611641 is a different record plotted on Göbekli Tepe, so it is not listed here.
 */
const SEFER_TEPE_IDS = ["Q118133735"] as const;
/**
 * Çemka Höyük is already a published catalogue site (Wikidata Q132182967, Pleiades 973850903
 * on that same record). The Pleiades number is not a second pin.
 */
const CEMKA_HOYUK_IDS = ["Q132182967"] as const;

const EXHIBITION_SITES = [...GOBEKLI_TEPE_NEWS_IDS, ...KARAHAN_TEPE_IDS, ...SAYBURC_IDS, ...SEFER_TEPE_IDS] as const;

export const NEWS_ITEMS: readonly NewsItem[] = [
  {
    id: "tas-tepeler-ankara-exhibition-2026",
    // The linked report is dated 19 Nov 2026. It describes the exhibition, open until 23 Nov 2026.
    date: "2026-11-19",
    siteIds: EXHIBITION_SITES,
    title: "Taş Tepeler finds on show in Ankara",
    summary: "GAP Gündemi reports Pre-Pottery Neolithic finds from Göbeklitepe, Karahantepe, Sefertepe and Sayburç on show at the Presidential National Library until 23 Nov 2026.",
    sourceName: "GAP Gündemi",
    sourceUrl: "https://www.gapgundemi.com/haber/29188600/tas-tepelerin-tarihi-eserleri-ankarada-sergileniyor",
    status: "reported",
  },
  {
    id: "gobekli-tepe-rectangular-buildings-2026",
    // Anadolu Agency, 13 Aug 2026.
    date: "2026-08-13",
    siteIds: GOBEKLI_TEPE_NEWS_IDS,
    title: "Rectangular buildings reported at Göbekli Tepe",
    summary: "Anadolu Agency reports that new excavations at Göbekli Tepe uncovered rectangular-plan buildings of the settlement's second phase.",
    sourceName: "Anadolu Agency",
    sourceUrl: "https://www.aa.com.tr/tr/kultur/gobeklitepede-yeni-kazilarda-dortgen-planli-yapilar-ortaya-cikarildi/4026025",
    status: "reported",
  },
  {
    id: "cemka-hoyuk-fired-clay-2026",
    // Cambridge Core dates the online publication 15 June 2026.
    date: "2026-06-15",
    siteIds: CEMKA_HOYUK_IDS,
    title: "Early fired clay containers at Çemka Höyük",
    summary: "An Antiquity paper reports 46 low-fired clay fragments at Çemka Höyük, from a level dated to about 9350 BC, and reads them as an early attempt at fired containers.",
    sourceName: "Antiquity",
    sourceUrl: "https://www.cambridge.org/core/journals/antiquity/article/understanding-a-first-attempt-at-pottery-early-fired-containers-at-cemka-hoyuk/DC31696F51A0D6F1EB3A27DA201E9516",
    status: "reported",
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** A real calendar day written `YYYY-MM-DD`. */
export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** `2026-11-19` becomes `19 Nov 2026`. Anything else is returned unchanged. */
export function formatNewsDate(isoDate: string): string {
  if (!isIsoDate(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** This site's reports, newest first. Empty when it has none. */
export function newsForSite(siteId: string): readonly NewsItem[] {
  return NEWS_ITEMS
    .filter((item) => item.siteIds.includes(siteId))
    .slice()
    .sort(newestFirst);
}

function newestFirst(left: NewsItem, right: NewsItem): number {
  const byDate = right.date.localeCompare(left.date);
  return byDate !== 0 ? byDate : left.id.localeCompare(right.id);
}
