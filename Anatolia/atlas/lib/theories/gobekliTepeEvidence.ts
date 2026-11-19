/**
 * Göbekli Tepe: the sources, the facts and the evidence entries its questions and theories draw on.
 * Each statement names its source. Some sources were read only second-hand (an abstract, a reply, a
 * press release): docs/data-sources.md says which. A reading is worded as its author's.
 * No coordinates belong in this file.
 */

import type { EvidenceEntry, Fact, TheorySource } from "./theoryTypes";

/** The walk view's id and the world catalogue's id for the same site. */
export const GOBEKLI_TEPE_SITE_IDS: readonly string[] = ["gobekli-tepe", "Q214944"];

export const SCHMIDT_2010: TheorySource = {
  citation:
    "Schmidt, K. 2010. Göbekli Tepe – the Stone Age Sanctuaries. New results of ongoing excavations with a special focus on sculptures and high reliefs. Documenta Praehistorica 37: 239–256.",
  kind: "excavation-report",
  url: "https://doi.org/10.4312/dp.37.21",
};
export const CLARE_2020: TheorySource = {
  citation:
    "Clare, L. 2020. Göbekli Tepe, Turkey. A brief summary of research at a new World Heritage Site (2015–2019). e-Forschungsberichte des DAI 2020, Faszikel 2: 81–88.",
  kind: "excavation-report",
  url: "https://doi.org/10.34780/efb.v0i2.1012",
};
export const BANNING_2011: TheorySource = {
  citation:
    "Banning, E. B. 2011. So Fair a House: Göbekli Tepe and the Identification of Temples in the Pre-Pottery Neolithic of the Near East. Current Anthropology 52(5): 619–660.",
  kind: "peer-reviewed-paper",
  url: "https://doi.org/10.1086/661207",
};
export const DIETRICH_2019: TheorySource = {
  citation:
    "Dietrich, L., Meister, J., Dietrich, O., Notroff, J., Kiep, J., Heeb, J., et al. 2019. Cereal processing at Early Neolithic Göbekli Tepe, southeastern Turkey. PLOS ONE 14(5): e0215214.",
  kind: "peer-reviewed-paper",
  url: "https://doi.org/10.1371/journal.pone.0215214",
};
export const SWEATMAN_TSIKRITSIS_2017: TheorySource = {
  citation:
    "Sweatman, M. B. & Tsikritsis, D. 2017. Decoding Göbekli Tepe with archaeoastronomy: What does the fox say? Mediterranean Archaeology and Archaeometry 17(1): 233–250.",
  kind: "peer-reviewed-paper",
  url: "https://zenodo.org/records/400780",
};
export const SWEATMAN_TSIKRITSIS_REPLY_2017: TheorySource = {
  citation:
    "Sweatman, M. B. & Tsikritsis, D. 2017. Comment on “More than a vulture: A response to Sweatman and Tsikritsis”. Mediterranean Archaeology and Archaeometry 17(2).",
  kind: "peer-reviewed-paper",
};
export const NOTROFF_2017: TheorySource = {
  citation:
    "Notroff, J., Dietrich, O., Dietrich, L., Lelek Tvetmarken, C., Kinzel, M., Schlindwein, J., Sönmez, D. & Clare, L. 2017. More than a vulture: A response to Sweatman and Tsikritsis. Mediterranean Archaeology and Archaeometry 17(2): 57–74.",
  kind: "peer-reviewed-paper",
  url: "https://zenodo.org/records/581724",
};
export const CURRY_2021: TheorySource = {
  citation: "Curry, A. 2021. Last Stand of the Hunter-Gatherers? Archaeology, May/June 2021.",
  kind: "other",
  url: "https://archaeology.org/issues/may-june-2021/features/turkey-gobekli-tepe-hunter-gatherers/",
};

