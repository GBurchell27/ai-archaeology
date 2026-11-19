// "Follow this site": pages and feeds to keep up with a site's fieldwork. Links only, no API. Pure data.
import type { Reading } from "../placeLearning";
import { CATALHOYUK_IDS, GIZA_IDS, GOBEKLI_TEPE_IDS, KARAHAN_TEPE_IDS, TAS_TEPELER_IDS } from "./siteIds";

export type FollowKind = "project-page" | "feed" | "account";

export const FOLLOW_KIND_LABEL: Record<FollowKind, string> = {
  "project-page": "Project page",
  feed: "News feed",
  account: "Account",
};

/** For a link that belongs to the atlas as a whole and to no one site. */
export const WHOLE_ATLAS = "atlas";

export interface FollowLink {
  name: string;
  /** One level line on what it is and who runs it. */
  what: string;
  kind: FollowKind;
  /** https, on the allowlist in `lib/externalHref.ts`. */
  url: string;
  /** The site or topic it belongs to, as shown in the whole-atlas list. */
  topic: string;
  /** Every id of each site it belongs to, or `WHOLE_ATLAS`. */
  sites: readonly string[] | typeof WHOLE_ATLAS;
}

export const FOLLOW_LINKS: readonly FollowLink[] = [
  {
    name: "Göbekli Tepe: Fieldwork and Research",
    what: "The German Archaeological Institute's page for its fieldwork at the site.",
    kind: "project-page",
    url: "https://www.dainst.org/en/research/projects/goebekli-tepe/1934",
    topic: "Göbekli Tepe",
    sites: GOBEKLI_TEPE_IDS,
  },
  {
    name: "Taş Tepeler",
    what: "The site of the Şanlıurfa Neolithic Research Project, which covers the excavations in the region.",
    kind: "project-page",
    url: "https://tastepeler.org/en",
    topic: "Taş Tepeler sites",
    sites: TAS_TEPELER_IDS,
  },
  {
    name: "Taş Tepeler events and news",
    what: "The project's own announcements of talks, events and news.",
    kind: "feed",
    url: "https://tastepeler.org/en/events-news",
    topic: "Taş Tepeler sites",
    sites: TAS_TEPELER_IDS,
  },
  {
    name: "Karahantepe",
    what: "The Taş Tepeler project's page for the settlement.",
    kind: "project-page",
    url: "https://tastepeler.org/en/settlements/karahantepe",
    topic: "Karahan Tepe",
    sites: KARAHAN_TEPE_IDS,
  },
  {
    name: "Ancient Egypt Research Associates (AERA)",
    what: "The research organisation that excavates the settlement south of the Sphinx and runs field schools at Giza.",
    kind: "project-page",
    url: "https://aeraweb.org/",
    topic: "Giza",
    sites: GIZA_IDS,
  },
  {
    name: "AERA news",
    what: "News from AERA's fieldwork and publications.",
    kind: "feed",
    url: "https://aeraweb.org/aera-news/",
    topic: "Giza",
    sites: GIZA_IDS,
  },
  {
    name: "Çatalhöyük Research Project",
    what: "The project's site, with its research portal and archive reports.",
    kind: "project-page",
    url: "https://www.catalhoyuk.com/",
    topic: "Çatalhöyük",
    sites: CATALHOYUK_IDS,
  },
  {
    name: "Pleiades Project Blog",
    what: "News from the gazetteer of ancient places that supplies many of the atlas's records. It has an Atom feed.",
    kind: "feed",
    url: "https://pleiades.stoa.org/news/blog",
    topic: "Whole atlas",
    sites: WHOLE_ATLAS,
  },
  // Owner: add social accounts here once they are collected, with kind "account", the https address of the
  // account's page, and the site ids (or WHOLE_ATLAS) each belongs to. Add the host to lib/externalHref.ts.
];

/** The links that belong to one site, under any of its ids. Whole-atlas links are not repeated on every site. */
export function followLinksForSite(siteId: string): FollowLink[] {
  return FOLLOW_LINKS.filter((link) => link.sites !== WHOLE_ATLAS && link.sites.includes(siteId));
}

/** A site's links as rows for the shared reading-list markup. */
export function followRowsForSite(siteId: string): Reading[] {
  return followLinksForSite(siteId).map(({ name, what, kind, url }) => (
    { title: name, credit: FOLLOW_KIND_LABEL[kind], note: what, href: url }
  ));
}

/** Every link, each row saying which site or topic it belongs to. */
export function followRowsForAtlas(): Reading[] {
  return FOLLOW_LINKS.map(({ name, what, kind, url, topic }) => (
    { title: name, credit: `${FOLLOW_KIND_LABEL[kind]} · ${topic}`, note: what, href: url }
  ));
}
