import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = new URL("..", import.meta.url);
const dir = join(root.pathname, "node_modules/.cache/safelink-test");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

function emit(filename, source) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  writeFileSync(join(dir, filename.replace(/\.tsx?$/, ".js")), output);
}

emit("externalHref.js", readFileSync(new URL("./lib/externalHref.ts", root), "utf8"));
const component = readFileSync(new URL("./components/SafeLink.tsx", root), "utf8")
  .replace('from "@/lib/externalHref"', 'from "./externalHref.js"');
emit("SafeLink.js", component);

const { SafeLink } = await import(pathToFileURL(join(dir, "SafeLink.js")).href);
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");

function markup(href) {
  return renderToStaticMarkup(createElement(SafeLink, { href }, "Place"));
}

let failed = 0;
function check(label, condition) {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const rejected = ["javascript:alert(1)", "data:text/html,hello", "https://evil.example/place", "http://en.wikipedia.org/wiki/Miletus"];
for (const href of rejected) {
  const html = markup(href);
  check(`${href} is not an anchor`, !html.includes("<a ") && html.includes("Place"));
}

const allowed = markup("https://en.wikipedia.org/wiki/Miletus");
check("an allowlisted host is an anchor", allowed.includes('href="https://en.wikipedia.org/wiki/Miletus"'));
check("the anchor sets noopener and noreferrer", allowed.includes('rel="noopener noreferrer"') && allowed.includes('target="_blank"'));

const stripped = markup("https://user:pass@pleiades.stoa.org/places/599799");
check("userinfo is not rendered", stripped.includes('href="https://pleiades.stoa.org/places/599799"') && !stripped.includes("user:pass"));

if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
