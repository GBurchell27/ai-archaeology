// Words for a share page and its preview card. Coordinates are never an input.

const DESCRIPTION_LIMIT = 180;

export function shareTitle(name: string): string {
  return `${name} · Atlas of early monuments`;
}

/** A type label a reader can say aloud: "monumental enclosure", or the catalogue's own type. */
export function readableKind(category: string | undefined, types: readonly string[]): string {
  return (category || types.find((type) => type.trim()) || "archaeological site").replace(/-/g, " ");
}

/** Period and country when the featured list publishes them; otherwise the kind. No point location. */
export function shareLine(parts: { period?: string; country?: string; kind: string }): string {
  const published = [parts.period, parts.country].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return published.length > 0 ? published.join(" · ") : parts.kind;
}

/** The featured "why" when there is one. Otherwise a plain statement that this is a published record. */
export function shareDescription(parts: { why?: string; kind: string }): string {
  const why = parts.why?.replace(/\s+/g, " ").trim();
  if (why) return why.length > DESCRIPTION_LIMIT ? `${why.slice(0, DESCRIPTION_LIMIT - 1)}…` : why;
  return `A published ${parts.kind} in the world catalogue. The atlas shows that record.`;
}
