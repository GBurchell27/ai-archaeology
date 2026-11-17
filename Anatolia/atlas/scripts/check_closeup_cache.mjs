import { chmod, lstat, mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { CLOSEUP_QUEUE_LIMIT, coalesce, createPrivateCache, evictCache, isSiteId, killOnTimeout, pythonCommand, readCloseup, resolveCacheFile } from "../lib/closeupCache.ts";
import { findPublishedPoint } from "../lib/closeupCatalog.ts";

// Windows has no POSIX modes or signals, and symlinks need a privilege most accounts lack.
const windows = process.platform === "win32";

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!isSiteId("Q233121") || !isSiteId("gobekli-tepe")) fail("published ids rejected");
if (isSiteId("../etc") || isSiteId("Q") || isSiteId("Q12/../../etc") || isSiteId("data:text/html,hi")) fail("unsafe id accepted");
if (!isSiteId("osm-n10000046088") || !isSiteId("579885")) fail("world ids rejected");
// The detail shard is named after the id's last two characters, so nothing path-shaped may pass.
const pathShaped = ["..", ".", "a/b", "a\\b", "Q1/..", "Q1..", "a.b", "%2e%2e", "A1", "-a", "a-", "a--b", "", " ", "Q1\n", "Q1\0", "c:", "x".repeat(81)];
const accepted = pathShaped.filter(isSiteId);
if (accepted.length) fail(`path-shaped ids accepted: ${JSON.stringify(accepted)}`);

const root = await mkdtemp(path.join(os.tmpdir(), "closeup-test-"));
await chmod(root, 0o700);
const mode = (await lstat(root)).mode & 0o777;
if (!windows && mode !== 0o700) fail(`cache mode ${mode.toString(8)}`);

const privateRoot = await createPrivateCache();
if (!windows && ((await lstat(privateRoot)).mode & 0o777) !== 0o700) fail("private cache is not 0700");

const outside = await mkdtemp(path.join(os.tmpdir(), "closeup-outside-"));
await writeFile(path.join(outside, "meta.json"), "{\"secret\":true}\n");
const linkable = await symlink(outside, path.join(root, "gobekli-tepe"), "dir").then(() => true, (error) => {
  if (windows && error.code === "EPERM") return false;
  throw error;
});
if (linkable) try {
  await resolveCacheFile(root, "gobekli-tepe", "meta");
  fail("directory symlink was followed");
} catch (error) {
  if (!String(error).includes("symlink") && !String(error).includes("escaped")) fail(String(error));
}

await mkdir(path.join(root, "catalhoyuk"), { mode: 0o700 });
if (linkable) await symlink(path.join(outside, "meta.json"), path.join(root, "catalhoyuk", "meta.json"));
if (linkable) try {
  await resolveCacheFile(root, "catalhoyuk", "meta");
  fail("file symlink was followed");
} catch (error) {
  if (!String(error).includes("symlink") && !String(error).includes("escaped")) fail(String(error));
}
const outsideText = await import("node:fs/promises").then((fs) => fs.readFile(path.join(outside, "meta.json"), "utf8"));
if (!outsideText.includes("secret")) fail("outside file changed");

await mkdir(path.join(root, "ephesus"), { mode: 0o700 });
await writeFile(path.join(root, "ephesus", "meta.json"), "{}\n");
const resolved = await resolveCacheFile(root, "ephesus", "meta");
if (!resolved.endsWith(`${path.sep}ephesus${path.sep}meta.json`)) fail(resolved);

process.env.ATLAS_CLOSEUP_CONCURRENCY = "2";
let calls = 0;
const shared = () => coalesce("Q1", async () => {
  calls += 1;
  await new Promise((resolve) => setTimeout(resolve, 30));
  return calls;
});
const [first, second] = await Promise.all([shared(), shared()]);
if (first !== 1 || second !== 1 || calls !== 1) fail(`dedupe ${first} ${second} ${calls}`);

let active = 0;
let peak = 0;
await Promise.all([1, 2, 3].map((item) => coalesce(`job-${item}`, async () => {
  active += 1;
  peak = Math.max(peak, active);
  await new Promise((resolve) => setTimeout(resolve, 40));
  active -= 1;
})));
if (peak > 2) fail(`concurrency ${peak}`);

