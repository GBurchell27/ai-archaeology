import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const PARTS = {
  meta: { file: "meta.json", type: "application/json" },
  height: { file: "height.u16", type: "application/octet-stream" },
  hillshade: { file: "hillshade.jpg", type: "image/jpeg" },
  satellite: { file: "satellite.jpg", type: "image/jpeg" },
} as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const longitude = Number(url.searchParams.get("lon"));
  const latitude = Number(url.searchParams.get("lat"));
  const part = url.searchParams.get("part") ?? "meta";
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return new Response("Missing coordinates", { status: 400 });
  }
  if (longitude < 25.5 || longitude > 45 || latitude < 35.8 || latitude > 42.2) {
    return new Response("Outside the Turkey window", { status: 400 });
  }
  if (!(part in PARTS)) {
    return new Response("Unknown part", { status: 400 });
  }
  const directory = path.join("/tmp/atlas-closeups", `${longitude.toFixed(4)}_${latitude.toFixed(4)}`);
  const ready = await stat(path.join(directory, "meta.json")).then(() => true).catch(() => false);
  if (!ready) {
    const python = process.env.ATLAS_PYTHON ?? "/workspace/.venv/bin/python";
    const script = path.join(process.cwd(), "scripts/closeup_window.py");
    const result = spawnSync(python, [script, "--lon", String(longitude), "--lat", String(latitude), "--out", directory], {
      timeout: 120000,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      return new Response(result.stderr || result.stdout || "Close-up failed", { status: 502 });
    }
  }
  const chosen = PARTS[part as keyof typeof PARTS];
  const body = await readFile(path.join(directory, chosen.file));
  return new Response(body, {
    headers: {
      "content-type": chosen.type,
      "cache-control": "public, max-age=86400",
    },
  });
}
