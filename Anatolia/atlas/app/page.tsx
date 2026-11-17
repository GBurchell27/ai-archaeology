import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WorldCoordinator } from "@/components/WorldCoordinator";
import { parseViewUrl } from "@/lib/globe/viewUrl";
import type { RegionalTerrain } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const path = join(process.cwd(), "public", "terrain", "regions", "sanliurfa", "metadata.json");
  const regional = await readFile(path, "utf8")
    .then((contents) => JSON.parse(contents) as RegionalTerrain)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
  return <WorldCoordinator regional={regional} initialView={parseViewUrl(await searchParams)} />;
}
