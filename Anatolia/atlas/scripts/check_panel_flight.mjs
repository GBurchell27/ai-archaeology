import { ATLAS_URL, launchBrowser, openAtlas } from "./atlasBrowser.mjs";

const browser = await launchBrowser({ width: 1280, height: 800 });
const page = await browser.newPage();
page.setDefaultTimeout(30000);
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
await page.setViewport({ width: 1280, height: 800 });
await openAtlas(page);
await new Promise((resolve) => setTimeout(resolve, 800));

async function search(text) {
  await page.$eval("[data-role='search']", (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
}

await search("Patara");
await page.waitForSelector("[data-result='Q233121']");
await page.$eval("[data-result='Q233121']", (element) => element.click());
await search("Ephesus");
await page.waitForSelector("[data-result='ephesus']");
await page.$eval("[data-result='ephesus']", (element) => element.click());
await page.waitForFunction(() => document.body.dataset.site === "ephesus" && !document.querySelector("[data-wiki]"));
const first = await page.evaluate(() => document.body.dataset.site);
if (first !== "ephesus") throw new Error(`rapid click kept ${first}`);

await page.keyboard.press("Escape");
await page.waitForFunction(() => document.body.dataset.site === "" && !document.querySelector("[data-wiki]"));

await search("Patara");
await page.waitForSelector("[data-result='Q233121']");
await page.$eval("[data-result='Q233121']", (element) => element.click());
await page.waitForSelector("[data-wiki='Q233121']");
await page.waitForFunction(() => document.body.dataset.flying === "true");
await page.$eval("[data-action='close-wiki']", (element) => element.click());
await page.waitForFunction(() => document.body.dataset.flying === "false" && !document.querySelector("[data-wiki]"), { timeout: 1000 });

// A resized window is not a zoom-out: the narrow overview stands far beyond the wide one, and must stay in the atlas.
const worldView = () => page.$eval("main", (element) => element.dataset.worldView);
await page.setViewport({ width: 390, height: 844 });
await page.$eval("[data-action='overview']", (element) => element.click());
await page.waitForFunction(() => document.body.dataset.flying === "true");
await page.waitForFunction(() => document.body.dataset.flying === "false");
await page.setViewport({ width: 1280, height: 800 });
await new Promise((resolve) => setTimeout(resolve, 1500));
if (await worldView() !== "atlas") throw new Error("resizing the window left the atlas for the globe");

// Entered from a globe site card, the opening flight starts above that place, not aimed at the map centre.
const cameraTarget = () => page.evaluate(() => window.__atlasControls?.target.toArray() ?? null);
await page.goto(ATLAS_URL.replace("view=atlas", "view=globe&site=Q1328958"), { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-action='open-in-atlas']");
await page.$eval("[data-action='open-in-atlas']", (element) => element.click());
await page.waitForFunction(() => window.__atlasControls);
const opening = await cameraTarget();
await page.waitForSelector("[data-wiki='Q1328958']");
await page.waitForFunction(() => document.body.dataset.flying === "false");
const arrived = await cameraTarget();
const startOffset = Math.hypot(opening[0] - arrived[0], opening[2] - arrived[2]);
if (startOffset > 60000) throw new Error(`the opening flight began ${Math.round(startOffset / 1000)} km from its place`);

console.log(JSON.stringify({ ok: true }));
await browser.close();
