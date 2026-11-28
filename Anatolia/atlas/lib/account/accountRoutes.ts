// What /api/account answers. No Next and no database here: the route file hands in the session and a query runner.
//
//   GET    leaderboard          the public vote totals; the only route that needs no session
//   GET    saved | votes        the visitor's own rows
//   PUT    saved/<site id>?status=want|visited
//   DELETE saved/<site id>
//   PUT    votes/<site id>
//   DELETE votes/<site id>
//   DELETE data                 every saved site and every vote of the visitor
//   DELETE account              the visitor's sign-in, and with it all of the above

import type { AccountBackend } from "@/lib/account/accountBackend";
import { AccountFullError, createDatabaseAccountBackend, loadVoteCounts, type QueryRunner } from "@/lib/account/accountQueries";
import { isAccountSiteId } from "@/lib/account/accountSiteId";
import { LEADERBOARD_LENGTH } from "@/lib/account/voteLeaderboard";

export interface AccountRequest {
  method: string;
  /** The address after /api/account, split at the slashes. */
  path: readonly string[];
  /** The `status` query value of a save. */
  status: string | null;
}

export interface AccountRequestContext {
  /** The signed-in visitor's id from the session, or null. Asked only when a route needs it. */
  readUserId(): Promise<string | null>;
  run: QueryRunner;
}

export interface AccountAnswer {
  status: number;
  body: Record<string, unknown>;
}

const DONE: AccountAnswer = { status: 200, body: {} };
const refusal = (status: number, error: string): AccountAnswer => ({ status, body: { error } });
const NOT_FOUND = refusal(404, "no-such-account-route");

/** A browser sends Origin with every request that changes something; one from another site is refused. */
export function isCrossSiteRequest(origin: string | null, host: string | null): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

async function answerForWholeAccount(route: string, rows: AccountBackend): Promise<AccountAnswer> {
  if (route === "GET saved") return { status: 200, body: { saved: await rows.loadSaved() } };
  if (route === "GET votes") return { status: 200, body: { votes: await rows.loadVotes() } };
  if (route === "DELETE data") return rows.deleteSavedData().then(() => DONE);
  if (route === "DELETE account") return rows.deleteAccount().then(() => DONE);
  return NOT_FOUND;
}

async function answerForOneSite(route: string, siteId: string, status: string | null, rows: AccountBackend): Promise<AccountAnswer> {
  if (!isAccountSiteId(siteId)) return refusal(400, "not-a-site-id");
  if (route === "PUT saved") {
    if (status !== "want" && status !== "visited") return refusal(400, "not-a-status");
    return rows.saveSite(siteId, status).then(() => DONE);
  }
  if (route === "DELETE saved") return rows.removeSavedSite(siteId).then(() => DONE);
  if (route === "PUT votes") return rows.addVote(siteId).then(() => DONE);
  if (route === "DELETE votes") return rows.removeVote(siteId).then(() => DONE);
  return NOT_FOUND;
}

export async function answerAccountRequest(request: AccountRequest, context: AccountRequestContext): Promise<AccountAnswer> {
  const [collection, siteId, ...rest] = request.path;
  const route = `${request.method} ${collection ?? ""}`;
  if (rest.length) return NOT_FOUND;
  if (route === "GET leaderboard" && siteId === undefined) {
    return { status: 200, body: { counts: await loadVoteCounts(context.run, LEADERBOARD_LENGTH) } };
  }
  const userId = await context.readUserId();
  if (!userId) return refusal(401, "sign-in-required");
  const rows = createDatabaseAccountBackend(context.run, userId);
  try {
    return await (siteId === undefined ? answerForWholeAccount(route, rows) : answerForOneSite(route, siteId, request.status, rows));
  } catch (error) {
    if (error instanceof AccountFullError) return refusal(409, "account-full");
    throw error;
  }
}
