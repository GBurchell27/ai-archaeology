// The two services behind the account routes: Neon Auth for the session, Postgres for the rows. Server only.

import { createNeonAuth } from "@neon/auth/next/server";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import type { AccountSettings } from "@/lib/account/accountConfig";
import type { QueryRunner } from "@/lib/account/accountQueries";

let auth: ReturnType<typeof createNeonAuth> | undefined;
let pool: Pool | undefined;

export function accountAuth(settings: AccountSettings): ReturnType<typeof createNeonAuth> {
  auth ??= createNeonAuth({ baseUrl: settings.authBaseUrl, cookies: { secret: settings.cookieSecret } });
  return auth;
}

function accountPool(settings: AccountSettings): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: settings.databaseUrl });
    // On Vercel this closes idle connections before a function is suspended; elsewhere it does nothing.
    attachDatabasePool(pool);
  }
  return pool;
}

export function accountQueryRunner(settings: AccountSettings): QueryRunner {
  return (text, values) => accountPool(settings).query(text, [...values]);
}
