// A reading list per site: the excavators' publications and the main books arguing other readings, each labelled by kind.
// Pure data. Every entry was checked against a library, publisher or DOI record. A note says what the work is, not whether it is right.
import type { Reading } from "../placeLearning";
import { CATALHOYUK_IDS, GIZA_IDS, GOBEKLI_TEPE_IDS, KARAHAN_TEPE_IDS, NEVALI_CORI_IDS } from "./siteIds";

export type ReadingKind = "excavation-report" | "peer-reviewed-paper" | "popular-book";

export const READING_KIND_LABEL: Record<ReadingKind, string> = {
  "excavation-report": "Excavation report",
  "peer-reviewed-paper": "Peer-reviewed paper",
  "popular-book": "Popular book",
};

export interface ReadingEntry {
  authors: string;
  year: number;
  title: string;
  /** The journal with volume and pages, or the publisher. */
  publishedIn: string;
  kind: ReadingKind;
  /** One level line on what the work is. */
  note: string;
  /** https, on the allowlist in `lib/externalHref.ts`. A book may have none. */
  url?: string;
}

export interface SiteReadingList {
  site: string;
  /** Every id the site goes by. */
  siteIds: readonly string[];
  entries: readonly ReadingEntry[];
}

function entry(kind: ReadingKind, authors: string, year: number, title: string, publishedIn: string, note: string, url?: string): ReadingEntry {
  return { kind, authors, year, title, publishedIn, note, url };
}

const GOBEKLI_TEPE: readonly ReadingEntry[] = [
  entry("excavation-report", "Klaus Schmidt", 2000, "Göbekli Tepe, Southeastern Turkey. A preliminary report on the 1995–1999 excavations", "Paléorient 26(1), 45–54",
    "The first excavation director’s report on the opening seasons.", "https://doi.org/10.3406/paleo.2000.4697"),
  entry("peer-reviewed-paper", "Klaus Schmidt", 2010, "Göbekli Tepe – the Stone Age Sanctuaries. New results of ongoing excavations with a special focus on sculptures and high reliefs", "Documenta Praehistorica 37, 239–256",
    "Schmidt’s reading of the enclosures as sanctuaries, with the sculptures and reliefs found up to then.", "https://doi.org/10.4312/dp.37.21"),
  entry("popular-book", "Klaus Schmidt", 2006, "Sie bauten die ersten Tempel", "C. H. Beck, Munich",
    "The excavator’s own account for general readers. In English as Göbekli Tepe: A Stone Age Sanctuary in South-Eastern Anatolia (ex oriente, Berlin, 2012)."),
  entry("peer-reviewed-paper", "Oliver Dietrich, Manfred Heun, Jens Notroff, Klaus Schmidt and Martin Zarnkow", 2012, "The role of cult and feasting in the emergence of Neolithic communities. New evidence from Göbekli Tepe, south-eastern Turkey", "Antiquity 86(333), 674–695",
    "The excavation team’s case that feasting brought people together to build the enclosures.", "https://doi.org/10.1017/S0003598X00047840"),
  entry("peer-reviewed-paper", "E. B. Banning", 2011, "So Fair a House: Göbekli Tepe and the identification of temples in the Pre-Pottery Neolithic of the Near East", "Current Anthropology 52(5), 619–660",
    "Argues that the buildings may have been houses rich in symbolism rather than temples.", "https://doi.org/10.1086/661207"),
  entry("excavation-report", "Lee Clare", 2020, "Göbekli Tepe, Turkey. A brief summary of research at a new World Heritage Site (2015–2019)", "e-Forschungsberichte des DAI 2020, Faszikel 2",
    "The later project lead’s summary of the 2015–2019 work.", "https://publications.dainst.org/journals/efb/article/view/2596"),
  entry("peer-reviewed-paper", "Gil Haklay and Avi Gopher", 2020, "Geometry and architectural planning at Göbekli Tepe, Turkey", "Cambridge Archaeological Journal 30(2), 343–357",
    "Argues from the plan that Enclosures B, C and D were laid out as one geometric design.", "https://doi.org/10.1017/S0959774319000660"),
  entry("peer-reviewed-paper", "Martin B. Sweatman and Dimitrios Tsikritsis", 2017, "Decoding Göbekli Tepe with archaeoastronomy: what does the fox say?", "Mediterranean Archaeology and Archaeometry 17(1), 233–250",
    "Reads the carvings, Pillar 43 above all, as constellations recording a comet impact.", "https://doi.org/10.5281/zenodo.400780"),
  entry("peer-reviewed-paper", "Jens Notroff and colleagues", 2017, "More than a vulture: a response to Sweatman and Tsikritsis", "Mediterranean Archaeology and Archaeometry 17(2), 57–74",
    "The excavation team’s reply to Sweatman and Tsikritsis, in the same journal.", "https://doi.org/10.5281/zenodo.581724"),
  entry("popular-book", "Graham Hancock", 2015, "Magicians of the Gods", "Coronet",
    "Proposes that the site keeps the knowledge of a civilisation lost in a cataclysm at the end of the Ice Age."),
  entry("popular-book", "Martin Sweatman", 2019, "Prehistory Decoded", "Matador (Troubador Publishing)",
    "The author’s book-length case for reading the pillars as a record of the sky."),
  entry("popular-book", "Andrew Collins", 2014, "Göbekli Tepe: Genesis of the Gods. The Temple of the Watchers and the Discovery of Eden", "Bear & Company",
    "Connects the enclosures with the Watchers of the Book of Enoch and the story of Eden."),
];

