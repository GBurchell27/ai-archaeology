// What the account store needs from a database. The browser implements it with requests to /api/account, the server
// with SQL; the check script runs a fake.

export type SavedStatus = "want" | "visited";

export interface SavedSite {
  siteId: string;
  status: SavedStatus;
}

export interface SiteVoteCount {
  siteId: string;
  votes: number;
}

/** One signed-in visitor's own rows. Every call rejects on failure. */
export interface AccountBackend {
  loadSaved(): Promise<SavedSite[]>;
  loadVotes(): Promise<string[]>;
  /** Adds the site to a list, or moves it to the other one. */
  saveSite(siteId: string, status: SavedStatus): Promise<void>;
  removeSavedSite(siteId: string): Promise<void>;
  addVote(siteId: string): Promise<void>;
  removeVote(siteId: string): Promise<void>;
  /** Every saved site and every vote of this visitor. The sign-in itself stays. */
  deleteSavedData(): Promise<void>;
}
