/**
 * The ids one site goes by: its curated id in `public/sites.geojson` and its records in the world catalogue.
 * A reading list or a follow link names all of them, so it is found from the atlas panel and from the globe card alike.
 */
export const GOBEKLI_TEPE_IDS = ["gobekli-tepe", "Q214944", "961911"] as const;
export const KARAHAN_TEPE_IDS = ["karahan-tepe", "Q5996986"] as const;
export const CATALHOYUK_IDS = ["catalhoyuk", "Q192522"] as const;
export const NEVALI_CORI_IDS = ["nevali-cori", "Q1151606"] as const;
/** The pyramid complex, the Great Pyramid, the necropolis (Wikidata and Pleiades) and the plateau. */
export const GIZA_IDS = ["Q12508", "Q37200", "Q13217298", "Q3613336", "979282842"] as const;
/** Sites worked by the Taş Tepeler project that the atlas holds. */
export const TAS_TEPELER_IDS = [...GOBEKLI_TEPE_IDS, ...KARAHAN_TEPE_IDS, "sayburc", "harbetsuvan-tepesi"] as const;