const KARAHAN_TEPE: readonly ReadingEntry[] = [
  entry("peer-reviewed-paper", "Bahattin Çelik", 2011, "Karahan Tepe: a new cultural centre in the Urfa area in Turkey", "Documenta Praehistorica 38, 241–254",
    "The surface survey that described the site’s pillars and finds before excavation began.", "https://doi.org/10.4312/dp.38.19"),
  entry("excavation-report", "Necmi Karul", 2021, "Buried buildings at Pre-Pottery Neolithic Karahantepe", "Türk Arkeoloji ve Etnografya Dergisi 82, 21–31",
    "The excavation director’s report on a group of structures and their deliberate filling.", "https://dergipark.org.tr/en/pub/arkeolojiveetnografya/article/909296"),
  entry("popular-book", "Andrew Collins", 2024, "Karahan Tepe: Civilization of the Anunnaki and the Cosmic Origins of the Serpent of Eden", "Bear & Company",
    "Reads the site through the Anunnaki of Mesopotamian myth and the serpent of Eden."),
];

const GIZA: readonly ReadingEntry[] = [
  entry("excavation-report", "W. M. Flinders Petrie", 1883, "The Pyramids and Temples of Gizeh", "Field & Tuer, London",
    "Petrie’s survey of the pyramids, with his measurements of the buildings and their stonework."),
  entry("excavation-report", "Pierre Tallet", 2017, "Les papyrus de la mer Rouge I. Le « journal de Merer » (Papyrus Jarf A et B)", "MIFAO 136, Institut français d’archéologie orientale, Cairo",
    "The publication of the Wadi el-Jarf papyri: the logbook of Merer, whose crew shipped limestone to Giza under Khufu.", "https://www.ifao.egnet.net/publications/catalogue/9782724707069/"),
  entry("popular-book", "Mark Lehner", 1997, "The Complete Pyramids", "Thames & Hudson, London",
    "An illustrated survey of Egypt’s pyramids for general readers, by an archaeologist who excavates at Giza."),
  entry("popular-book", "Mark Lehner and Zahi Hawass", 2017, "Giza and the Pyramids", "Thames & Hudson, London",
    "A long account of the plateau and its excavation history by two of its excavators."),
  entry("popular-book", "Pierre Tallet and Mark Lehner", 2021, "The Red Sea Scrolls: How Ancient Papyri Reveal the Secrets of the Pyramids", "Thames & Hudson, London",
    "The Wadi el-Jarf papyri, and what their finder and a Giza excavator draw from them about the building of the Great Pyramid."),
  entry("popular-book", "Christopher Dunn", 1998, "The Giza Power Plant: Technologies of Ancient Egypt", "Bear & Company",
    "Proposes that the Great Pyramid was a machine for producing power, arguing from tool marks and the internal layout."),
  entry("popular-book", "Robert Bauval and Adrian Gilbert", 1994, "The Orion Mystery", "Heinemann, London",
    "Proposes that the three main pyramids were laid out to match the stars of Orion’s Belt."),
  entry("popular-book", "Graham Hancock", 1995, "Fingerprints of the Gods", "Heinemann, London",
    "Argues that Giza and other monuments carry the legacy of a civilisation lost at the end of the Ice Age."),
];

