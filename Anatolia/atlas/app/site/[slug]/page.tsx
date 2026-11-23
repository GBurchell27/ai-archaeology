import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { WorldCoordinator } from "@/components/WorldCoordinator";
import { parseViewUrl } from "@/lib/globe/viewUrl";
import { resolveShareSlug } from "@/lib/share/shareCatalogue";
import type { RegionalTerrain } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

async function readRegion(): Promise<RegionalTerrain | null> {
  const path = join(process.cwd(), "public", "terrain", "regions", "sanliurfa", "metadata.json");
  return readFile(path, "utf8")
    .then((contents) => JSON.parse(contents) as RegionalTerrain)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const record = await resolveShareSlug((await params).slug);
  if (!record) return { title: "Site not in the catalogue", description: "Share pages exist only for published records in the world catalogue." };
  const path = `/site/${record.slug}`;
  const image = { url: `${path}/opengraph-image`, width: 1200, height: 630, alt: record.title };
  return {
    title: record.title,
    description: record.description,
    alternates: { canonical: path },
    openGraph: {
      title: record.title,
      description: record.description,
      type: "website",
      url: path,
      siteName: "Atlas of early monuments",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: record.title, description: record.description, images: [image.url] },
  };
}

/** Opens the globe on one published site. The slug is the name and the catalogue id, not a location. */
export default async function SitePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const record = await resolveShareSlug(slug);
  if (!record) notFound();
  if (slug !== record.slug) permanentRedirect(`/site/${record.slug}`);
  const initialView = parseViewUrl(await searchParams);
  const sharedSiteId = initialView.view === "globe" ? record.id : undefined;
  return <WorldCoordinator regional={await readRegion()} initialView={initialView} sharedSiteId={sharedSiteId} />;
}
