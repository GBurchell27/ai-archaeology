// Optional accounts, the pure part: config detection, site ids, the store against an in-memory database, the vote list's order.
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

const { ACCOUNT_CONFIG, readAccountConfig } = await import("../lib/account/accountConfig.ts");
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

// Config: both settings, or no accounts at all.
const project = "https://example-project.supabase.co";
check("both settings make a config", readAccountConfig({ url: project, anonKey: "public-key" }), { url: project, anonKey: "public-key" });
check("settings are trimmed", readAccountConfig({ url: ` ${project} `, anonKey: " public-key\n" }), { url: project, anonKey: "public-key" });
check("no settings, no accounts", readAccountConfig({}), null);
check("an address alone is not enough", readAccountConfig({ url: project }), null);
check("a key alone is not enough", readAccountConfig({ anonKey: "public-key" }), null);
check("empty strings count as absent", readAccountConfig({ url: "", anonKey: "" }), null);
check("an address that is not one is refused", readAccountConfig({ url: "example-project", anonKey: "public-key" }), null);
check("plain http is refused for a remote project", readAccountConfig({ url: "http://example-project.supabase.co", anonKey: "public-key" }), null);
check("plain http is allowed on this machine", readAccountConfig({ url: "http://127.0.0.1:54321", anonKey: "public-key" }) !== null, true);
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) check("without the settings the feature is off", ACCOUNT_CONFIG, null);

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

  database.failing = false;
  await store.setVote("Q214944", true);
  check("the next change that works clears the message", store.getState().error, null);
  await store.deleteSavedData();
  check("delete my saved data empties both", [store.getState().saved, store.getState().votes, database.saved.size, database.votes.size], [{}, [], 0, 0]);

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
const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
check("the schema checks the id rule", schema.includes("'^(Q[0-9]+|[a-z0-9]+(-[a-z0-9]+)*)$'") && schema.includes("'^osm-'") && schema.includes("<= 80"), true);
check("both tables are under row level security", schema.match(/enable row level security/g)?.length, 2);
check("rows go when the account goes", schema.match(/on delete cascade/g)?.length, 2);
check("the schema has no column for a place or a name", /\b(lon|lat|latitude|longitude|geom|email|display_name)\b/i.test(schema.replace(/--.*$/gm, "")), false);

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
