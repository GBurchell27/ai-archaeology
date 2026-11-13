import { reliefLoadFailure, readStoredReliefSource, storeReliefSource } from "../lib/terrainSource.ts";

const missing = reliefLoadFailure(404);
const failed = reliefLoadFailure(502);
if (!missing.panelOpen || missing.detailState !== "error" || !missing.message.includes("missing")) {
  throw new Error(`404 outcome ${JSON.stringify(missing)}`);
}
if (!failed.panelOpen || failed.detailState !== "error" || !failed.message.includes("did not load")) {
  throw new Error(`502 outcome ${JSON.stringify(failed)}`);
}

const memory = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    },
  },
});
if (readStoredReliefSource() !== "gem15") throw new Error("default relief is gem15");
storeReliefSource("copernicus");
if (readStoredReliefSource() !== "copernicus") throw new Error("copernicus choice did not persist");
storeReliefSource("gem15");
if (readStoredReliefSource() !== "gem15") throw new Error("gem15 choice did not persist");

console.log(JSON.stringify({ ok: true }));
