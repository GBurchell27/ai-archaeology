// A share address names a published catalogue record by a readable slug, never by coordinates.
// The slug is a pure function of that record's own id and name, so it does not move when other sites are added.

/** The same rule as the address bar: a Wikidata item, an OpenStreetMap element, or a Pleiades-style id. */
const CATALOGUE_ID = /^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

const TURKISH: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
  Ğ: "g",
  ğ: "g",
  Ç: "c",
  ç: "c",
  Ö: "o",
  ö: "o",
  Ü: "u",
  ü: "u",
};

/** Letters and digits, with diacritics folded. Empty when the name has none. */
export function slugifySiteName(name: string): string {
  const folded = [...name.trim()].map((letter) => TURKISH[letter] ?? letter).join("");
  const ascii = folded.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The catalogue id, with a Wikidata `Q` restored and everything else lower case. Null when it is not an id. */
export function canonicalCatalogueId(raw: string): string | null {
  const trimmed = raw.trim();
  const wikidata = /^q(\d+)$/i.exec(trimmed);
  const id = wikidata ? `Q${wikidata[1]}` : trimmed.toLowerCase();
  return CATALOGUE_ID.test(id) ? id : null;
}

/**
 * `gobekli-tepe--q214944`. The id after `--` keeps the slug unique and stable.
 * A name that slugifies to nothing leaves just the id.
 */
export function shareSlug(id: string, name: string): string | null {
  const catalogueId = canonicalCatalogueId(id);
  if (!catalogueId) return null;
  const namePart = slugifySiteName(name);
  const idPart = catalogueId.toLowerCase();
  return namePart ? `${namePart}--${idPart}` : idPart;
}

/** The catalogue id carried by a slug, whether or not the name part is the current one. */
export function catalogueIdFromSlug(slug: string): string | null {
  let decoded = slug.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  const folded = decoded.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(folded)) return null;
  const separator = folded.lastIndexOf("--");
  const rawId = separator === -1 ? folded : folded.slice(separator + 2);
  return rawId ? canonicalCatalogueId(rawId) : null;
}
