import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1280,800"],
});
const page = await browser.newPage();
page.setDefaultTimeout(30000);
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
await page.setViewport({ width: 1280, height: 800 });
await page.goto("http://127.0.0.1:43127/", { waitUntil: "networkidle0" });
await page.waitForSelector("body[data-ready='true']");
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

console.log(JSON.stringify({ ok: true }));
await browser.close();
