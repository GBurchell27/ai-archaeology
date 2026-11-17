import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PublishedPoint } from "./closeupCatalog.ts";

const PARTS = {
  meta: { file: "meta.json", type: "application/json" },
  height: { file: "height.u16", type: "application/octet-stream" },
  hillshade: { file: "hillshade.jpg", type: "image/jpeg" },
  satellite: { file: "satellite.jpg", type: "image/jpeg" },
} as const;

export type CloseupPart = keyof typeof PARTS;
export type TerrainSource = "gem15" | "copernicus";

export function terrainSource(value: string | null): TerrainSource {
  return value === "copernicus" ? "copernicus" : "gem15";
}

const SITE_ID = /^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function isSiteId(value: string): boolean {
  return value.length <= 80 && SITE_ID.test(value);
}

export function isCloseupPart(value: string): value is CloseupPart {
  // Own keys only: "constructor" and "__proto__" are `in` every object.
  return Object.hasOwn(PARTS, value);
}

type Point = PublishedPoint;
export type PointLookup = (id: string) => Promise<Point | undefined>;

// Web Mercator stretches without bound towards the poles. The worker refuses the same range.
const MAX_LATITUDE = 80;

let rootPromise: Promise<string> | null = null;
const inflight = new Map<string, Promise<unknown>>();
let active = 0;
const waiters: Array<() => void> = [];

function concurrencyLimit(): number {
  const parsed = Number(process.env.ATLAS_CLOSEUP_CONCURRENCY ?? 2);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
}

function byteCap(): number {
  const parsed = Number(process.env.ATLAS_CLOSEUP_MAX_BYTES ?? 64 * 1024 * 1024);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 64 * 1024 * 1024;
}

/** Builds waiting for a worker beyond this are refused: the world catalogue has over 100,000 valid ids to ask for. */
export const CLOSEUP_QUEUE_LIMIT = 8;

function acquire(): Promise<void> {
  if (active < concurrencyLimit()) {
    active += 1;
    return Promise.resolve();
  }
  if (waiters.length >= CLOSEUP_QUEUE_LIMIT) return Promise.reject(new Error("close-up-busy"));
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

function release(): void {
  active -= 1;
  const next = waiters.shift();
  if (next) next();
}

/** One build per id. Further callers share that promise. A concurrency cap covers different ids. */
export function coalesce<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const run = (async () => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  })();
  inflight.set(key, run);
  void run.finally(() => {
    if (inflight.get(key) === run) inflight.delete(key);
  }).catch(() => undefined);
  return run;
}

export async function createPrivateCache(preferred?: string): Promise<string> {
  if (preferred) {
    await mkdir(preferred, { recursive: true, mode: 0o700 });
    await chmod(preferred, 0o700);
    const info = await lstat(preferred);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("cache root is not a real directory");
    return preferred;
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), "atlas-closeups-"));
  await chmod(directory, 0o700);
  return directory;
}

function cacheRoot(): Promise<string> {
  if (!rootPromise) {
    rootPromise = createPrivateCache(process.env.ATLAS_CLOSEUP_DIR);
  }
  return rootPromise;
}

export async function resolveCacheFile(root: string, id: string, part: CloseupPart): Promise<string> {
  if (!isSiteId(id)) throw new Error("bad id");
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error("cache root is not a real directory");
  const rootReal = await realpathDirectory(root);
  const site = path.join(rootReal, id);
  const fileName = PARTS[part].file;
  const relative = path.relative(rootReal, path.join(site, fileName));
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("cache path escaped");
  let siteInfo: Awaited<ReturnType<typeof lstat>> | null = null;
  try {
    siteInfo = await lstat(site);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (siteInfo?.isSymbolicLink()) throw new Error("refusing a symlinked cache entry");
  if (siteInfo && !siteInfo.isDirectory()) throw new Error("cache entry is not a directory");
  if (siteInfo) {
    const siteReal = await realpathDirectory(site);
    if (siteReal !== site) throw new Error("cache path escaped");
  }
  const target = path.join(site, fileName);
  try {
    const fileInfo = await lstat(target);
    if (fileInfo.isSymbolicLink() || !fileInfo.isFile()) throw new Error("refusing a symlinked cache file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return target;
}

async function realpathDirectory(directory: string): Promise<string> {
  return realpath(directory);
}

async function directoryBytes(directory: string): Promise<number> {
  let total = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    const info = await lstat(full);
    if (info.isSymbolicLink()) continue;
    if (info.isDirectory()) total += await directoryBytes(full);
    else if (info.isFile()) total += info.size;
  }
  return total;
}

export async function evictCache(root: string, keepId: string, maxBytes = byteCap()): Promise<void> {
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error("cache root is not a real directory");
  const entries = await readdir(root, { withFileTypes: true });
  const sites: { name: string; mtimeMs: number; bytes: number }[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    const info = await lstat(full);
    if (info.isSymbolicLink()) {
      await rm(full, { force: true });
      continue;
    }
    if (!info.isDirectory() || !isSiteId(entry.name)) continue;
    sites.push({ name: entry.name, mtimeMs: info.mtimeMs, bytes: await directoryBytes(full) });
  }
  sites.sort((left, right) => left.mtimeMs - right.mtimeMs);
  let total = sites.reduce((sum, site) => sum + site.bytes, 0);
  for (const site of sites) {
    if (total <= maxBytes) break;
    if (site.name === keepId) continue;
    const full = path.join(root, site.name);
    const info = await lstat(full);
    if (info.isSymbolicLink() || !info.isDirectory()) continue;
    await rm(full, { recursive: true, force: true });
    total -= site.bytes;
  }
}

/** SIGTERM when the timer fires, then SIGKILL if the process is still alive. Returns a cancel function. */
export function killOnTimeout(child: ChildProcess, timeoutMs: number, graceMs: number): () => void {
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const termTimer = setTimeout(() => {
    child.kill("SIGTERM");
    killTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }, graceMs);
  }, timeoutMs);
  const cancel = () => {
    clearTimeout(termTimer);
    if (killTimer) clearTimeout(killTimer);
  };
  child.once("close", cancel);
  return cancel;
}

