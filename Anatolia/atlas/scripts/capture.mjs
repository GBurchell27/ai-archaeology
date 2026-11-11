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
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
page.on("console", (message) => {
  if (message.type() === "error") console.log("BROWSER", message.text());
});

async function flyTo(name, resultId) {
  if (await page.$("[data-action='close-panel']")) {
    await page.click("[data-action='close-panel']");
  }
  await page.$eval("[data-role='search']", (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, name);
  await page.waitForSelector(`[data-result='${resultId}']`);
  await page.click(`[data-result='${resultId}']`);
  await page.waitForSelector(`body[data-site='${resultId}']`);
  await page.waitForFunction(() => document.body.dataset.flying === "false");
  await new Promise((resolve) => setTimeout(resolve, 900));
}

async function setRange(role, value) {
  await page.$eval(`[data-role='${role}']`, (element, next) => {
    element.value = String(next);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:43127/", { waitUntil: "networkidle0" });
await page.waitForSelector("body[data-ready='true']");
await new Promise((resolve) => setTimeout(resolve, 2500));
await page.screenshot({ path: `${outDir}/atlas-turkey-tilted.png` });
await page.evaluate(async () => {
  const meta = await fetch("/terrain/metadata.json").then((response) => response.json());
  const radius = 6378137;
  const mercator = (longitude, latitude) => [
    radius * longitude * Math.PI / 180,
    radius * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)),
  ];
  const origin = [(meta.bounds[0] + meta.bounds[2]) / 2, (meta.bounds[1] + meta.bounds[3]) / 2];
  const [east, north] = mercator(38.95, 37.18);
  const x = east - origin[0];
  const z = -(north - origin[1]);
  const y = 2800;
  window.__atlasCamera.position.set(x + 6000, y + 42000, z + 62000);
  window.__atlasControls.target.set(x, y, z);
  window.__atlasControls.update();
});
await new Promise((resolve) => setTimeout(resolve, 700));
await page.screenshot({ path: `${outDir}/atlas-sanliurfa-cluster.png` });

await flyTo("Antioch", "antioch");
await page.screenshot({ path: `${outDir}/atlas-antioch.png` });

await flyTo("Edessa", "edessa");
await flyTo("Constantinople", "constantinople");
await page.screenshot({ path: `${outDir}/atlas-constantinople.png` });

await flyTo("Göbekli", "gobekli-tepe");
await page.click("[data-action='settings']");
await setRange("azimuth", 140);
await setRange("exaggeration", 14);
await setRange("exaggeration", 8);
const controls = await page.evaluate(() => ({
  azimuth: document.querySelector("[data-role='azimuth']").value,
  exaggeration: document.querySelector("[data-role='exaggeration']").value,
}));
await page.click("[data-action='settings']");
await page.click("[data-detail-layer='hillshade']");
await page.click("[data-role='compare']");
await page.select("[data-role='compare-layer']", "true-colour");
await setRange("swipe", 42);
await new Promise((resolve) => setTimeout(resolve, 700));
await page.screenshot({ path: `${outDir}/atlas-swipe.png` });

await page.setViewport({ width: 390, height: 844 });
await page.click("[data-action='overview']");
await page.waitForFunction(() => document.body.dataset.flying === "false" && document.body.dataset.panel === "closed");
await new Promise((resolve) => setTimeout(resolve, 900));
await page.screenshot({ path: `${outDir}/atlas-phone.png` });

console.log(JSON.stringify({ controls, site: await page.evaluate(() => document.body.dataset.site) }, null, 2));
await browser.close();
