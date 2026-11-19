// The order of the "Most voted" list, and the two statements the account screens make.

import type { SiteVoteCount } from "@/lib/account/accountBackend";
import { isAccountSiteId } from "@/lib/account/accountSiteId";

export const LEADERBOARD_LENGTH = 50;

/** Most votes first, ties by id so the order does not shuffle between visits. Rows that are not a site id with a vote are dropped. */
export function orderVoteCounts(counts: readonly SiteVoteCount[], length = LEADERBOARD_LENGTH): SiteVoteCount[] {
  return counts
    .filter((count) => isAccountSiteId(count.siteId) && Number.isInteger(count.votes) && count.votes > 0)
    .sort((first, second) => second.votes - first.votes || (first.siteId < second.siteId ? -1 : 1))
    .slice(0, length);
}

export const WHAT_AN_ACCOUNT_STORES =
  "An account holds the email address you sign in with (Google also sends the name and picture of your Google profile) "
  + "and the ids of the sites you save or vote for. None of it is shown to other visitors: only the number of votes each site has is public.";

export const WHAT_A_VOTE_MEANS =
  "These are visitors' favourites. A signed-in visitor can give a site one vote, and the count says how many people "
  + "find a place remarkable. It does not say how important a site is or which reading of it is right.";
