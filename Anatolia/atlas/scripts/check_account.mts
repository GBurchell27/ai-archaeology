// Optional accounts, the pure part: config detection, site ids, the store against an in-memory database, the browser's
// requests against a stub fetch, the server's routes against a recording query runner, the vote list's order.
import { readFileSync } from "node:fs";
import { register } from "node:module";

// The library files import each other through the "@/" alias, or by a relative path with no extension; teach Node both.
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) return next(root + specifier.slice(2) + ".ts", context);
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);

const { ACCOUNTS_ON, readAccountSettings } = await import("../lib/account/accountConfig.ts");
const { MOST_ROWS_PER_VISITOR } = await import("../lib/account/accountQueries.ts");
const { answerAccountRequest, isCrossSiteRequest } = await import("../lib/account/accountRoutes.ts");
const { createFetchAccountBackend, fetchVoteCounts } = await import("../lib/account/fetchAccountBackend.ts");
const { isAccountSiteId } = await import("../lib/account/accountSiteId.ts");
const { ACCOUNT_ERRORS, createAccountStore } = await import("../lib/account/accountStore.ts");
const { LEADERBOARD_LENGTH, WHAT_AN_ACCOUNT_STORES, WHAT_A_VOTE_MEANS, orderVoteCounts } = await import("../lib/account/voteLeaderboard.ts");
const { parseViewUrl } = await import("../lib/globe/viewUrl.ts");
type AccountBackend = import("../lib/account/accountBackend.ts").AccountBackend;
type SavedStatus = import("../lib/account/accountBackend.ts").SavedStatus;

let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  failed += 1;
  console.error("FAIL", label, JSON.stringify(actual), "expected", JSON.stringify(expected));
}

// Config: all three server settings, or no accounts at all.
const settings = { DATABASE_URL: "postgres://db.example/atlas", NEON_AUTH_BASE_URL: "https://auth.example/atlas/auth", NEON_AUTH_COOKIE_SECRET: "s".repeat(32) };
const read = { databaseUrl: settings.DATABASE_URL, authBaseUrl: settings.NEON_AUTH_BASE_URL, cookieSecret: settings.NEON_AUTH_COOKIE_SECRET };
check("three settings make accounts", readAccountSettings(settings), read);
check("settings are trimmed", readAccountSettings({ ...settings, DATABASE_URL: ` ${settings.DATABASE_URL}\n` }), read);
check("no settings, no accounts", readAccountSettings({}), null);
for (const name of Object.keys(settings)) {
  check(`without ${name}, no accounts`, readAccountSettings({ ...settings, [name]: undefined }), null);
  check(`an empty ${name} counts as absent`, readAccountSettings({ ...settings, [name]: " " }), null);
}
check("a cookie secret the auth service would refuse is no setting", readAccountSettings({ ...settings, NEON_AUTH_COOKIE_SECRET: "s".repeat(31) }), null);
if (!process.env.NEXT_PUBLIC_ATLAS_ACCOUNTS) check("without the build's value the feature is off", ACCOUNTS_ON, false);

// Site ids: the address bar's rule, less OpenStreetMap records.
check("a Wikidata id", isAccountSiteId("Q214944"), true);
check("a slug", isAccountSiteId("gobekli-tepe"), true);
check("a Pleiades number", isAccountSiteId("599612"), true);
check("an OpenStreetMap record is left out", isAccountSiteId("osm-node-12345"), false);
for (const refused of ["", "Q", "Gobekli", "a--b", "-a", "a b", "37.2,38.9", "a/b", "Q1;drop", "a".repeat(81), null, 214944]) {
  check(`refused: ${JSON.stringify(refused)}`, isAccountSiteId(refused), false);
}
check("80 characters is the longest id", isAccountSiteId("a".repeat(80)), true);
for (const id of ["Q214944", "gobekli-tepe", "q1", "a--b", "a b"]) {
  const inAddress = (parseViewUrl(`?view=place&site=${encodeURIComponent(id)}`) as { siteId?: string }).siteId === id;
  check(`the address bar agrees about ${id}`, isAccountSiteId(id), inAddress);
}

// The store against an in-memory database that can be told to fail.
function fakeBackend() {
  const saved = new Map<string, SavedStatus>();
  const votes = new Set<string>();
  const database = { saved, votes, failing: false, calls: 0 };
  async function run(change: () => void): Promise<void> {
    database.calls += 1;
    if (database.failing) throw new Error("the database said no");
    change();
  }
  const backend: AccountBackend = {
    loadSaved: async () => { await run(() => {}); return [...saved].map(([siteId, status]) => ({ siteId, status })); },
    loadVotes: async () => [...votes],
    saveSite: (siteId, status) => run(() => { saved.set(siteId, status); }),
    removeSavedSite: (siteId) => run(() => { saved.delete(siteId); }),
    addVote: (siteId) => run(() => { votes.add(siteId); }),
    removeVote: (siteId) => run(() => { votes.delete(siteId); }),
    deleteSavedData: () => run(() => { saved.clear(); votes.clear(); }),
    deleteAccount: () => run(() => { saved.clear(); votes.clear(); }),
  };
  return { backend, database };
}

