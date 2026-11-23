import { register } from "node:module";

const root = new URL("../", import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
  const root = ${JSON.stringify(root)};
  export function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const bare = specifier.slice(2);
      const file = bare.includes(".") ? bare : bare + ".ts";
      return next(new URL(file, root).href);
    }
    return next(specifier, context);
  }
`)}`);

type Body = { size: number };
type PendingFetch = {
  url: string;
  signal: AbortSignal;
  finish(body: Body): void;
};

const created: string[] = [];
const revoked: string[] = [];
const fetches: PendingFetch[] = [];
let nextBlob = 0;

URL.createObjectURL = (() => {
  const url = `blob:mock-${++nextBlob}`;
  created.push(url);
  return url;
}) as typeof URL.createObjectURL;
URL.revokeObjectURL = ((url: string) => {
  revoked.push(url);
}) as typeof URL.revokeObjectURL;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const signal = init?.signal ?? new AbortController().signal;
  return new Promise((resolve, reject) => {
    const fail = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    if (signal.aborted) {
      fail();
      return;
    }
    const drop = () => signal.removeEventListener("abort", fail);
    signal.addEventListener("abort", fail, { once: true });
    fetches.push({
      url: String(input),
      signal,
      finish(body: Body) {
        drop();
        if (signal.aborted) {
          fail();
          return;
        }
        resolve({ ok: true, status: 200, blob: async () => body });
      },
    });
  });
}) as typeof fetch;

const { holdPhotograph, isPhotographAbort } = await import("../components/walk/photographObjectUrl.ts");

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const oneRecord = { size: 32 };
const gobekli = "/splats/gobekli-tepe.splat";

const first = holdPhotograph(gobekli);
const second = holdPhotograph(gobekli);
check("two views share one download", fetches.length === 1 && first.promise === second.promise);
fetches[0].finish(oneRecord);
const url = await first.promise;
check("the shared download is one object URL of the splat records", url === await second.promise && created.length === 1 && url.startsWith("blob:mock-"));
second.release();
check("one view leaving keeps the URL", revoked.length === 0 && fetches.length === 1);
first.release();
check("the last view revokes the URL", revoked.length === 1 && revoked[0] === url);

const again = holdPhotograph(gobekli);
check("a later visit reads the file again", fetches.length === 2);
fetches[1].finish(oneRecord);
check("the new visit gets a new object URL", (await again.promise) !== url && created.length === 2);
again.release();
check("leaving that visit revokes the new URL", revoked.length === 2);

const leaving = "/splats/karahan-tepe.splat";
const early = holdPhotograph(leaving);
const aborted = early.promise.then(() => "resolved", (error: unknown) => error);
const before = created.length;
early.release();
const abortError = await aborted;
check("leaving before the bytes arrive aborts and creates no URL", isPhotographAbort(abortError) && fetches.at(-1)?.signal.aborted === true && created.length === before);
fetches.at(-1)?.finish(oneRecord);
await new Promise((resolve) => setTimeout(resolve, 0));
check("a late body after the abort still creates no URL", created.length === before);

const third = holdPhotograph(leaving);
check("the aborted path is fetched again, not reused", fetches.filter((item) => item.url === leaving).length === 2);
fetches.at(-1)?.finish(oneRecord);
await third.promise;
third.release();

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
