// Named periods for the chips beside the date sliders. Period names start at different dates in
// different regions, so each one belongs to a region and shows only while the view is over it;
// a few are shown everywhere. Every span is read from the source beside it (docs/data-sources.md).
// The region boxes are coarse rectangles for choosing chips. They are not site locations.

import { formatSiteDates, type YearSpan } from "@/lib/world/worldEras";

export interface PeriodSource {
  citation: string;
  url: string;
}

export interface PeriodRegion {
  id: string;
  label: string;
  west: number;
  east: number;
  south: number;
  north: number;
}

export interface NamedPeriod {
  id: string;
  name: string;
  /** Calendar years, negative for BCE. Every date here is approximate ("c."). */
  span: YearSpan;
  /** A region id, or "global" for a period shown everywhere. */
  region: string;
  source: PeriodSource;
  /** How the span was read from the source, where that is not simply its stated range. */
  note?: string;
}

export const GLOBAL_REGION = "global";

/** [EST] Above this altitude the view takes in far more than one region, so only global periods show. */
export const REGIONAL_PERIODS_BELOW_ALTITUDE = 6_000_000;

export const PERIOD_REGIONS: readonly PeriodRegion[] = [
  { id: "anatolia", label: "Anatolia", west: 25.5, east: 45, south: 35.8, north: 42.2 },
  { id: "egypt", label: "Egypt", west: 24.5, east: 37, south: 21.5, north: 32 },
];

const RASMUSSEN_2014: PeriodSource = {
  citation: "Rasmussen et al. 2014, Quaternary Science Reviews 106 (the INTIMATE event stratigraphy)",
  url: "https://doi.org/10.1016/j.quascirev.2014.09.007",
};
const KNAPP_MANNING_2016: PeriodSource = {
  citation: "Knapp & Manning 2016, “Crisis in Context”, American Journal of Archaeology 120(1), 99–149",
  url: "https://doi.org/10.3764/aja.120.1.0099",
};
const DIETRICH_2019: PeriodSource = {
  citation: "Dietrich et al. 2019, “Cereal processing at Early Neolithic Göbekli Tepe”, PLOS ONE 14(5)",
  url: "https://doi.org/10.1371/journal.pone.0215214",
};
const GORDION_CHRONOLOGY: PeriodSource = {
  citation: "Digital Gordion, “Chronology”, Penn Museum",
  url: "https://www.penn.museum/sites/gordion/history/chronology/",
};
const UEE_CHRONOLOGY: PeriodSource = {
  citation: "T. Schneider, chronology of the UCLA Encyclopedia of Egyptology",
  url: "https://www.uee.ucla.edu/chronology",
};