{
  const { backend, database } = fakeBackend();
  database.saved.set("Q12508", "visited");
  database.saved.set("osm-node-1", "want");
  database.votes.add("Q12508");
  const store = createAccountStore(backend);
  let notified = 0;
  const stop = store.subscribe(() => { notified += 1; });
  check("nothing before the rows are read", store.getState(), { loaded: false, saved: {}, votes: [], error: null });
  await store.load();
  check("the rows are read, and an id that is not allowed is dropped", store.getState(), { loaded: true, saved: { Q12508: "visited" }, votes: ["Q12508"], error: null });
  check("a listener hears the change", notified, 1);

  const saving = store.setSaved("Q214944", "want");
  check("a save shows before the database answers", store.getState().saved.Q214944, "want");
  await saving;
  check("the save reached the database", database.saved.get("Q214944"), "want");
  await store.setSaved("Q214944", "visited");
  check("the status changes", [store.getState().saved.Q214944, database.saved.get("Q214944")], ["visited", "visited"]);
  await store.setSaved("Q214944", null);
  check("the site is removed", ["Q214944" in store.getState().saved, database.saved.has("Q214944")], [false, false]);

  await store.setVote("Q214944", true);
  check("a vote", [store.getState().votes, [...database.votes]], [["Q12508", "Q214944"], ["Q12508", "Q214944"]]);
  await store.setVote("Q214944", true);
  check("voting twice is one vote", store.getState().votes, ["Q12508", "Q214944"]);
  await store.setVote("Q214944", false);
  check("the vote is taken back", [store.getState().votes, [...database.votes]], [["Q12508"], ["Q12508"]]);

  const callsBefore = database.calls;
  await store.setSaved("osm-node-1", "want");
  await store.setVote("37.2,38.9", true);
  await store.setVote("Not An Id", true);
  check("an id that is not allowed is neither kept nor sent", [store.getState().saved, store.getState().votes, database.calls], [{ Q12508: "visited" }, ["Q12508"], callsBefore]);

  database.failing = true;
  const refused = store.setSaved("Q12508", "want");
  check("a change shows at once even when it will fail", store.getState().saved.Q12508, "want");
  await refused;
  check("a refused change of status goes back", store.getState(), { loaded: true, saved: { Q12508: "visited" }, votes: ["Q12508"], error: ACCOUNT_ERRORS.change });
  await store.setSaved("Q214944", "want");
  check("a refused save goes back", "Q214944" in store.getState().saved, false);
  await store.setSaved("Q12508", null);
  check("a refused removal goes back", store.getState().saved.Q12508, "visited");
  await store.setVote("Q214944", true);
  check("a refused vote goes back", store.getState().votes, ["Q12508"]);
  await store.setVote("Q12508", false);
  check("a refused unvote goes back", store.getState().votes, ["Q12508"]);
  await store.deleteSavedData();
  check("a refused delete goes back", store.getState(), { loaded: true, saved: { Q12508: "visited" }, votes: ["Q12508"], error: ACCOUNT_ERRORS.delete });
  check("a refused account deletion says so and reports failure", [await store.deleteAccount(), store.getState().error], [false, ACCOUNT_ERRORS.deleteAccount]);

  database.failing = false;
  await store.setVote("Q214944", true);
  check("the next change that works clears the message", store.getState().error, null);
  await store.deleteSavedData();
  check("delete my saved data empties both", [store.getState().saved, store.getState().votes, database.saved.size, database.votes.size], [{}, [], 0, 0]);
  check("an account deletion that works reports success", await store.deleteAccount(), true);

  stop();
  const heard = notified;
  await store.setVote("Q12508", true);
  check("a listener that left hears nothing", notified, heard);
}

{
  const { backend, database } = fakeBackend();
  database.failing = true;
  const store = createAccountStore(backend);
  await store.load();
  check("a failed read says so and stays unloaded", store.getState(), { loaded: false, saved: {}, votes: [], error: ACCOUNT_ERRORS.load });
}

// The browser's requests, against a fetch that records and answers as told.
function stubFetch() {
  const stub = {
    sent: [] as string[],
    status: 200,
    body: {} as unknown,
    fetch: async (address: string, options: { method: string }) => {
      stub.sent.push(`${options.method} ${address}`);
      return new Response(JSON.stringify(stub.body), { status: stub.status });
    },
  };
  return stub;
}

