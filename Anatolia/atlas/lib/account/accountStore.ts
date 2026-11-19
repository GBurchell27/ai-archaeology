// A signed-in visitor's saved sites and votes. A change shows at once and is taken back if the database refuses it.

import type { AccountBackend, SavedStatus } from "@/lib/account/accountBackend";
import { isAccountSiteId } from "@/lib/account/accountSiteId";

export interface AccountState {
  /** False until the visitor's rows have been read. */
  loaded: boolean;
  saved: Readonly<Record<string, SavedStatus>>;
  votes: readonly string[];
  /** What went wrong with the last change, in words for the visitor. */
  error: string | null;
}

export interface AccountStore {
  getState(): AccountState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  /** `null` takes the site off both lists. */
  setSaved(siteId: string, status: SavedStatus | null): Promise<void>;
  setVote(siteId: string, voted: boolean): Promise<void>;
  deleteSavedData(): Promise<void>;
}

export const EMPTY_ACCOUNT_STATE: AccountState = { loaded: false, saved: {}, votes: [], error: null };

export const ACCOUNT_ERRORS = {
  load: "Your saved sites could not be loaded. Reload the page to try again.",
  change: "That change was not saved. Try again.",
  delete: "Your saved data was not deleted. Try again.",
};

function savedWith(saved: AccountState["saved"], siteId: string, status: SavedStatus | null): AccountState["saved"] {
  const next = { ...saved };
  if (status) next[siteId] = status;
  else delete next[siteId];
  return next;
}

function votesWith(votes: readonly string[], siteId: string, voted: boolean): readonly string[] {
  const others = votes.filter((id) => id !== siteId);
  return voted ? [...others, siteId] : others;
}

/** The state and who is listening to it. */
function createStateCell() {
  let state = EMPTY_ACCOUNT_STATE;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    update(change: Partial<AccountState>): void {
      state = { ...state, ...change };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

async function readRows(backend: AccountBackend): Promise<Partial<AccountState>> {
  try {
    const [saved, votes] = await Promise.all([backend.loadSaved(), backend.loadVotes()]);
    const kept = saved.filter((row) => isAccountSiteId(row.siteId)).map((row) => [row.siteId, row.status]);
    return { loaded: true, saved: Object.fromEntries(kept), votes: votes.filter(isAccountSiteId), error: null };
  } catch {
    return { error: ACCOUNT_ERRORS.load };
  }
}

export function createAccountStore(backend: AccountBackend): AccountStore {
  const cell = createStateCell();
  const { update } = cell;
  // shortcut: a failed change restores what it saw before it; two changes to one site in flight can restore a stale value. Queue per site if that is ever seen.
  async function attempt(request: () => Promise<void>, undo: () => void, failure: string): Promise<void> {
    try {
      await request();
    } catch {
      undo();
      update({ error: failure });
    }
  }

  return {
    getState: cell.get,
    subscribe: cell.subscribe,
    load: async () => update(await readRows(backend)),
    async setSaved(siteId, status) {
      if (!isAccountSiteId(siteId)) return;
      const before = cell.get().saved[siteId] ?? null;
      update({ saved: savedWith(cell.get().saved, siteId, status), error: null });
      const request = () => (status ? backend.saveSite(siteId, status) : backend.removeSavedSite(siteId));
      await attempt(request, () => update({ saved: savedWith(cell.get().saved, siteId, before) }), ACCOUNT_ERRORS.change);
    },
    async setVote(siteId, voted) {
      if (!isAccountSiteId(siteId)) return;
      const before = cell.get().votes.includes(siteId);
      update({ votes: votesWith(cell.get().votes, siteId, voted), error: null });
      const request = () => (voted ? backend.addVote(siteId) : backend.removeVote(siteId));
      await attempt(request, () => update({ votes: votesWith(cell.get().votes, siteId, before) }), ACCOUNT_ERRORS.change);
    },
    async deleteSavedData() {
      const { saved, votes } = cell.get();
      update({ saved: {}, votes: [], error: null });
      await attempt(() => backend.deleteSavedData(), () => update({ saved, votes }), ACCOUNT_ERRORS.delete);
    },
  };
}
