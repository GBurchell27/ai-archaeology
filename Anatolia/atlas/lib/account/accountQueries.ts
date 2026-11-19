// The account tables of db/schema.sql, as SQL. Every statement about a visitor's rows names that visitor as $1:
// this, not the database, is what keeps one visitor out of another's rows. Values travel as parameters only.

import type { AccountBackend, SavedSite, SiteVoteCount } from "@/lib/account/accountBackend";

/** Runs one statement. The `pg` pool does; the check script records. */
export type QueryRunner = (text: string, values: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

/** The most rows one visitor may hold in each table, and the most one read returns. */
export const MOST_ROWS_PER_VISITOR = 1000;

/** A visitor who already holds the most rows asked for one more. */
export class AccountFullError extends Error {}

const SQL = {
  saved: "select site_id, status from public.saved_sites where user_id = $1 order by created_at limit $2",
  votes: "select site_id from public.site_votes where user_id = $1 order by created_at limit $2",
  otherSaved: "select count(*)::int as held from public.saved_sites where user_id = $1 and site_id <> $2",
  otherVotes: "select count(*)::int as held from public.site_votes where user_id = $1 and site_id <> $2",
  save: "insert into public.saved_sites (user_id, site_id, status) values ($1, $2, $3) "
    + "on conflict (user_id, site_id) do update set status = excluded.status",
  unsave: "delete from public.saved_sites where user_id = $1 and site_id = $2",
  vote: "insert into public.site_votes (user_id, site_id) values ($1, $2) on conflict (user_id, site_id) do nothing",
  unvote: "delete from public.site_votes where user_id = $1 and site_id = $2",
  forgetSaved: "delete from public.saved_sites where user_id = $1",
  forgetVotes: "delete from public.site_votes where user_id = $1",
  voteCounts: "select site_id, count(*)::int as votes from public.site_votes group by site_id order by votes desc, site_id limit $1",
};

// shortcut: the count and the insert are two statements, so two requests at once can pass the limit by one. Use one statement if that matters.
async function requireRoom(run: QueryRunner, countOthers: string, userId: string, siteId: string): Promise<void> {
  const { rows } = await run(countOthers, [userId, siteId]);
  if (Number(rows[0]?.held) >= MOST_ROWS_PER_VISITOR) throw new AccountFullError("this account holds the most rows it may");
}

/** One visitor's rows. `userId` comes from the session, never from the request. */
export function createDatabaseAccountBackend(run: QueryRunner, userId: string): AccountBackend {
  return {
    async loadSaved() {
      const { rows } = await run(SQL.saved, [userId, MOST_ROWS_PER_VISITOR]);
      return rows.map((row) => ({ siteId: row.site_id, status: row.status }) as SavedSite);
    },
    async loadVotes() {
      const { rows } = await run(SQL.votes, [userId, MOST_ROWS_PER_VISITOR]);
      return rows.map((row) => row.site_id as string);
    },
    async saveSite(siteId, status) {
      await requireRoom(run, SQL.otherSaved, userId, siteId);
      await run(SQL.save, [userId, siteId, status]);
    },
    async removeSavedSite(siteId) { await run(SQL.unsave, [userId, siteId]); },
    async addVote(siteId) {
      await requireRoom(run, SQL.otherVotes, userId, siteId);
      await run(SQL.vote, [userId, siteId]);
    },
    async removeVote(siteId) { await run(SQL.unvote, [userId, siteId]); },
    async deleteSavedData() {
      await run(SQL.forgetSaved, [userId]);
      await run(SQL.forgetVotes, [userId]);
    },
  };
}

/** Votes per site, for anyone: a site id and a total, and nothing about who voted. */
export async function loadVoteCounts(run: QueryRunner, length: number): Promise<SiteVoteCount[]> {
  const { rows } = await run(SQL.voteCounts, [length]);
  return rows.map((row) => ({ siteId: row.site_id as string, votes: Number(row.votes) }));
}