{
  const stub = stubFetch();
  let signedOut = 0;
  const backend = createFetchAccountBackend(() => { signedOut += 1; }, stub.fetch);
  stub.body = { saved: [{ siteId: "Q12508", status: "visited" }], votes: ["Q12508"], counts: [{ siteId: "Q1", votes: 2 }] };
  check("the saved sites are read", await backend.loadSaved(), [{ siteId: "Q12508", status: "visited" }]);
  check("the votes are read", await backend.loadVotes(), ["Q12508"]);
  check("the vote totals are read", await fetchVoteCounts(stub.fetch), [{ siteId: "Q1", votes: 2 }]);
  await backend.saveSite("Q214944", "want");
  await backend.removeSavedSite("Q214944");
  await backend.addVote("gobekli-tepe");
  await backend.removeVote("gobekli-tepe");
  await backend.deleteSavedData();
  check("each call is one request to the atlas's own routes", stub.sent, [
    "GET /api/account/saved", "GET /api/account/votes", "GET /api/account/leaderboard", "PUT /api/account/saved/Q214944?status=want",
    "DELETE /api/account/saved/Q214944", "PUT /api/account/votes/gobekli-tepe", "DELETE /api/account/votes/gobekli-tepe", "DELETE /api/account/data",
  ]);

  const store = createAccountStore(backend);
  await store.load();
  stub.status = 500;
  await store.setVote("Q214944", true);
  check("a failed request takes the change back", [store.getState().votes, store.getState().error, signedOut], [["Q12508"], ACCOUNT_ERRORS.change, 0]);
  stub.status = 401;
  await store.setSaved("Q12508", "want");
  check("a 401 takes the change back and says the session ended", [store.getState().saved, store.getState().error, signedOut], [{ Q12508: "visited" }, ACCOUNT_ERRORS.change, 1]);
  await store.deleteSavedData();
  check("a 401 on delete keeps the lists on screen", [store.getState().saved, store.getState().votes, signedOut], [{ Q12508: "visited" }, ["Q12508"], 2]);
  const signedOutStore = createAccountStore(backend);
  await signedOutStore.load();
  check("a 401 on the first read stays unloaded", [signedOutStore.getState().loaded, signedOutStore.getState().error], [false, ACCOUNT_ERRORS.load]);
}

// The server's routes, against a query runner that records each statement and answers as told.
function recordingRunner() {
  const runner = {
    statements: [] as { text: string; values: readonly unknown[] }[],
    rows: [] as Record<string, unknown>[],
    run: async (text: string, values: readonly unknown[]) => {
      runner.statements.push({ text, values });
      return { rows: runner.rows };
    },
  };
  return runner;
}

const OWN_ROUTES: [string, string[], string | null][] = [
  ["GET", ["saved"], null], ["GET", ["votes"], null], ["PUT", ["saved", "Q214944"], "want"], ["DELETE", ["saved", "Q214944"], null],
  ["PUT", ["votes", "Q214944"], null], ["DELETE", ["votes", "Q214944"], null], ["DELETE", ["data"], null], ["DELETE", ["account"], null],
];

async function ask(runner: ReturnType<typeof recordingRunner>, userId: string | null, method: string, path: string[], status: string | null = null) {
  let sessionReads = 0;
  const answer = await answerAccountRequest({ method, path, status }, { readUserId: async () => { sessionReads += 1; return userId; }, run: runner.run });
  return { ...answer, sessionReads };
}

{
  const runner = recordingRunner();
  for (const [method, path, status] of OWN_ROUTES) {
    check(`signed out, ${method} ${path.join("/")} is refused`, (await ask(runner, null, method, path, status)).status, 401);
  }
  check("a refused request runs no statement", runner.statements.length, 0);

  runner.rows = [{ site_id: "Q1", votes: 3 }];
  const totals = await ask(runner, null, "GET", ["leaderboard"]);
  check("the vote totals need no session, and no session is read for them", [totals.status, totals.sessionReads], [200, 0]);
  check("the vote totals are a site id and a count, nothing else", totals.body, { counts: [{ siteId: "Q1", votes: 3 }] });
  check("the vote totals are cut to the list's length", runner.statements[0].values, [LEADERBOARD_LENGTH]);
  check("the vote totals name no visitor", /user_id/.test(runner.statements[0].text), false);
}

