import { shareCardResponse } from "@/lib/share/shareCard";
import { resolveShareSlug } from "@/lib/share/shareCatalogue";

export const alt = "Share card for a published site in the atlas of early monuments";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/** The Open Graph card. An unknown slug gets the generic card, which still has no coordinates. */
export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const record = await resolveShareSlug((await params).slug);
  return shareCardResponse(record);
}
