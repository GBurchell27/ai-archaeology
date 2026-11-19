// Whether the optional accounts feature is switched on. It is on only when both public settings are present.

export interface AccountConfig {
  /** The Supabase project address. */
  url: string;
  /** The project's public browser key. Row level security, not this key, is what protects the rows. */
  anonKey: string;
}

/** Plain http is accepted only for a Supabase running on this machine. */
function isProjectAddress(value: string): boolean {
  try {
    const address = new URL(value);
    const local = address.hostname === "localhost" || address.hostname === "127.0.0.1";
    return address.protocol === "https:" || (address.protocol === "http:" && local);
  } catch {
    return false;
  }
}

/** The settings as a config, or null when either is missing or the address is not one. Null means: no accounts at all. */
export function readAccountConfig(settings: { url?: string; anonKey?: string }): AccountConfig | null {
  const url = settings.url?.trim() ?? "";
  const anonKey = settings.anonKey?.trim() ?? "";
  return anonKey && isProjectAddress(url) ? { url, anonKey } : null;
}

// Written out in full: Next replaces exactly these two expressions with their values when it builds the page.
export const ACCOUNT_CONFIG = readAccountConfig({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