{
  const runner = recordingRunner();
  runner.rows = [{ held: 0 }];
  for (const [method, path, status] of OWN_ROUTES) {
    check(`signed in, ${method} ${path.join("/")} is answered`, (await ask(runner, "visitor-a", method, path, status)).status, 200);
  }
  check("every statement names the session's visitor first", runner.statements.filter((statement) => statement.values[0] !== "visitor-a"), []);
  check("every statement is limited to that visitor", runner.statements.filter((statement) => !/user_id = \$1|values \(\$1,|^delete from neon_auth\."user" where id = \$1$/.test(statement.text)), []);
  check("no statement carries a value in its text", runner.statements.filter((statement) => /Q214944|visitor-a|'/.test(statement.text)), []);
  check("a read is cut to the most rows a visitor may hold", runner.statements[0].values, ["visitor-a", MOST_ROWS_PER_VISITOR]);

  const before = runner.statements.length;
  for (const refused of ["osm-node-1", "Not An Id", "37.2,38.9", "Q1;drop", "a".repeat(81)]) {
    check(`the server refuses the id ${refused.slice(0, 12)}`, [(await ask(runner, "visitor-a", "PUT", ["saved", refused], "want")).status, (await ask(runner, "visitor-a", "PUT", ["votes", refused])).status], [400, 400]);
  }
  check("the server refuses a status that is not one", (await ask(runner, "visitor-a", "PUT", ["saved", "Q1"], "owned")).status, 400);
  check("a save needs its status", (await ask(runner, "visitor-a", "PUT", ["saved", "Q1"])).status, 400);
  for (const [method, path] of [["GET", ["users"]], ["POST", ["saved"]], ["PUT", ["data"]], ["GET", ["saved", "Q1"]], ["PUT", ["saved", "Q1", "extra"]], ["DELETE", []]] as [string, string[]][]) {
    check(`no route ${method} ${path.join("/")}`, (await ask(runner, "visitor-a", method, path, "want")).status, 404);
  }
  check("a refused or unknown request runs no statement", runner.statements.length, before);

  runner.rows = [{ held: MOST_ROWS_PER_VISITOR }];
  check("a full account is told so", [(await ask(runner, "visitor-a", "PUT", ["saved", "Q1"], "want")).status, (await ask(runner, "visitor-a", "PUT", ["votes", "Q1"])).status], [409, 409]);
  check("a full account gains no row", runner.statements.slice(before).filter((statement) => /insert/.test(statement.text)), []);
}

check("a request from this site passes", isCrossSiteRequest("https://atlas.example", "atlas.example"), false);
check("a request with no Origin passes", isCrossSiteRequest(null, "atlas.example"), false);
check("a request from another site is refused", isCrossSiteRequest("https://elsewhere.example", "atlas.example"), true);
check("an Origin that is not an address is refused", isCrossSiteRequest("null", "atlas.example"), true);

// The vote list.
const counts = [
  { siteId: "Q3", votes: 2 }, { siteId: "Q1", votes: 9 }, { siteId: "Q2", votes: 2 }, { siteId: "stonehenge", votes: 5 },
  { siteId: "osm-node-1", votes: 50 }, { siteId: "Not An Id", votes: 40 }, { siteId: "Q4", votes: 0 }, { siteId: "Q5", votes: 1.5 }, { siteId: "Q6", votes: -3 },
];
check("most votes first, ties by id, rows that are not a site with votes dropped", orderVoteCounts(counts).map((count) => count.siteId), ["Q1", "stonehenge", "Q2", "Q3"]);
check("the list is cut to its length", orderVoteCounts(counts, 2).map((count) => count.siteId), ["Q1", "stonehenge"]);
check("the input is left as it was", counts[0].siteId, "Q3");
check("the list has a length", LEADERBOARD_LENGTH > 0 && LEADERBOARD_LENGTH <= 200, true);

// Wording: what is stored is said, and a vote is not called a ranking of importance or truth.
check("the sign-in names what is stored", ["email", "Google", "ids of the sites", "votes each site has is public"].filter((part) => !WHAT_AN_ACCOUNT_STORES.includes(part)), []);
check("the vote list says what a vote is not", ["favourites", "does not say how important"].filter((part) => !WHAT_A_VOTE_MEANS.includes(part)), []);
check("no ranking words", /\b(best|greatest|top|winner|proves?|ranking)\b/i.test(WHAT_A_VOTE_MEANS), false);

// The schema keeps the same id rule and stores no place.
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
check("the schema checks the id rule", schema.includes("'^(Q[0-9]+|[a-z0-9]+(-[a-z0-9]+)*)$'") && schema.includes("'^osm-'") && schema.includes("<= 80"), true);
check("rows go when the account goes", schema.match(/references neon_auth\."user" \(id\) on delete cascade/g)?.length, 2);
check("the schema has no column for a place or a name", /\b(lon|lat|latitude|longitude|geom|email|display_name)\b/i.test(schema.replace(/--.*$/gm, "")), false);

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
