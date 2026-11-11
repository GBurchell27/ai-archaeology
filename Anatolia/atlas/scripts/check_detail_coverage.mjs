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

const overview = await page.evaluate(() => {
  const camera = window.__atlasCamera;
  const target = window.__atlasControls?.target;
  return {
    cameraZ: camera?.position.z ?? 0,
    targetZ: target?.z ?? 0,
  };
});
if (overview.cameraZ < 400000 || overview.targetZ < 50000) {
  throw new Error(`Overview is not aimed at the southern pin clusters (${JSON.stringify(overview)})`);
}
if (process.env.ARTIFACT_DIR) {
  await page.screenshot({ path: `${process.env.ARTIFACT_DIR}/atlas-turkey-tilted.png` });
}

async function flyTo(name, resultId) {
  if (await page.$("[data-action='close-panel']")) {
    await page.click("[data-action='close-panel']");
    await new Promise((resolve) => setTimeout(resolve, 200));
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
  await new Promise((resolve) => setTimeout(resolve, 1400));
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
