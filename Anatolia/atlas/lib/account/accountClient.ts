// The Supabase client. Its code is fetched, and the client made, only when accounts are configured and first needed.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountConfig } from "@/lib/account/accountConfig";

// A sign-in comes back as ?code=… on the address, which the coordinator's next write of the address removes.
// So it is read as this file loads, before the globe has reported a look.
const returnedSignInCode = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("code");

let clientRequest: Promise<SupabaseClient> | null = null;

export function loadAccountClient(config: AccountConfig): Promise<SupabaseClient> {
  clientRequest ??= import("@supabase/supabase-js").then(async ({ createClient }) => {
    const client = createClient(config.url, config.anonKey, { auth: { flowType: "pkce", detectSessionInUrl: false } });
    // A code that is stale or not ours is refused by the service, and the visitor stays signed out.
    if (returnedSignInCode) await client.auth.exchangeCodeForSession(returnedSignInCode).catch(() => undefined);
    return client;
  });
  return clientRequest;
}