const CATALHOYUK: readonly ReadingEntry[] = [
  entry("popular-book", "James Mellaart", 1967, "Çatal Hüyük: A Neolithic Town in Anatolia", "Thames & Hudson, London",
    "The first excavator’s account of the 1960s seasons, with his reading of the shrines and figurines as a goddess cult."),
  entry("peer-reviewed-paper", "Ian Hodder", 2014, "Çatalhöyük: the leopard changes its spots. A summary of recent work", "Anatolian Studies 64, 1–22",
    "The later project director’s summary of how its results changed the earlier picture of the site.", "https://doi.org/10.1017/S0066154614000027"),
  entry("popular-book", "Ian Hodder", 2006, "The Leopard’s Tale: Revealing the Mysteries of Çatalhöyük", "Thames & Hudson, London",
    "The later project director’s account for general readers."),
];

const NEVALI_CORI: readonly ReadingEntry[] = [
  entry("excavation-report", "Harald Hauptmann", 1993, "Ein Kultgebäude in Nevalı Çori", "In M. Frangipane and others (eds), Between the Rivers and over the Mountains, Rome, 37–69",
    "The excavator’s report, in German, on the building with T-shaped pillars."),
  entry("excavation-report", "Harald Hauptmann", 1999, "The Urfa Region", "In M. Özdoğan and N. Başgelen (eds), Neolithic in Turkey, Arkeoloji ve Sanat Yayınları, Istanbul",
    "The excavator’s overview of Nevalı Çori and the neighbouring Neolithic sites."),
];

export const SITE_READING_LISTS: readonly SiteReadingList[] = [
  { site: "Göbekli Tepe", siteIds: GOBEKLI_TEPE_IDS, entries: GOBEKLI_TEPE },
  { site: "Karahan Tepe", siteIds: KARAHAN_TEPE_IDS, entries: KARAHAN_TEPE },
  { site: "Giza", siteIds: GIZA_IDS, entries: GIZA },
  { site: "Çatalhöyük", siteIds: CATALHOYUK_IDS, entries: CATALHOYUK },
  { site: "Nevalı Çori", siteIds: NEVALI_CORI_IDS, entries: NEVALI_CORI },
];

/** The site's reading list, under any of its ids. Empty for a site that has none yet. */
export function readingListForSite(siteId: string): readonly ReadingEntry[] {
  return SITE_READING_LISTS.find((list) => list.siteIds.includes(siteId))?.entries ?? [];
}

/** A site's reading list as rows for the shared reading-list markup: the kind leads the credit line. */
export function readingRowsForSite(siteId: string): Reading[] {
  return readingListForSite(siteId).map(({ kind, authors, year, title, publishedIn, note, url }) => (
    { title, credit: `${READING_KIND_LABEL[kind]} · ${authors} · ${year} · ${publishedIn}`, note, href: url }
  ));
}
