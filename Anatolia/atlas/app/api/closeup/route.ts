import { readCloseup } from "@/lib/closeupCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await readCloseup(request.url);
  const body = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
  return new Response(body, {
    status: result.status,
    headers: {
      "content-type": result.contentType,
      "cache-control": "private, max-age=3600",
    },
  });
}
