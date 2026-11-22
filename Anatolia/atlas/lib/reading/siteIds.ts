/**
 * The ids one site goes by: its curated id in `public/sites.geojson` and its records in the world catalogue.
 * A reading list or a follow link names all of them, so it is found from the atlas panel and from the globe card alike.
 * A different place is never added because its name matches.
 */
/**
 * Turkish Göbekli Tepe: the curated pin and Wikidata Q214944.
 * The catalogue stores Pleiades 245438984 on that Wikidata record. The merge absorbed it, so it is not its own pin.
 * Pleiades 961911 is a different place (the Merv Oasis) and stays its own catalogue pin.
 * Q134611641 is a Sefer Tepe record plotted on Göbekli Tepe. It is not this site.
 */
export const GOBEKLI_TEPE_IDS = ["gobekli-tepe", "Q214944"] as const;
export const KARAHAN_TEPE_IDS = ["karahan-tepe", "Q5996986"] as const;
export const CATALHOYUK_IDS = ["catalhoyuk", "Q192522"] as const;
export const NEVALI_CORI_IDS = ["nevali-cori", "Q1151606"] as const;
/** The pyramid complex, the Great Pyramid, the necropolis (Wikidata and Pleiades) and the plateau. */
export const GIZA_IDS = ["Q12508", "Q37200", "Q13217298", "Q3613336", "979282842"] as const;
/** Sites worked by the Taş Tepeler project that the atlas holds. */
export const TAS_TEPELER_IDS = [...GOBEKLI_TEPE_IDS, ...KARAHAN_TEPE_IDS, "sayburc", "harbetsuvan-tepesi"] as const;
