// The account store's requests to this atlas's own /api/account routes. The session travels as a cookie.

import type { AccountBackend, SavedSite, SiteVoteCount } from "@/lib/account/accountBackend";

type Fetch = (address: string, options: { method: string; credentials: "same-origin" }) => Promise<Response>;

const SIGNED_OUT = 401;

async function call(request: Fetch, method: string, path: string, onSignedOut?: () => void): Promise<Record<string, unknown>> {
  const response = await request(`/api/account/${path}`, { method, credentials: "same-origin" });
  if (response.status === SIGNED_OUT) onSignedOut?.();
  if (!response.ok) throw new Error(`the account request was refused: ${response.status}`);
  return response.json();
}

/** `onSignedOut` hears a 401: the session ended somewhere else, and the screen should stop saying "signed in". */
export function createFetchAccountBackend(onSignedOut?: () => void, request: Fetch = fetch): AccountBackend {
  const send = (method: string, path: string) => call(request, method, path, onSignedOut);
  const change = async (method: string, path: string) => { await send(method, path); };
  return {
    loadSaved: async () => (await send("GET", "saved")).saved as SavedSite[],
    loadVotes: async () => (await send("GET", "votes")).votes as string[],
    saveSite: (siteId, status) => change("PUT", `saved/${encodeURIComponent(siteId)}?status=${status}`),
    removeSavedSite: (siteId) => change("DELETE", `saved/${encodeURIComponent(siteId)}`),
    addVote: (siteId) => change("PUT", `votes/${encodeURIComponent(siteId)}`),
    removeVote: (siteId) => change("DELETE", `votes/${encodeURIComponent(siteId)}`),
    deleteSavedData: () => change("DELETE", "data"),
    deleteAccount: () => change("DELETE", "account"),
  };
}

/** Votes per site, for anyone, signed in or not. */
export async function fetchVoteCounts(request: Fetch = fetch): Promise<SiteVoteCount[]> {
  return (await call(request, "GET", "leaderboard")).counts as SiteVoteCount[];
}
