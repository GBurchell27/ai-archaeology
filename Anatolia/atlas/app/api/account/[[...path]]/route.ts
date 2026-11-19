import { readAccountSettings } from "@/lib/account/accountConfig";
import { answerAccountRequest, isCrossSiteRequest } from "@/lib/account/accountRoutes";
import { accountAuth, accountQueryRunner } from "@/lib/account/accountServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Saved sites, votes and the public vote totals: lib/account/accountRoutes.ts lists the routes. */
async function respond(request: Request, { params }: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  const settings = readAccountSettings(process.env);
  if (!settings) return reply(503, { error: "accounts-unavailable" });
  if (isCrossSiteRequest(request.headers.get("origin"), request.headers.get("host"))) return reply(403, { error: "cross-site" });
  try {
    const answer = await answerAccountRequest(
      { method: request.method, path: (await params).path ?? [], status: new URL(request.url).searchParams.get("status") },
      {
        readUserId: async () => (await accountAuth(settings).getSession()).data?.user?.id ?? null,
        run: accountQueryRunner(settings),
      },
    );
    return reply(answer.status, answer.body);
  } catch (error) {
    console.error("account request failed:", error instanceof Error ? error.message : error);
    return reply(500, { error: "account-request-failed" });
  }
}

export { respond as GET, respond as PUT, respond as DELETE };
