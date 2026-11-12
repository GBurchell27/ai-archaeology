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
await page.waitForSelector("[data-thumb='start']");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

async function setBound(role, value) {
  await page.$eval(`[data-role='${role}']`, (element, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function setRange(start, end) {
  const currentEnd = Number(await page.evaluate(() => document.body.dataset.yearEnd));
  if (end >= currentEnd) {
    await setBound("year-end", end);
    await setBound("year-start", start);
  } else {
    await setBound("year-start", start);
    await setBound("year-end", end);
  }
  await page.waitForFunction((expectedStart, expectedEnd) => (
    document.body.dataset.yearStart === expectedStart && document.body.dataset.yearEnd === expectedEnd
  ), {}, String(start), String(end));
}

async function thumb(which) {
  return page.$eval(`[data-thumb='${which}']`, (element) => ({
    role: element.getAttribute("role"),
    min: element.getAttribute("aria-valuemin"),
    max: element.getAttribute("aria-valuemax"),
    now: element.getAttribute("aria-valuenow"),
    text: element.getAttribute("aria-valuetext"),
  }));
}

await setRange(-3000, 1100);
const start = await thumb("start");
const end = await thumb("end");
if (start.role !== "slider" || end.role !== "slider") fail(`thumbs are not sliders: ${start.role} ${end.role}`);
if (start.min !== "-12000" || start.max !== "1923" || end.min !== "-12000" || end.max !== "1923") {
  fail(`slider bounds are ${start.min}..${start.max}`);
}
if (start.now !== "-3000" || start.text !== "3000 BCE") fail(`start thumb reads ${start.now} ${start.text}`);
if (end.now !== "1100" || end.text !== "1100 CE") fail(`end thumb reads ${end.now} ${end.text}`);

await setRange(-1, -1);
await page.focus("[data-thumb='end']");
await page.keyboard.press("ArrowRight");
await page.waitForFunction(() => document.body.dataset.yearEnd === "1" && document.body.dataset.yearStart === "-1");
const crossed = await thumb("end");
const label = await page.$eval("[data-role='year-label']", (element) => element.textContent ?? "");
if (crossed.text !== "1 CE" || label.includes("0 CE")) fail(`crossing 1 BCE landed on ${crossed.text} / ${label}`);
await page.keyboard.press("ArrowLeft");
await page.waitForFunction(() => document.body.dataset.yearEnd === "-1");
const back = await thumb("end");
if (back.text !== "1 BCE") fail(`step back from 1 CE reads ${back.text}`);

await setRange(1000, 1000);
await page.focus("[data-thumb='end']");
await page.keyboard.press("PageUp");
await page.waitForFunction(() => document.body.dataset.yearEnd === "1010" && document.body.dataset.yearStart === "1000");
await page.keyboard.press("PageDown");
await page.waitForFunction(() => document.body.dataset.yearEnd === "1000");
await page.keyboard.press("End");
await page.waitForFunction(() => document.body.dataset.yearEnd === "1923");
await page.keyboard.press("Home");
await page.waitForFunction(() => document.body.dataset.yearEnd === "1000" && document.body.dataset.yearStart === "1000");
await page.focus("[data-thumb='start']");
await page.keyboard.press("ArrowRight");
await page.waitForFunction(() => document.body.dataset.yearStart === "1000" && document.body.dataset.yearEnd === "1000");
await page.focus("[data-thumb='end']");
await page.keyboard.press("ArrowLeft");
const years = await page.evaluate(() => ({ start: document.body.dataset.yearStart, end: document.body.dataset.yearEnd }));
if (years.start !== "1000" || years.end !== "1000") fail(`thumbs crossed: ${years.start}..${years.end}`);

if (process.exitCode) {
  await browser.close();
  process.exit(process.exitCode);
}
console.log(JSON.stringify({ ok: true }));
await browser.close();
