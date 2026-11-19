import { readAccountSettings } from "@/lib/account/accountConfig";
import { accountAuth } from "@/lib/account/accountServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Neon Auth's own routes (sign-in, session, sign-out), passed on to the auth service. Without the settings there is no service to pass to.
const settings = readAccountSettings(process.env);
const handlers = settings ? accountAuth(settings).handler() : null;
const unavailable = async () => Response.json({ error: "accounts-unavailable" }, { status: 503 });

export const GET = handlers?.GET ?? unavailable;
export const POST = handlers?.POST ?? unavailable;
export const PUT = handlers?.PUT ?? unavailable;
export const PATCH = handlers?.PATCH ?? unavailable;
export const DELETE = handlers?.DELETE ?? unavailable;
