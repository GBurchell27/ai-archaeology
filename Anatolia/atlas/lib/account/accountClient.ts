// The Neon Auth browser client. Its code is fetched, and the client made, only when accounts are on and first needed.
// It talks to this atlas's own /api/auth routes, which pass each request on to the auth service.

import type { createAuthClient } from "@neon/auth/next";

// The client answers any property it is asked for, `then` included, so a promise or a React state must never hold it
// bare: both would call it. It travels inside this holder.
export interface AccountClient {
  auth: ReturnType<typeof createAuthClient>;
}

const VERIFIER = "neon_auth_session_verifier";

// A Google sign-in comes back with a verifier on the address, which the client reads when it first asks for the
// session. The coordinator's next write of the address would drop it, so it is kept as this file loads.
const returnedVerifier = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(VERIFIER);

/** Puts the verifier back on the address if it was dropped. The client removes it once the session is read. */
export function restoreReturnedVerifier(): void {
  const address = new URL(window.location.href);
  if (!returnedVerifier || address.searchParams.has(VERIFIER)) return;
  address.searchParams.set(VERIFIER, returnedVerifier);
  window.history.replaceState(window.history.state, "", address);
}

let clientRequest: Promise<AccountClient> | null = null;

export function loadAccountClient(): Promise<AccountClient> {
  clientRequest ??= import("@neon/auth/next").then((module) => ({ auth: module.createAuthClient() }));
  return clientRequest;
}
