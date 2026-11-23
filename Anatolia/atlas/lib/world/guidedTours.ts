// Named guided tours. A stop is a catalogue id the globe can open, plus a caption written here.
// No coordinates: the catalogue already knows where a published site is, and an address names the id.

export interface GuidedTourStop {
  siteId: string;
  /** Empty when the site card itself is the text, as on the wonders route. */
  caption: string;
  /** Where the caption's facts come from. Empty when there is no caption. */
  source: string;
}

export interface GuidedTour {
  id: string;
  title: string;
  summary: string;
  stops: readonly GuidedTourStop[];
}

/** The original route: earliest monumental building first, then outward. */
export const WONDERS_TOUR: GuidedTour = {
  id: "wonders",
  title: "Tour",
  summary: "A hand-picked route through early monuments.",
  stops: [
    "Q214944", // Göbekli Tepe
    "Q5996986", // Karahan Tepe
    "Q2402267", // Jericho
    "Q192522", // Çatalhöyük
    "Q1535226", // Nabta Playa
    "Q833850", // Carnac stones
    "Q216862", // Ġgantija
    "Q339503", // Newgrange
    "Q39671", // Stonehenge
    "Q12508", // Giza pyramid complex
    "Q219279", // Caral
    "Q5725", // Mohenjo-daro
  ].map((siteId) => ({ siteId, caption: "", source: "" })),
};

/**
 * Published Taş Tepeler places the world catalogue already holds.
 * Hamzan is the catalogue's "Hamzan Hill" (Q134960980). Q134611641 is a different
 * Sefer Tepe record plotted on Göbekli Tepe, and it is not a stop.
 * Kurt Tepe (Kurttepesi, Q119167492) and Taşlı Tepe (Taşlıtepe, Q119167992) are in the
 * catalogue, and so are Yoğunburç and Yenimahalle. All four stay off this route: the repository
 * has no account of them beyond a name.
 */
export const TAS_TEPELER_TOUR: GuidedTour = {
  id: "tas-tepeler",
  title: "Taş Tepeler",
  summary: "Published sites of the Şanlıurfa Neolithic excavations.",
  stops: [
    {
      siteId: "Q214944",
      caption: "Round enclosures of carved T-shaped pillars, raised by communities who had not yet taken up farming. The hill is a UNESCO World Heritage property.",
      source: "Featured record, after the English Wikipedia article; UNESCO listing 1572.",
    },
    {
      siteId: "Q5996986",
      caption: "Rooms cut into the Tektek limestone, with T-shaped pillars. Karul's 2021 report describes some of those buildings as filled in after they went out of use.",
      source: "Karul 2021; the featured record, after the English Wikipedia article.",
    },
    {
      siteId: "Q115679382",
      caption: "A communal building whose bench carries a relief of human and animal figures. Özdoğan reads the figures as one scene; the paper is where that reading can be judged.",
      source: "Özdoğan 2022, Antiquity, as cited in the place guide.",
    },
    {
      siteId: "Q119166486",
      caption: "Round buildings cut into the rock. The excavators treat this place as slightly older than Göbekli Tepe. That is their reading, not a settled date.",
      source: "Featured record, after the Turkish Wikipedia article on Çakmaktepe.",
    },
    {
      siteId: "Q108784502",
      caption: "A smaller settlement on the Tektek plateau. Excavation recorded architecture, pillar fragments and small finds, and a later survey compared radar with magnetometry beyond the trenches.",
      source: "Çelik, Güler and Güler 2023; Archaeological Prospection 2026, as cited in the place guide.",
    },
    {
      siteId: "Q118133735",
      caption: "A published excavation east of the plateau. A 2026 report includes finds from the site in an exhibition in Ankara. No account of its buildings is registered here.",
      source: "GAP Gündemi, 19 November 2026, in the news list.",
    },
    {
      siteId: "Q1117607",
      caption: "An excavation of the same project, on the plain rather than a hilltop. The reading guide points to the excavation team's page for a comparison with the plateau sites.",
      source: "Şanlıurfa landscape reading guide; the project's list of excavations.",
    },
    {
      siteId: "Q132182828",
      caption: "One of the excavations the Şanlıurfa project lists for its 2025 season. This repository has no description of its buildings.",
      source: "Anatolia data-source register, the Taş Tepeler project list.",
    },
    {
      siteId: "Q134960980",
      caption: "The catalogue records this place as Hamzan Hill. Survey literature names Hamzan Tepe among the region's T-pillar sites. No excavation account of it is registered here.",
      source: "Wikidata Q134960980; the data-source register, on the Çelik survey papers.",
    },
    {
      siteId: "Q1151606",
      caption: "Rescue excavations recorded houses and a special building with T-shaped pillars before the Atatürk reservoir flooded the valley. The published plans and the museum are what can still be visited.",
      source: "Hauptmann 1993 and 1999, in the reading list; the featured record.",
    },
  ],
};

const TOURS: readonly GuidedTour[] = [WONDERS_TOUR, TAS_TEPELER_TOUR];

export function findGuidedTour(id: string): GuidedTour | undefined {
  return TOURS.find((tour) => tour.id === id);
}

/** The stop a link names, or the first stop when the link names none. */
export function stopIndex(tour: GuidedTour, siteId: string | undefined): number {
  if (!siteId) return 0;
  const index = tour.stops.findIndex((stop) => stop.siteId === siteId);
  return index >= 0 ? index : 0;
}

/**
 * The open card is still this stop. A lookup that has not landed yet counts, until the visitor
 * chooses a different place (`selectedId` moves off the place the flight started from).
 */
export function tourStopIsShowing(
  stopId: string,
  selectedId: string | null,
  pendingId: string | null,
  baselineId: string | null,
): boolean {
  if (selectedId === stopId) return true;
  return pendingId === stopId && selectedId === baselineId;
}

/** `tour` and `stop` as the address bar holds them. An unknown tour or stop is left out. */
export function readTourAddress(tour: string | null, stop: string | null): { tourId?: string; stopId?: string } {
  const found = tour ? findGuidedTour(tour) : undefined;
  if (!found) return {};
  const stopId = stop && found.stops.some((item) => item.siteId === stop) ? stop : undefined;
  return stopId ? { tourId: found.id, stopId } : { tourId: found.id };
}

/** The query fragment for a tour, empty when the id is not one this atlas runs. */
export function tourQuery(tourId: string | undefined, stopId: string | undefined): string {
  const found = tourId ? findGuidedTour(tourId) : undefined;
  if (!found) return "";
  const tour = `&tour=${encodeURIComponent(found.id)}`;
  if (!stopId || !found.stops.some((item) => item.siteId === stopId)) return tour;
  return `${tour}&stop=${encodeURIComponent(stopId)}`;
}
