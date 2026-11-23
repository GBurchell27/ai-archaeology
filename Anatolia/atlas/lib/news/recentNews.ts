// Which reports are recent enough to mark on the globe. A mark is not a new site.

import { NEWS_STATUS_LABEL, isIsoDate, type NewsItem } from "./siteNews";

/** How many days back the globe's rings and the "In the news" list look. Change it here. */
export const NEWS_RECENCY_DAYS = 90;

/** The globe's rings start switched on. The legend and the settings panel share this. */
export const NEWS_PINS_START_ON = true;

const DAY_MS = 86_400_000;

export interface RecentNewsSite {
  siteId: string;
  /** The newest report in the window that names this site. */
  item: NewsItem;
}

/** The visitor's own calendar day, `YYYY-MM-DD`. */
export function localIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Whole calendar days from `earlier` to `later`. Negative when `later` is first.
 * Null when either string is not a real `YYYY-MM-DD` day.
 */
export function calendarDaysBetween(earlier: string, later: string): number | null {
  if (!isIsoDate(earlier) || !isIsoDate(later)) return null;
  const [fromYear, fromMonth, fromDay] = earlier.split("-").map(Number);
  const [toYear, toMonth, toDay] = later.split("-").map(Number);
  const span = Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay);
  return Math.round(span / DAY_MS);
}

/** True when `isoDate` is `asOf` or up to `withinDays` calendar days before it. A later day is not. */
export function isWithinLastDays(isoDate: string, asOf: string, withinDays: number): boolean {
  const age = calendarDaysBetween(isoDate, asOf);
  return age !== null && age >= 0 && age <= withinDays;
}

/**
 * A world-catalogue id: Wikidata `Q…` or a Pleiades number.
 * A curated slug and an OpenStreetMap id are not pins. A candidate is neither shape.
 */
export function isCatalogueSiteId(id: string): boolean {
  return /^Q\d+$/.test(id) || /^\d+$/.test(id);
}

/**
 * One row per published catalogue site that a report in the window names, newest report first.
 * `publishedIds` is the catalogue. An id outside it is left out, whatever the report says.
 */
export function recentNewsSites(
  items: readonly NewsItem[],
  asOf: string,
  publishedIds: ReadonlySet<string>,
  withinDays = NEWS_RECENCY_DAYS,
): RecentNewsSite[] {
  const newest = new Map<string, NewsItem>();
  const ordered = items.filter((item) => isWithinLastDays(item.date, asOf, withinDays)).slice().sort(newestItemFirst);
  for (const item of ordered) keepFirstPublished(newest, item, publishedIds);
  return [...newest.entries()].map(([siteId, item]) => ({ siteId, item })).sort(newestSiteFirst);
}

/** The line under a site name: who reported it, then their headline. */
export function newsPinCaption(item: NewsItem): string {
  const quoted = `${item.sourceName}: “${item.title}”`;
  return item.status === "reported" ? quoted : `${NEWS_STATUS_LABEL[item.status]}. ${quoted}`;
}

function keepFirstPublished(newest: Map<string, NewsItem>, item: NewsItem, publishedIds: ReadonlySet<string>): void {
  for (const siteId of item.siteIds) {
    if (newest.has(siteId) || !isCatalogueSiteId(siteId) || !publishedIds.has(siteId)) continue;
    newest.set(siteId, item);
  }
}

function newestItemFirst(left: NewsItem, right: NewsItem): number {
  const byDate = right.date.localeCompare(left.date);
  return byDate !== 0 ? byDate : left.id.localeCompare(right.id);
}

function newestSiteFirst(left: RecentNewsSite, right: RecentNewsSite): number {
  const byItem = newestItemFirst(left.item, right.item);
  return byItem !== 0 ? byItem : left.siteId.localeCompare(right.siteId);
}
