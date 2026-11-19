// The account store's database calls, on the tables and the function of supabase/schema.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountBackend, SavedSite, SiteVoteCount } from "@/lib/account/accountBackend";

const OWN_ROW = "user_id,site_id";

/** Supabase reports a failure in the result instead of throwing; the store expects a rejection. */
function dataOf<Rows>(result: { data: Rows | null; error: { message: string } | null }): Rows | null {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Row level security already limits every call to this visitor's rows; the id is sent because an insert must name its owner. */
export function createSupabaseAccountBackend(client: SupabaseClient, userId: string): AccountBackend {
  const savedSites = () => client.from("saved_sites");
  const siteVotes = () => client.from("site_votes");
  return {
    // shortcut: one request returns at most the project's row limit (1,000 by default). Page it if anyone saves more.
    async loadSaved() {
      const rows = dataOf(await savedSites().select("site_id,status")) ?? [];
      return rows.map((row): SavedSite => ({ siteId: row.site_id, status: row.status }));
    },
    async loadVotes() {
      const rows = dataOf(await siteVotes().select("site_id")) ?? [];
      return rows.map((row) => row.site_id as string);
    },
    async saveSite(siteId, status) {
      dataOf(await savedSites().upsert({ user_id: userId, site_id: siteId, status }, { onConflict: OWN_ROW }));
    },
    async removeSavedSite(siteId) {
      dataOf(await savedSites().delete().eq("user_id", userId).eq("site_id", siteId));
    },
    async addVote(siteId) {
      dataOf(await siteVotes().upsert({ user_id: userId, site_id: siteId }, { onConflict: OWN_ROW, ignoreDuplicates: true }));
    },
    async removeVote(siteId) {
      dataOf(await siteVotes().delete().eq("user_id", userId).eq("site_id", siteId));
    },
    async deleteSavedData() {
      dataOf(await savedSites().delete().eq("user_id", userId));
      dataOf(await siteVotes().delete().eq("user_id", userId));
    },
  };
}

/** Votes per site, for anyone: the database function returns site ids and totals and nothing else. */
export async function fetchVoteCounts(client: SupabaseClient, length: number): Promise<SiteVoteCount[]> {
  const rows: { site_id: string; votes: number }[] = dataOf(await client.rpc("site_vote_counts", { max_sites: length })) ?? [];
  return rows.map((row) => ({ siteId: row.site_id, votes: Number(row.votes) }));
}