export const GOBEKLI_TEPE_FACTS: readonly Fact[] = [
  {
    id: "gobekli-tepe-fact-pillar-size",
    statement:
      "The T-shaped pillars are single blocks of limestone, each weighing several tons. The two central pillars of Enclosure D stand 5.4 m (Pillar 18) and 5.3 m (Pillar 31) high.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "measurement",
    source: SCHMIDT_2010,
  },
  {
    id: "gobekli-tepe-fact-fill-contents",
    statement:
      "The fill of the enclosures is mainly limestone chips and pieces, mostly smaller than a fist, with many flint artefacts, fragments of stone vessels and grinding stones, and broken animal and some human bone. " +
      "About 500 cubic metres would be needed to fill Enclosure D alone.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "excavation",
    source: SCHMIDT_2010,
  },
  {
    id: "gobekli-tepe-fact-fill-mixed-dates",
    statement:
      "The fill of the special buildings holds Pre-Pottery Neolithic A and B material mixed together, and radiocarbon measurements on organic samples from it do not agree with one another.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "excavation",
    source: CLARE_2020,
  },
  {
    id: "gobekli-tepe-fact-rebuilt-buildings",
    statement:
      "None of the monumental round-oval buildings has been excavated completely. Many pillars do not stand where they first stood: building studies show pillars were pulled out and used again, and the buildings were altered more than once.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "excavation",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-fact-domestic-finds",
    statement:
      "Soundings in 2015 to 2019 exposed small round-oval buildings just above the bedrock, with a hearth and bone tools beside them, a large pit carved into the bedrock, and a carved bedrock channel covered with limestone slabs.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "excavation",
    source: CLARE_2020,
  },
  {
    id: "gobekli-tepe-fact-grinding-tools",
    statement:
      "More than 7,000 grinding tools from the site have been analysed. Wear on the handstones and plant microfossils in the soil show cereals were processed there in quantity, and no large storage silos have been identified.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "excavation",
    source: DIETRICH_2019,
  },
  {
    id: "gobekli-tepe-fact-pillar-43-reliefs",
    statement:
      "Pillar 43 in Enclosure D is carved on its western broad side and on both narrow sides. The reliefs include birds, arch-shaped objects along the top, and on the shaft a headless man with an emphasised phallus.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "excavation",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-fact-enclosure-d-dates",
    statement:
      "As of 2017 the oldest radiocarbon date for Enclosure D, from organic material in wall plaster, was 700 to 1000 years later than 10,950 BC. The earliest dates from the site fall at the end of the Younger Dryas cold period, not at its start.",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    kind: "measurement",
    source: NOTROFF_2017,
  },
];

