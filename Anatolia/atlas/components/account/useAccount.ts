"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedStatus, SiteVoteCount } from "@/lib/account/accountBackend";
import { loadAccountClient } from "@/lib/account/accountClient";
import { ACCOUNT_CONFIG } from "@/lib/account/accountConfig";
import { EMPTY_ACCOUNT_STATE, createAccountStore, type AccountState } from "@/lib/account/accountStore";
import { createSupabaseAccountBackend, fetchVoteCounts } from "@/lib/account/supabaseAccountBackend";
import { LEADERBOARD_LENGTH, orderVoteCounts } from "@/lib/account/voteLeaderboard";

export interface AccountViewModel {
  /** "loading" until the session this browser kept has been read. */
  session: "loading" | "signedOut" | "signedIn";
  /** The visitor's own address, shown only to them. */
  email: string | null;
  places: AccountState;
  setSaved(siteId: string, status: SavedStatus | null): void;
  setVote(siteId: string, voted: boolean): void;
  deleteSavedData(): void;
  /** Leaves the page for Google. False when the sign-in could not start. */
  signInWithGoogle(): Promise<boolean>;
  /** False when the link could not be sent. */
  sendSignInLink(email: string): Promise<boolean>;
  signOut(): void;
  /** The public vote totals, most voted first. Rejects when they cannot be read. */
  loadVoteCounts(): Promise<SiteVoteCount[]>;
}

/** A sign-in returns to the bare page: the redirect allow-list of the project then needs one entry. */
function returnAddress(): string {
  return window.location.origin + window.location.pathname;
}

interface AccountSession {
  client: SupabaseClient | null;
  /** `undefined` while the kept session is being read, `null` when signed out. */
  userId: string | null | undefined;
  email: string | null;
}

function useAccountSession(): AccountSession {
  const [session, setSession] = useState<AccountSession>({ client: null, userId: undefined, email: null });
  useEffect(() => {
    if (!ACCOUNT_CONFIG) return;
    let stopListening = () => {};
    let live = true;
    loadAccountClient(ACCOUNT_CONFIG).then((client) => {
      if (!live) return;
      // Fires at once with the kept session, then on every sign-in and sign-out.
      const { data } = client.auth.onAuthStateChange((_event, current) => {
        setSession({ client, userId: current?.user.id ?? null, email: current?.user.email ?? null });
      });
      stopListening = () => data.subscription.unsubscribe();
    }, () => { if (live) setSession({ client: null, userId: null, email: null }); });
    return () => {
      live = false;
      stopListening();
    };
  }, []);
  return session;
}

const neverChanges = () => () => {};

/** The signed-in visitor's saved sites and votes; empty while signed out. */
function useAccountPlaces(client: SupabaseClient | null, userId: string | null | undefined) {
  const store = useMemo(
    () => (client && userId ? createAccountStore(createSupabaseAccountBackend(client, userId)) : null),
    [client, userId],
  );
  useEffect(() => { void store?.load(); }, [store]);
  const places = useSyncExternalStore(store?.subscribe ?? neverChanges, store?.getState ?? (() => EMPTY_ACCOUNT_STATE));
  return { store, places };
}

/** Optional accounts for the globe. Null when the two Supabase settings are absent: then nothing is fetched and nothing shows. */
export function useAccount(): AccountViewModel | null {
  const { client, userId, email } = useAccountSession();
  const { store, places } = useAccountPlaces(client, userId);

  const signInWithGoogle = useCallback(async () => {
    const result = await client?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: returnAddress() } });
    return result !== undefined && !result.error;
  }, [client]);
  const sendSignInLink = useCallback(async (address: string) => {
    const result = await client?.auth.signInWithOtp({ email: address, options: { emailRedirectTo: returnAddress() } });
    return result !== undefined && !result.error;
  }, [client]);
  const loadVoteCounts = useCallback(async () => {
    if (!ACCOUNT_CONFIG) return [];
    return orderVoteCounts(await fetchVoteCounts(await loadAccountClient(ACCOUNT_CONFIG), LEADERBOARD_LENGTH));
  }, []);

  return useMemo(() => (ACCOUNT_CONFIG ? {
    session: userId === undefined ? "loading" : userId ? "signedIn" : "signedOut",
    email,
    places,
    setSaved: (siteId, status) => void store?.setSaved(siteId, status),
    setVote: (siteId, voted) => void store?.setVote(siteId, voted),
    deleteSavedData: () => void store?.deleteSavedData(),
    signInWithGoogle,
    sendSignInLink,
    signOut: () => void client?.auth.signOut(),
    loadVoteCounts,
  } : null), [client, userId, email, store, places, signInWithGoogle, sendSignInLink, loadVoteCounts]);
}
