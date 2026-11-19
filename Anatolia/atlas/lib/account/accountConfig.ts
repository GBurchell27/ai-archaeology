// Whether the optional accounts feature is switched on. This file imports nothing, so next.config.ts can read it.

export interface AccountSettings {
  /** The pooled Postgres address. Secret. */
  databaseUrl: string;
  /** The Neon Auth address of the branch. */
  authBaseUrl: string;
  /** Signs the session cookies. Secret. */
  cookieSecret: string;
}

/** Neon Auth refuses a shorter secret. */
const SHORTEST_COOKIE_SECRET = 32;

/** The three server settings, or null when any is missing. Null means: no accounts at all. */
export function readAccountSettings(environment: Record<string, string | undefined>): AccountSettings | null {
  const databaseUrl = environment.DATABASE_URL?.trim() ?? "";
  const authBaseUrl = environment.NEON_AUTH_BASE_URL?.trim() ?? "";
  const cookieSecret = environment.NEON_AUTH_COOKIE_SECRET?.trim() ?? "";
  const complete = databaseUrl && authBaseUrl && cookieSecret.length >= SHORTEST_COOKIE_SECRET;
  return complete ? { databaseUrl, authBaseUrl, cookieSecret } : null;
}

// The settings are server-only, so the page cannot read them. next.config.ts writes this one value into the page
// when it builds: "on" when all three were present. Written out in full, because Next replaces exactly this expression.
export const ACCOUNTS_ON = process.env.NEXT_PUBLIC_ATLAS_ACCOUNTS === "on";