export const GOBEKLI_TEPE_EVIDENCE: readonly EvidenceEntry[] = [
  {
    id: "gobekli-tepe-evidence-workforce-of-hundreds",
    summary: "The project team holds that building the enclosures needed a workforce of hundreds of people, even by conservative estimates.",
    kind: "argument",
    madeBy: "Laura Dietrich and colleagues",
    source: DIETRICH_2019,
  },
  {
    id: "gobekli-tepe-evidence-cereal-processing-scale",
    summary:
      "The grinding tools show cereals were processed on a large scale for immediate use. The authors read the peaks of activity as large work feasts, and add that a smaller group living there all year cannot be ruled out.",
    kind: "excavation",
    factId: "gobekli-tepe-fact-grinding-tools",
    source: DIETRICH_2019,
  },
  {
    id: "gobekli-tepe-evidence-feast-bones-slid-in",
    summary: "Lee Clare argues that the animal bones in the fill, once read as the remains of feasts for building crews, belong to earlier phases and slid in with the debris.",
    kind: "argument",
    madeBy: "Lee Clare, as reported by Andrew Curry",
    source: CURRY_2021,
  },
  {
    id: "gobekli-tepe-evidence-pillar-top-markings",
    summary: "Moritz Kinzel and other researchers think the round buildings were covered, from markings on the tops of pillars that suggest they held up or anchored a roof.",
    kind: "argument",
    madeBy: "Moritz Kinzel, as reported by Andrew Curry",
    source: CURRY_2021,
  },
  {
    id: "gobekli-tepe-evidence-roofing-in-building-study",
    summary: "The excavation team writes of a significant possibility that the buildings were roofed, citing Dietmar Kurapkat's building study, and suggests the arches carved on Pillar 43 could show such buildings under a corbelled roof.",
    kind: "argument",
    madeBy: "Jens Notroff and colleagues, citing Kurapkat",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-roof-unanswered",
    summary: "Klaus Schmidt wrote in 2010 that whether a roof existed was an unanswered question. No roof remains are reported in the sources read for this record.",
    kind: "argument",
    madeBy: "Klaus Schmidt",
    source: SCHMIDT_2010,
  },
  {
    id: "gobekli-tepe-evidence-rapid-intentional-burial",
    summary: "Schmidt read the older enclosures as intentionally and rapidly buried, perhaps as part of a ritual planned from the start. He noted that where the fill came from was unknown.",
    kind: "argument",
    madeBy: "Klaus Schmidt",
    factId: "gobekli-tepe-fact-fill-contents",
    source: SCHMIDT_2010,
  },
  {
    id: "gobekli-tepe-evidence-fill-slipped-from-slopes",
    summary:
      "A review of the excavation record reads the fill as settlement deposits that slipped into the buildings from the higher slopes of the mound. Clare writes that this accounts for the source of the debris, its mixed dates and the disagreeing radiocarbon results.",
    kind: "excavation",
    factId: "gobekli-tepe-fact-fill-mixed-dates",
    source: CLARE_2020,
  },
  {
    id: "gobekli-tepe-evidence-slope-side-walls-damaged",
    summary: "Kinzel points out that the walls nearest the slope are in the worst condition, which he takes as a sign of slides or pressure from the slope.",
    kind: "argument",
    madeBy: "Moritz Kinzel, as reported by Andrew Curry",
    source: CURRY_2021,
  },
  {
    id: "gobekli-tepe-evidence-slide-details-unpublished",
    summary: "The report that puts forward the slope slides is a brief summary. It says the details of the slide events, and of what the builders did about them, are still being studied.",
    kind: "argument",
    madeBy: "Lee Clare",
    source: CLARE_2020,
  },
  {
    id: "gobekli-tepe-evidence-asterism-match",
    summary:
      "Sweatman and Tsikritsis match the animal reliefs on the pillars to star groups and read Pillar 43 as a date stamp for 10,950 BC, give or take 250 years, close to the proposed Younger Dryas event.",
    kind: "argument",
    madeBy: "Martin Sweatman and Dimitrios Tsikritsis",
    factId: "gobekli-tepe-fact-pillar-43-reliefs",
    source: SWEATMAN_TSIKRITSIS_2017,
  },
  {
    id: "gobekli-tepe-evidence-date-gap",
    summary: "The date read from the pillar is 700 to 1000 years older than the oldest radiocarbon date for the enclosure it stands in.",
    kind: "measurement",
    factId: "gobekli-tepe-fact-enclosure-d-dates",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-asterisms-not-stable",
    summary: "The excavators doubt that Neolithic hunters grouped the stars into the same figures as much later Egyptian, Arabian and Greek astronomers.",
    kind: "argument",
    madeBy: "Jens Notroff and colleagues",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-few-pillars-chosen",
    summary:
      "The excavators say the reading rests on a few chosen pillars out of more than 60, passes over the reliefs on the narrow sides of Pillar 43, and takes no account of pillars having been moved and reused.",
    kind: "argument",
    madeBy: "Jens Notroff and colleagues",
    factId: "gobekli-tepe-fact-rebuilt-buildings",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-impact-itself-disputed",
    summary: "The excavators note that the comet impact proposed for the start of the Younger Dryas is itself disputed among researchers.",
    kind: "argument",
    madeBy: "Jens Notroff and colleagues",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-headless-bodies-and-birds",
    summary:
      "Headless bodies and severed heads shown with carrion birds recur in Pre-Pottery Neolithic imagery. The site has yielded a sculpture of a bird of prey crouched on a human head, and life-sized stone heads placed inside the buildings.",
    kind: "excavation",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-meaning-not-testable",
    summary: "The excavators offer the death-ritual reading as something the imagery may be rooted in. No text or find states what the scene on Pillar 43 meant to its carvers.",
    kind: "argument",
    madeBy: "Jens Notroff and colleagues",
    source: NOTROFF_2017,
  },
  {
    id: "gobekli-tepe-evidence-no-houses-found-by-2010",
    summary: "After fifteen years of excavation Schmidt reported that no residential buildings had been discovered and that the mound was not used for habitation.",
    kind: "excavation",
    source: SCHMIDT_2010,
  },
  {
    id: "gobekli-tepe-evidence-domestic-buildings",
    summary: "Later soundings found small round-oval buildings with a hearth and bone tools. Clare reads them as dwellings, and the stone tools around them as wholly typical of domestic life.",
    kind: "excavation",
    factId: "gobekli-tepe-fact-domestic-finds",
    source: CLARE_2020,
  },
  {
    id: "gobekli-tepe-evidence-rainwater-harvesting",
    summary: "Carved channels and pits in the bedrock are read by Clare as a system for collecting rainwater, which would answer the objection that the hill had no water for residents.",
    kind: "excavation",
    factId: "gobekli-tepe-fact-domestic-finds",
    source: CLARE_2020,
  },
  {
    id: "gobekli-tepe-evidence-art-does-not-exclude-houses",
    summary:
      "Banning argues that carved decoration and heavy building effort do not show a building was not lived in, and points to the debris of flint knapping and food preparation as signs of daily life.",
    kind: "argument",
    madeBy: "E. B. Banning",
    source: BANNING_2011,
  },
  {
    id: "gobekli-tepe-evidence-specialised-site",
    summary: "The team studying the grinding tools still describes Göbekli Tepe as a specialised site with many special buildings, used most heavily at certain seasons.",
    kind: "argument",
    madeBy: "Laura Dietrich and colleagues",
    source: DIETRICH_2019,
  },
];