export const NAMED_PERIODS: readonly NamedPeriod[] = [
  {
    id: "younger-dryas",
    name: "Younger Dryas",
    // Greenland Stadial 1: onset 12,896 and end (start of the Holocene) 11,703 years before 2000 CE.
    span: [-10_900, -9700],
    region: GLOBAL_REGION,
    source: RASMUSSEN_2014,
    note: "The last cold interval of the Ice Age, 12,896 to 11,703 years before 2000 CE in the Greenland ice cores, rounded to the century.",
  },
  {
    id: "bronze-age-collapse",
    name: "Late Bronze Age collapse",
    // [EST] bounds: the source gives centuries, not years.
    span: [-1250, -1100],
    region: GLOBAL_REGION,
    source: KNAPP_MANNING_2016,
    note: "An eastern Mediterranean event. The source places the changes “from the mid to late 13th throughout the 12th centuries B.C.E.”; the bounds are that wording in round numbers.",
  },
  {
    id: "ppna",
    name: "Pre-Pottery Neolithic A",
    span: [-9600, -8800],
    region: "anatolia",
    source: DIETRICH_2019,
    note: "The source dates the Pre-Pottery Neolithic to c. 9600–7000 cal BC and its later part, the PPNB, to c. 8800–7000; the PPNA is the part before.",
  },
  { id: "ppnb", name: "Pre-Pottery Neolithic B", span: [-8800, -7000], region: "anatolia", source: DIETRICH_2019 },
  {
    id: "hittite",
    name: "Hittite",
    span: [-1600, -1200],
    region: "anatolia",
    source: GORDION_CHRONOLOGY,
    note: "The phases with Hittite affiliation in the sequence of Gordion, central Anatolia (Middle and Late Bronze Age).",
  },
  {
    id: "phrygian",
    name: "Phrygian",
    span: [-900, -330],
    region: "anatolia",
    source: GORDION_CHRONOLOGY,
    note: "Early, Middle and Late Phrygian in the sequence of Gordion; the last is under Persian rule.",
  },
  {
    id: "egypt-predynastic",
    name: "Predynastic",
    span: [-4500, -2950],
    region: "egypt",
    source: UEE_CHRONOLOGY,
    note: "Badarian to “Dynasty 0”.",
  },
  { id: "egypt-early-dynastic", name: "Early Dynastic", span: [-2950, -2670], region: "egypt", source: UEE_CHRONOLOGY, note: "Dynasties 1 and 2." },
  { id: "egypt-old-kingdom", name: "Old Kingdom", span: [-2670, -2168], region: "egypt", source: UEE_CHRONOLOGY, note: "Dynasties 3 to 8." },
  {
    id: "egypt-middle-kingdom",
    name: "Middle Kingdom",
    span: [-2010, -1656],
    region: "egypt",
    source: UEE_CHRONOLOGY,
    note: "From the reign after Nebhepetra Mentuhotep II to the end of Dynasty 13, as the source's table is laid out.",
  },
  { id: "egypt-new-kingdom", name: "New Kingdom", span: [-1548, -1086], region: "egypt", source: UEE_CHRONOLOGY, note: "Dynasties 18 to 20." },
];

/** Drawn as a band on the timeline tracks. */
export const YOUNGER_DRYAS: NamedPeriod = NAMED_PERIODS[0];

const REGION_SEPARATOR = "+";

/**
 * The regions whose box holds the centre of the view, as one string ("", "anatolia", "anatolia+egypt").
 * A string so a view can keep it in state and re-render only when the set of regions changes.
 */
export function periodRegionKeyAt(longitude: number, latitude: number, altitude: number): string {
  if (!(altitude < REGIONAL_PERIODS_BELOW_ALTITUDE)) return "";
  return PERIOD_REGIONS
    .filter((region) => longitude >= region.west && longitude <= region.east && latitude >= region.south && latitude <= region.north)
    .map((region) => region.id)
    .join(REGION_SEPARATOR);
}

/** The global periods plus those of the regions in the key, oldest first. */
export function namedPeriodsForRegions(regionKey: string): NamedPeriod[] {
  const regions = new Set(regionKey.split(REGION_SEPARATOR));
  return NAMED_PERIODS
    .filter((period) => period.region === GLOBAL_REGION || regions.has(period.region))
    .sort((first, second) => first.span[0] - second.span[0]);
}

/** Which period chips apply to a view centred on a point from an altitude in metres. */
export function namedPeriodsAt(longitude: number, latitude: number, altitude: number): NamedPeriod[] {
  return namedPeriodsForRegions(periodRegionKeyAt(longitude, latitude, altitude));
}

export function activeNamedPeriod(periods: readonly NamedPeriod[], startYear: number, endYear: number): NamedPeriod | null {
  return periods.find((period) => period.span[0] === startYear && period.span[1] === endYear) ?? null;
}

/** Tooltip text: the name, the dates, how they were read, and the source. */
export function describeNamedPeriod(period: NamedPeriod): string {
  const region = PERIOD_REGIONS.find((candidate) => candidate.id === period.region);
  const heading = `${period.name}${region ? ` (${region.label})` : ""}, about ${formatSiteDates(period.span[0], period.span[1])}.`;
  return [heading, period.note, `Source: ${period.source.citation}.`].filter(Boolean).join(" ");
}
