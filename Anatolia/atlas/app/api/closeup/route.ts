import { readCloseup } from "@/lib/closeupCache";
import { findPublishedPoint } from "@/lib/closeupCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await readCloseup(request.url, (id) => findPublishedPoint(id));
  const body = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
  return new Response(body, {
    status: result.status,
    headers: {
      "content-type": result.contentType,
      "cache-control": "private, max-age=3600",
    },
  });
}