/** ATLAS_PYTHON wins. Otherwise the repo venv, which sits two folders above the atlas app. */
export function pythonCommand(): string {
  if (process.env.ATLAS_PYTHON) return process.env.ATLAS_PYTHON;
  const venv = path.resolve(process.cwd(), "..", "..", ".venv");
  const local = process.platform === "win32" ? path.join(venv, "Scripts", "python.exe") : path.join(venv, "bin", "python");
  return existsSync(local) ? local : "/workspace/.venv/bin/python";
}

function runWorker(command: string, args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    const cancelKill = killOnTimeout(child, 120_000, 5_000);
    const cap = 32_000;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdoutBytes < cap) stdout.push(chunk);
      stdoutBytes += chunk.length;
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderrBytes < cap) stderr.push(chunk);
      stderrBytes += chunk.length;
    });
    child.on("error", (error) => {
      cancelKill();
      reject(error);
    });
    child.on("close", (status) => {
      resolve({
        status,
        stdout: Buffer.concat(stdout).toString("utf8").slice(0, cap),
        stderr: Buffer.concat(stderr).toString("utf8").slice(0, cap),
      });
    });
  });
}

async function ensureBuilt(root: string, id: string, point: Point, source: TerrainSource): Promise<void> {
  const cacheId = source === "copernicus" ? `${id}-glo30` : id;
  const meta = await resolveCacheFile(root, cacheId, "meta");
  if (await stat(meta).then(() => true).catch(() => false)) return;
  await coalesce(`${source}:${id}`, async () => {
    if (await stat(meta).then(() => true).catch(() => false)) return;
    const siteDir = path.dirname(meta);
    await mkdir(siteDir, { recursive: true, mode: 0o700 });
    await chmod(siteDir, 0o700);
    const created = await lstat(siteDir);
    if (created.isSymbolicLink() || !created.isDirectory()) throw new Error("refusing a symlinked cache entry");
    const python = pythonCommand();
    const script = path.join(process.cwd(), "scripts", "closeup_window.py");
    const result = await runWorker(python, [
      script,
      "--lon", String(point.longitude),
      "--lat", String(point.latitude),
      "--out", siteDir,
      "--source", source,
    ]);
    if (result.status !== 0) {
      console.error("close-up worker failed", id, result.status, result.stdout, result.stderr);
      throw new Error("close-up-failed");
    }
  });
}

/** `findPoint` is the only way in for coordinates: the request carries a published id, never lon/lat. */
export async function readCloseup(requestUrl: string, findPoint: PointLookup): Promise<{ status: number; body: Buffer | string; contentType: string }> {
  const url = new URL(requestUrl);
  if (url.searchParams.has("lon") || url.searchParams.has("lat")) {
    return { status: 400, body: "bad-request", contentType: "text/plain" };
  }
  const id = url.searchParams.get("id") ?? "";
  const part = url.searchParams.get("part") ?? "meta";
  const source = terrainSource(url.searchParams.get("terrain"));
  if (!isSiteId(id) || !isCloseupPart(part)) {
    return { status: 400, body: "bad-request", contentType: "text/plain" };
  }
  const point = await findPoint(id);
  if (!point || Math.abs(point.latitude) > MAX_LATITUDE) {
    return { status: 404, body: "not-found", contentType: "text/plain" };
  }
  try {
    const root = await cacheRoot();
    await ensureBuilt(root, id, point, source);
    const cacheId = source === "copernicus" ? `${id}-glo30` : id;
    const file = await resolveCacheFile(root, cacheId, part);
    const body = await readFile(file);
    const now = new Date();
    await utimes(path.dirname(file), now, now);
    await evictCache(root, cacheId);
    return { status: 200, body, contentType: PARTS[part].type };
  } catch (error) {
    console.error("close-up failed", id, error instanceof Error ? error.message : "error");
    return { status: 502, body: "close-up-failed", contentType: "text/plain" };
  }
}
