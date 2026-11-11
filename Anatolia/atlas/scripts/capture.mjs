import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const outDir = process.env.ARTIFACT_DIR ?? new URL("../screenshots/", import.meta.url).pathname;
await mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--window-size=1440,900",
  ],
});
const page = await browser.newPage();
page.setDefaultTimeout(60000);
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    console.log("BROWSER", message.type(), message.text());
  }
});
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
page.on("response", (response) => {
  if (response.status() >= 400) console.log("HTTP", response.status(), response.url());
});
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:43127/", { waitUntil: "networkidle0" });
await page.waitForSelector("body[data-ready='true']");
await new Promise((resolve) => setTimeout(resolve, 4000));
await page.screenshot({ path: `${outDir}/atlas-turkey-both-layers.png` });
await page.screenshot({ path: `${outDir}/atlas-minimal-collapsed.png` });

await page.type("[data-role='search']", "Antioch");
await page.waitForSelector("[data-result='antioch']");
await page.click("[data-result='antioch']");
await page.waitForSelector("body[data-site='antioch']");
await page.waitForFunction(() => document.body.dataset.flying === "false");
await new Promise((resolve) => setTimeout(resolve, 1200));
await page.screenshot({ path: `${outDir}/atlas-antioch.png` });

await page.click("[data-action='close-panel']");
await page.type("[data-role='search']", "Göbekli");
await page.waitForSelector("[data-result='gobekli-tepe']");
await page.click("[data-result='gobekli-tepe']");
await page.waitForSelector("body[data-site='gobekli-tepe']");
await page.waitForFunction(() => document.body.dataset.flying === "false");
await new Promise((resolve) => setTimeout(resolve, 1500));
await page.screenshot({ path: `${outDir}/atlas-gobekli-panel.png` });

await page.click("[data-action='overview']");
await page.waitForFunction(() => document.body.dataset.panel === "closed" && document.body.dataset.flying === "false");
await page.click("[data-action='settings']");
await page.click("[data-layer-toggle='crusader']");
await page.click("[data-action='settings']");
await page.waitForFunction(() => document.body.dataset.crusader === "off" && document.body.dataset.settings === "closed");
await new Promise((resolve) => setTimeout(resolve, 800));
await page.screenshot({ path: `${outDir}/atlas-neolithic-only.png` });

const state = await page.evaluate(() => ({
  ready: document.body.dataset.ready,
  site: document.body.dataset.site,
  crusader: document.body.dataset.crusader,
  neolithic: document.body.dataset.neolithic,
  settings: document.body.dataset.settings,
  panel: document.body.dataset.panel,
}));
console.log(JSON.stringify(state, null, 2));
await browser.close();
