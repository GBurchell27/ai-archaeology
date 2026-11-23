// Loads one published catalogue record for a share page. The point is read and dropped.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { detailBucket } from "@/lib/world/catalogueTypes";
import { readableKind, shareDescription, shareLine, shareTitle } from "./shareCopy";
import { catalogueIdFromSlug, shareSlug } from "./siteSlug";

export interface ShareRecord {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  line: string;
}

interface SiteName {
  name: string;
  types: string[];
}

interface FeaturedBlurb {
  why: string;
  period: string;
  country: string;
  category: string;
}

const records = new Map<string, Promise<ShareRecord | null>>();
let blurbs: Promise<Map<string, FeaturedBlurb>> | null = null;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nameAndTypes(value: unknown): SiteName | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { name?: unknown; types?: unknown };
  const name = text(record.name);
  if (!name) return null;
  const types = Array.isArray(record.types) ? record.types.filter((item): item is string => typeof item === "string") : [];
  return { name, types };
}

function readBlurbs(raw: unknown): Map<string, FeaturedBlurb> {
  const found = new Map<string, FeaturedBlurb>();
  if (!Array.isArray(raw)) return found;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as { id?: unknown; why?: unknown; period?: unknown; country?: unknown; category?: unknown };
    const id = text(item.id);
    const why = text(item.why);
    if (!id || !why) continue;
    found.set(id, { why, period: text(item.period), country: text(item.country), category: text(item.category) });
  }
  return found;
}

async function loadBlurbs(): Promise<Map<string, FeaturedBlurb>> {
  blurbs ??= readFile(join(process.cwd(), "public", "world", "featured.json"), "utf8")
    .then((contents) => readBlurbs(JSON.parse(contents) as unknown))
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return new Map();
      throw error;
    });
  return blurbs;
}

async function readDetail(id: string): Promise<SiteName | null> {
  const file = join(process.cwd(), "public", "world", "detail", `${detailBucket(id)}.json`);
  const contents = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (contents === null) return null;
  const parsed: unknown = JSON.parse(contents);
  if (!parsed || typeof parsed !== "object") return null;
  return nameAndTypes((parsed as Record<string, unknown>)[id]);
}

function recordFrom(id: string, detail: SiteName, blurb: FeaturedBlurb | undefined): ShareRecord | null {
  const slug = shareSlug(id, detail.name);
  if (!slug) return null;
  const kind = readableKind(blurb?.category, detail.types);
  return {
    id,
    name: detail.name,
    slug,
    title: shareTitle(detail.name),
    description: shareDescription({ why: blurb?.why, kind }),
    line: shareLine({ period: blurb?.period, country: blurb?.country, kind }),
  };
}

async function loadRecord(id: string): Promise<ShareRecord | null> {
  const detail = await readDetail(id);
  if (!detail) return null;
  return recordFrom(id, detail, (await loadBlurbs()).get(id));
}

/** The published record a slug names, or null when the catalogue has no such id. */
export function resolveShareSlug(slug: string): Promise<ShareRecord | null> {
  const id = catalogueIdFromSlug(slug);
  if (!id) return Promise.resolve(null);
  const cached = records.get(id);
  if (cached) return cached;
  const pending = loadRecord(id);
  records.set(id, pending);
  return pending;
}
