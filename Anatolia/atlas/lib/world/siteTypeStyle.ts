// Colours and human titles for the controlled site types, shared by the globe points and the legend.
//
// Six families rather than thirteen hues: the families differ in lightness as well as hue,
// so they stay apart under the common colour-vision deficiencies and over dark imagery.

export interface SiteTypeStyle {
  title: string;
  /** sRGB hex. */
  color: string;
}

const STONE_GOLD = "#ffe7a3"; // megaliths: the brightest
const AMBER = "#ffb431"; // monumental building
const EMBER = "#f2854a"; // ritual ground and earthworks
const OCHRE = "#ecc176"; // places people lived
const ROSE = "#e88aa0"; // burial
const VERDIGRIS = "#86d2c1"; // caves and rock art
const DUST = "#b3a791"; // everything else

/** The families by name, for layers that colour by something other than site type. */
export const SITE_PALETTE = { STONE_GOLD, AMBER, EMBER, OCHRE, ROSE, VERDIGRIS, DUST } as const;

export const SITE_TYPE_STYLE: Record<string, SiteTypeStyle> = {
  megalith: { title: "Megaliths", color: STONE_GOLD },
  monumental: { title: "Monumental buildings", color: AMBER },
  geoglyph: { title: "Geoglyphs", color: EMBER },
  enclosure: { title: "Enclosures and forts", color: EMBER },
  ritual: { title: "Sanctuaries and ritual places", color: EMBER },
  settlement: { title: "Settlements", color: OCHRE },
  tell: { title: "Tells", color: OCHRE },
  city: { title: "Cities", color: OCHRE },
  tumulus: { title: "Burial mounds", color: ROSE },
  necropolis: { title: "Cemeteries and tombs", color: ROSE },
  cave: { title: "Caves", color: VERDIGRIS },
  "rock-art": { title: "Rock art", color: VERDIGRIS },
  other: { title: "Other sites", color: DUST },
};

/** The separate OpenStreetMap megalith layer (ODbL): its own colour, never mixed into the families above. */
export const OSM_MEGALITH_STYLE: SiteTypeStyle & { attribution: string; attributionUrl: string } = {
  title: "Megaliths mapped in OpenStreetMap",
  color: "#c3b2ff",
  attribution: "Megalith layer © OpenStreetMap contributors, ODbL 1.0",
  attributionUrl: "https://www.openstreetmap.org/copyright",
};

export function siteTypeStyle(siteType: string): SiteTypeStyle {
  return SITE_TYPE_STYLE[siteType] ?? SITE_TYPE_STYLE.other;
}
