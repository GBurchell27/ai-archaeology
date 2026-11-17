// Shared by the browser-driven atlas checks: finds a Chromium browser, launches it, opens the Anatolia atlas.
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

/** The Anatolia terrain atlas; the bare root is the world globe. */
export const ATLAS_URL = process.env.ATLAS_URL ?? "http://127.0.0.1:43127/?view=atlas";
/** Exit status the pytest wrappers read as "skip": no browser, or no dev server. */
export const SKIP_EXIT_CODE = 77;

const WINDOWS_ROOTS = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
const BROWSER_CANDIDATES = [
  ...WINDOWS_ROOTS.map((root) => join(root, "Google", "Chrome", "Application", "chrome.exe")),
  ...WINDOWS_ROOTS.map((root) => join(root, "Microsoft", "Edge", "Application", "msedge.exe")),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
];

/** ATLAS_CHROME wins; otherwise the first installed Chrome, Chromium or Edge. */
export function findBrowser() {
  const chosen = process.env.ATLAS_CHROME;
  if (chosen) return existsSync(chosen) ? chosen : null;
  return BROWSER_CANDIDATES.find((path) => existsSync(path)) ?? null;
}

export function scratchDir(name) {
  return join(tmpdir(), name);
}

function skip(reason) {
  console.error(`SKIP: ${reason}`);
  process.exit(SKIP_EXIT_CODE);
}

/** Launches a headless browser with software WebGL, so the checks render the same with or without a GPU. */
export async function launchBrowser({ width = 1280, height = 800 } = {}) {
  const executablePath = findBrowser();
  if (!executablePath) skip("no Chrome, Chromium or Edge found. Set ATLAS_CHROME to a browser executable.");
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      `--window-size=${width},${height}`,
    ],
  });
  // A check that throws never reaches browser.close(); a leaked software-GL browser starves the next run.
  process.on("exit", () => browser.process()?.kill());
  return browser;
}

/** Opens the atlas and waits until its terrain has loaded. `query` adds parameters such as `&site=<id>`. */
export async function openAtlas(page, query = "") {
  try {
    await page.goto(ATLAS_URL + query, { waitUntil: "networkidle0" });
  } catch (error) {
    if (!String(error).includes("ERR_CONNECTION_REFUSED")) throw error;
    await page.browser().close();
    skip(`no dev server at ${ATLAS_URL}. Start it with npm run dev in Anatolia/atlas.`);
  }
  await page.waitForSelector("body[data-ready='true']");
}
