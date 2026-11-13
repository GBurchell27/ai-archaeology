import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AtlasApp } from "@/components/AtlasApp";
import type { RegionalTerrain } from "@/lib/types";

export default async function Page() {
  const path = join(process.cwd(), "public", "terrain", "regions", "sanliurfa", "metadata.json");
  const regional = await readFile(path, "utf8")
    .then((contents) => JSON.parse(contents) as RegionalTerrain)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
  return <AtlasApp regional={regional} />;
}
