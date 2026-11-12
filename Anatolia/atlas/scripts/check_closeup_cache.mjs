import { chmod, lstat, mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { coalesce, createPrivateCache, evictCache, isSiteId, killOnTimeout, resolveCacheFile } from "../lib/closeupCache.ts";

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!isSiteId("Q233121") || !isSiteId("gobekli-tepe")) fail("published ids rejected");
if (isSiteId("../etc") || isSiteId("Q") || isSiteId("Q12/../../etc") || isSiteId("data:text/html,hi")) fail("unsafe id accepted");

const root = await mkdtemp(path.join(os.tmpdir(), "closeup-test-"));
await chmod(root, 0o700);
const mode = (await lstat(root)).mode & 0o777;
if (mode !== 0o700) fail(`cache mode ${mode.toString(8)}`);

const privateRoot = await createPrivateCache();
if (((await lstat(privateRoot)).mode & 0o777) !== 0o700) fail("private cache is not 0700");

const outside = await mkdtemp(path.join(os.tmpdir(), "closeup-outside-"));
await writeFile(path.join(outside, "meta.json"), "{\"secret\":true}\n");
await symlink(outside, path.join(root, "gobekli-tepe"));
try {
  await resolveCacheFile(root, "gobekli-tepe", "meta");
  fail("directory symlink was followed");
} catch (error) {
  if (!String(error).includes("symlink") && !String(error).includes("escaped")) fail(String(error));
}

await mkdir(path.join(root, "catalhoyuk"), { mode: 0o700 });
await symlink(path.join(outside, "meta.json"), path.join(root, "catalhoyuk", "meta.json"));
try {
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
if (signal !== "SIGKILL") fail(`timeout signal ${signal}`);

console.log(JSON.stringify({ ok: true }));
