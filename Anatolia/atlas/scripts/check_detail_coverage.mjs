import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const outDir = process.env.CHECK_DIR ?? "/tmp/atlas-detail-check";
await mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1440,900"],
});
const page = await browser.newPage();
page.setDefaultTimeout(90000);
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:43127/", { waitUntil: "networkidle0" });
await page.waitForSelector("body[data-ready='true']");
await new Promise((resolve) => setTimeout(resolve, 1600));
await page.$eval("[data-action='settings']", (element) => element.click());
const wikiToggle = await page.$("[data-layer-toggle='wikidata']");
if (wikiToggle) {
  await page.$eval("[data-layer-toggle='wikidata']", (element) => {
    if (element.checked) element.click();
  });
}
await page.$eval("[data-action='settings']", (element) => element.click());

const overview = await page.evaluate(async () => {
  const camera = window.__atlasCamera;
  const target = window.__atlasControls?.target;
  const terrain = await fetch("/terrain/metadata.json").then((response) => response.json());
  const halfWidth = (terrain.bounds[2] - terrain.bounds[0]) / 2;
  const west = camera.position.clone().set(-halfWidth, 0, 0).project(camera);
  const east = camera.position.clone().set(halfWidth, 0, 0).project(camera);
  return {
    west: west.x,
    east: east.x,
    targetOffset: Math.hypot(target.x, target.z),
  };
});
if (overview.west < -1 || overview.east > 1 || overview.targetOffset > 1000) {
  throw new Error(`Overview does not fit the Turkey terrain (${JSON.stringify(overview)})`);
}
if (process.env.ARTIFACT_DIR) {
  await page.screenshot({ path: `${process.env.ARTIFACT_DIR}/atlas-turkey-tilted.png` });
}

async function flyTo(name, resultId) {
  if (await page.$("[data-action='close-panel']")) {
    await page.$eval("[data-action='close-panel']", (element) => element.click());
  }
  await page.$eval("[data-role='search']", (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, name);
  await page.waitForSelector(`[data-result='${resultId}']`);
  await page.evaluate(() => {
    document.body.dataset.detail = "pending";
  });
  await page.$eval(`[data-result='${resultId}']`, (element) => element.click());
  await page.waitForFunction(
    (siteId) => document.body.dataset.site === siteId && document.body.dataset.detail === "ready",
    { timeout: 25000 },
    resultId,
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

for (const [name, id, file] of [
  ["Antioch", "antioch", "antioch.png"],
  ["Rumkale", "rumkale", "rumkale.png"],
  ["Bodrum", "bodrum-petronion", "bodrum.png"],
]) {
  await flyTo(name, id);
  await page.screenshot({ path: `${outDir}/${file}` });
  if (process.env.ARTIFACT_DIR) {
    const artifact = id === "bodrum-petronion" ? "atlas-bodrum.png" : `atlas-${id}.png`;
    await page.screenshot({ path: `${process.env.ARTIFACT_DIR}/${artifact}` });
  }
}

console.log(JSON.stringify({ outDir, overview }));
await browser.close();
