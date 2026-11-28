"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SavedStatus, SiteVoteCount } from "@/lib/account/accountBackend";
import { loadAccountClient, restoreReturnedVerifier, type AccountClient } from "@/lib/account/accountClient";
import { ACCOUNTS_ON } from "@/lib/account/accountConfig";
import { EMPTY_ACCOUNT_STATE, createAccountStore, type AccountState } from "@/lib/account/accountStore";
import { createFetchAccountBackend, fetchVoteCounts } from "@/lib/account/fetchAccountBackend";
import { orderVoteCounts } from "@/lib/account/voteLeaderboard";

export interface AccountViewModel {
  /** "loading" until the session this browser kept has been read. */
  session: "loading" | "signedOut" | "signedIn";
  /** The visitor's own address, shown only to them. */
  email: string | null;
  places: AccountState;
  setSaved(siteId: string, status: SavedStatus | null): void;
  setVote(siteId: string, voted: boolean): void;
  deleteSavedData(): void;
  /** Deletes the sign-in and everything saved under it, then signs out. */
  deleteAccount(): void;
  /** Leaves the page for Google. False when the sign-in could not start. */
  signInWithGoogle(): Promise<boolean>;
  /** Has a code sent to the address. False when it could not be sent. */
  sendSignInCode(email: string): Promise<boolean>;
  /** False when the code is wrong or too old. */
  signInWithCode(email: string, code: string): Promise<boolean>;
  signOut(): void;
  /** The public vote totals, most voted first. Rejects when they cannot be read. */
  loadVoteCounts(): Promise<SiteVoteCount[]>;
}

interface Visitor {
  /** `undefined` while the kept session is being read, `null` when signed out. */
  userId: string | null | undefined;
  email: string | null;
}

const SIGNED_OUT: Visitor = { userId: null, email: null };

/** The auth client reports a refusal in its result, and a failed request by throwing. */
async function succeeded(request: Promise<{ error?: unknown }> | undefined): Promise<boolean> {
  try {
    const result = await request;
    return result !== undefined && !result.error;
  } catch {
    return false;
  }
}

function useAccountSession() {
  const [client, setClient] = useState<AccountClient | null>(null);
  const [visitor, setVisitor] = useState<Visitor>({ userId: undefined, email: null });
  const readSession = useCallback(async () => {
    try {
      const loaded = await loadAccountClient();
      restoreReturnedVerifier();
      const { data } = await loaded.auth.getSession();
      setClient(loaded);
      setVisitor({ userId: data?.user?.id ?? null, email: data?.user?.email ?? null });
    } catch {
      setVisitor(SIGNED_OUT);
    }
  }, []);
  useEffect(() => { if (ACCOUNTS_ON) void readSession(); }, [readSession]);
  const markSignedOut = useCallback(() => setVisitor(SIGNED_OUT), []);
  return { client, ...visitor, readSession, markSignedOut };
}

const neverChanges = () => () => {};

/** The signed-in visitor's saved sites and votes; empty while signed out. */
function useAccountPlaces(userId: string | null | undefined, onSignedOut: () => void) {
  const store = useMemo(() => (userId ? createAccountStore(createFetchAccountBackend(onSignedOut)) : null), [userId, onSignedOut]);
  useEffect(() => { void store?.load(); }, [store]);
  const places = useSyncExternalStore(store?.subscribe ?? neverChanges, store?.getState ?? (() => EMPTY_ACCOUNT_STATE));
  return { store, places };
}

function useSignInActions(session: ReturnType<typeof useAccountSession>) {
  const { client, readSession, markSignedOut } = session;
  return useMemo(() => {
    // The client also drops its own copy of the session; the service may already have ended it.
    const leave = async () => {
      await succeeded(client?.auth.signOut());
      markSignedOut();
    };
    return {
      signInWithGoogle: () => succeeded(client?.auth.signIn.social({ provider: "google", callbackURL: window.location.origin })),
      sendSignInCode: (address: string) => succeeded(client?.auth.emailOtp.sendVerificationOtp({ email: address, type: "sign-in" })),
      async signInWithCode(address: string, code: string) {
        const signedIn = await succeeded(client?.auth.signIn.emailOtp({ email: address, otp: code }));
        if (signedIn) await readSession();
        return signedIn;
      },
      signOut: () => void leave(),
    };
  }, [client, readSession, markSignedOut]);
}

const loadVoteCounts = async () => orderVoteCounts(await fetchVoteCounts());

/** Optional accounts for the globe. Null when the server settings were absent at build: then nothing is fetched and nothing shows. */
export function useAccount(): AccountViewModel | null {
  const session = useAccountSession();
  const { userId, email } = session;
  const { store, places } = useAccountPlaces(userId, session.markSignedOut);
  const signIn = useSignInActions(session);

  return useMemo(() => (ACCOUNTS_ON ? {
    session: userId === undefined ? "loading" : userId ? "signedIn" : "signedOut",
    email,
    places,
    setSaved: (siteId, status) => void store?.setSaved(siteId, status),
    setVote: (siteId, voted) => void store?.setVote(siteId, voted),
    deleteSavedData: () => void store?.deleteSavedData(),
    deleteAccount: () => void store?.deleteAccount().then((deleted) => { if (deleted) signIn.signOut(); }),
    ...signIn,
    loadVoteCounts,
  } : null), [userId, email, store, places, signIn]);
}