// A flood of different ids: two build, CLOSEUP_QUEUE_LIMIT wait, the rest are refused at once.
const flood = await Promise.allSettled(Array.from({ length: 2 + CLOSEUP_QUEUE_LIMIT + 3 }, (_, item) =>
  coalesce(`flood-${item}`, () => new Promise((resolve) => setTimeout(resolve, 20)))));
const refused = flood.filter((outcome) => outcome.status === "rejected").length;
if (refused !== 3) fail(`a flood of ids queued without bound: ${refused} refused`);
if (await coalesce("after-flood", async () => "built") !== "built") fail("the queue did not recover after a flood");

const older = path.join(root, "harran");
const newer = path.join(root, "troy");
await mkdir(older, { mode: 0o700 });
await mkdir(newer, { mode: 0o700 });
await writeFile(path.join(older, "height.u16"), Buffer.alloc(80));
await writeFile(path.join(newer, "height.u16"), Buffer.alloc(80));
const past = new Date(Date.now() - 60_000);
await import("node:fs/promises").then((fs) => fs.utimes(older, past, past));
await evictCache(root, "troy", 100);
if (await lstat(older).then(() => true).catch(() => false)) fail("old cache entry was kept");
if (!await lstat(newer).then(() => true).catch(() => false)) fail("kept cache entry was evicted");

const sleeper = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setTimeout(() => {}, 30000);"]);
killOnTimeout(sleeper, 40, 80);
const signal = await new Promise((resolve) => sleeper.once("close", (_code, ended) => resolve(ended)));
if (signal !== (windows ? "SIGTERM" : "SIGKILL")) fail(`timeout signal ${signal}`);

const world = await mkdtemp(path.join(os.tmpdir(), "closeup-world-"));
await mkdir(path.join(world, "detail"));
await writeFile(path.join(world, "detail", "99.json"), JSON.stringify({ Q99: { lon: -70.5, lat: -12.25 }, Q199: { lon: "x", lat: 1 } }));
const far = await findPublishedPoint("Q99", world);
if (far?.longitude !== -70.5 || far?.latitude !== -12.25) fail(`world shard lookup ${JSON.stringify(far)}`);
if (await findPublishedPoint("Q199", world)) fail("non-numeric point accepted");
if (await findPublishedPoint("Q299", world)) fail("id missing from its shard was found");
if (await findPublishedPoint("Q12345", world)) fail("missing shard did not read as not found");
if (await findPublishedPoint("constructor", world)) fail("prototype key read as a site");
if (!await findPublishedPoint("gobekli-tepe", world)) fail("Anatolia catalogue lost a site");

// Ids that never pass isSiteId still cannot make the shard lookup leave the detail folder.
await writeFile(path.join(world, "et.json"), JSON.stringify({ "../et": { lon: 5, lat: 5 }, "..": { lon: 5, lat: 5 } }));
await writeFile(path.join(world, "..json"), JSON.stringify({ "..": { lon: 5, lat: 5 } }));
for (const hostile of ["..", "../et", "detail/../et", "a/..", "/x", "\\x", "x/", "99/../99"]) {
  if (await findPublishedPoint(hostile, world).catch(() => undefined)) fail(`shard lookup left the detail folder for ${hostile}`);
}

if ((await readCloseup("http://x/api/closeup?id=Q99&lon=1&lat=2", findPublishedPoint)).status !== 400) fail("raw coordinates accepted");
let lookups = 0;
const countingLookup = (id) => { lookups += 1; return findPublishedPoint(id, world); };
for (const query of ["id=..%2F..%2Fetc", "id=..", "id=Q99%2F..%2FQ99", "id=Q99&part=..%2Fmeta.json", "id=Q99&part=__proto__", "id=", "part=meta"]) {
  if ((await readCloseup(`http://x/api/closeup?${query}`, countingLookup)).status !== 400) fail(`${query} was not refused`);
}
if (lookups !== 0) fail("a refused request still reached the catalogue");
if ((await readCloseup("http://x/api/closeup?id=zz-not-a-published-site", (id) => findPublishedPoint(id))).status !== 404) fail("unknown id is not a 404");

process.env.ATLAS_PYTHON = "custom-python";
if (pythonCommand() !== "custom-python") fail("ATLAS_PYTHON ignored");
delete process.env.ATLAS_PYTHON;
if (!/[\\/](?:Scripts[\\/]python\.exe|bin[\\/]python)$/.test(pythonCommand())) fail(`default python ${pythonCommand()}`);

console.log(JSON.stringify({ ok: true, symlinkChecks: linkable }));
