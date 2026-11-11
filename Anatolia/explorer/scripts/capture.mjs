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
page.setDefaultTimeout(30000);
page.on("console", (message) => console.log("BROWSER", message.type(), message.text()));
page.on("response", (response) => {
  if (response.status() >= 400) console.log("HTTP", response.status(), response.url());
});
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:43123/", { waitUntil: "networkidle0" });
await page.waitForSelector("body[data-ready='true']");
await new Promise((resolve) => setTimeout(resolve, 800));
await page.screenshot({ path: `${outDir}/sanliurfa-region.png` });

await page.click("[data-site-id='gobekli-tepe']");
await page.waitForSelector("body[data-site='gobekli-tepe']");
await page.waitForSelector("body[data-detail='ready']");
await page.waitForFunction(() => document.body.dataset.flying === "false");
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: `${outDir}/sanliurfa-gobekli-panel.png` });

await page.click("input[data-layer-id='local-relief']");
await page.waitForFunction(() => document.body.dataset.layerReady === "true");
await page.click("[data-role='compare']");
await page.select("[data-role='compare-layer']", "true-colour");
await page.$eval("[data-role='swipe']", (input) => {
  input.value = "48";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction(() => document.body.dataset.compare === "on" && document.body.dataset.layerReady === "true");
await new Promise((resolve) => setTimeout(resolve, 500));
await page.screenshot({ path: `${outDir}/sanliurfa-layer-compare.png` });

const state = await page.evaluate(() => ({
  ready: document.body.dataset.ready,
  site: document.body.dataset.site,
  layer: document.body.dataset.layer,
  compare: document.body.dataset.compare,
  panel: document.querySelector("#panel")?.innerText.slice(0, 500),
  credit: document.querySelector("#credit")?.innerText,
  honest: document.querySelector("#honest")?.textContent,
}));
console.log(JSON.stringify(state, null, 2));
await browser.close();
