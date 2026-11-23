import { shareCardResponse } from "@/lib/share/shareCard";
import { resolveShareSlug } from "@/lib/share/shareCatalogue";

export const alt = "Share card for a published site in the atlas of early monuments";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/** The same card as the Open Graph image, for Twitter's large summary. */
export default async function TwitterImage({ params }: { params: Promise<{ slug: string }> }) {
  const record = await resolveShareSlug((await params).slug);
  return shareCardResponse(record);
}
