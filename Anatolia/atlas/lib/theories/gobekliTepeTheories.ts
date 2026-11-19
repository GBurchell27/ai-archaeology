/**
 * Göbekli Tepe: its open questions and the theories that try to answer them. Each theory names who holds it,
 * where the claim is made, and where it stands on the ladder of docs/philosophy.md. Wording stays level.
 */

import {
  BANNING_2011,
  CLARE_2020,
  CURRY_2021,
  DIETRICH_2019,
  GOBEKLI_TEPE_EVIDENCE,
  GOBEKLI_TEPE_FACTS,
  GOBEKLI_TEPE_SITE_IDS,
  NOTROFF_2017,
  SCHMIDT_2010,
  SWEATMAN_TSIKRITSIS_2017,
  SWEATMAN_TSIKRITSIS_REPLY_2017,
} from "./gobekliTepeEvidence";
import { firstStatus } from "./theoryStatus";
import type { OpenQuestion, Theory, TheoryRecords } from "./theoryTypes";

const SEEDED_ON = "2026-11-19";

const THEORIES: readonly Theory[] = [
  {
    id: "gobekli-tepe-work-feasts",
    title: "Pillars quarried and moved by large gatherings fed at work feasts",
    claim:
      "Hundreds of people came together at certain seasons to quarry, move and set up the pillars, and were fed on the spot with food prepared in bulk.",
    proponents: ["Laura Dietrich, Oliver Dietrich, Jens Notroff and colleagues of the Göbekli Tepe project"],
    claimSources: [DIETRICH_2019],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-workforce-of-hundreds", "gobekli-tepe-evidence-cereal-processing-scale"],
    evidenceAgainst: ["gobekli-tepe-evidence-feast-bones-slid-in"],
    wouldSettle:
      "A find that shows the method: a sledge, rollers, rope or a worn track between the quarries and the mound. Failing that, a trial moving a replica pillar of the same stone and weight, to measure how many people it takes.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "Food was prepared on a large scale, which fits the claim. The size of the workforce is an estimate, the sources read describe no find that shows how a pillar was moved, and the bones once taken as feast remains have been read another way.",
    ),
  },
  {
    id: "gobekli-tepe-roofed-buildings",
    title: "The round buildings were roofed",
    claim: "The large round-oval buildings were covered buildings, with the pillars helping to carry a roof, and not courts open to the sky.",
    proponents: ["Dietmar Kurapkat", "Moritz Kinzel"],
    claimSources: [NOTROFF_2017, CURRY_2021],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-pillar-top-markings", "gobekli-tepe-evidence-roofing-in-building-study"],
    evidenceAgainst: ["gobekli-tepe-evidence-roof-unanswered"],
    wouldSettle: "Roof remains in place: collapsed timbers, roofing clay with impressions, or stones from a corbelled cover lying where they fell on a floor.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "The case rests on indirect signs, markings on pillar tops and a study of the standing walls. No roof remains are reported in the sources read, and the first excavator left the question open.",
    ),
  },
  {
    id: "gobekli-tepe-deliberate-backfill",
    title: "The enclosures were buried on purpose",
    claim: "At the end of their use the older enclosures were filled in deliberately and quickly by the people who built them, perhaps as a ritual act.",
    proponents: ["Klaus Schmidt"],
    claimSources: [SCHMIDT_2010],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-rapid-intentional-burial"],
    evidenceAgainst: ["gobekli-tepe-evidence-fill-slipped-from-slopes", "gobekli-tepe-evidence-slope-side-walls-damaged"],
    wouldSettle: "The full publication of the layers of the fill. Tip lines and single-event layers would point to dumping by hand; sorted, repeated slide layers running down from the slopes would point the other way.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "Schmidt's reading left the source of some 500 cubic metres of fill unexplained. The team that now excavates the site reads the same fill as slipped deposits (Clare 2020).",
    ),
  },
  {
    id: "gobekli-tepe-slope-slide-fill",
    title: "The enclosures were filled by slides from the slopes above",
    claim:
      "The buildings in the hollow were swamped, more than once, by settlement debris sliding down from the higher parts of the mound. The builders repaired and rebuilt them; nobody set out to bury them.",
    proponents: ["Lee Clare", "Moritz Kinzel"],
    claimSources: [CLARE_2020, CURRY_2021],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-fill-slipped-from-slopes", "gobekli-tepe-evidence-slope-side-walls-damaged"],
    evidenceAgainst: ["gobekli-tepe-evidence-rapid-intentional-burial", "gobekli-tepe-evidence-slide-details-unpublished"],
    wouldSettle: "The same publication of the fill's layers, with dated samples tied to each slide event.",
    ...firstStatus(
      SEEDED_ON,
      "contested",
      "It explains the mixed dates and the source of the fill, and it is the reading of the current excavators. It replaces the first excavator's published reading and so far rests on a brief report, with the detailed study still to come.",
    ),
  },
  {
    id: "gobekli-tepe-pillar-43-comet-record",
    title: "Pillar 43 records a comet strike",
    claim:
      "The animals carved on the pillars stand for star groups, and Pillar 43 fixes a date near 10,950 BC: a record of the comet encounter proposed as the cause of the Younger Dryas cold period. The site was used to watch the sky.",
    proponents: ["Martin Sweatman", "Dimitrios Tsikritsis"],
    claimSources: [SWEATMAN_TSIKRITSIS_2017, SWEATMAN_TSIKRITSIS_REPLY_2017],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-asterism-match"],
    evidenceAgainst: [
      "gobekli-tepe-evidence-date-gap",
      "gobekli-tepe-evidence-asterisms-not-stable",
      "gobekli-tepe-evidence-few-pillars-chosen",
      "gobekli-tepe-evidence-impact-itself-disputed",
      "gobekli-tepe-evidence-roofing-in-building-study",
    ],
    wouldSettle:
      "A radiocarbon date for the setting of Pillar 43 itself; independent agreement on whether an impact happened at the start of the Younger Dryas; and a test of whether the match to star groups is closer than chance allows across all the carved pillars.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "The match of carvings to star groups is a worked argument published in a journal. The date it gives is centuries older than the enclosure's oldest radiocarbon date, and the excavators have published objections to the method. The authors have replied.",
    ),
  },
  {
    id: "gobekli-tepe-pillar-43-death-imagery",
    title: "Pillar 43 belongs to the imagery of death ritual",
    claim: "The headless man and the birds on Pillar 43 belong to a wider Pre-Pottery Neolithic theme of the treatment of the dead, in which heads were removed after death. The excavators offer this as a likely root, not a decoded message.",
    proponents: ["Jens Notroff, Oliver Dietrich and colleagues of the Göbekli Tepe project"],
    claimSources: [NOTROFF_2017],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-headless-bodies-and-birds"],
    evidenceAgainst: ["gobekli-tepe-evidence-meaning-not-testable"],
    wouldSettle: "Probably nothing short of many more carved scenes from dated contexts, at this site and its neighbours, showing whether the same figures keep the same company.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "Excavated parallels support it: a bird of prey on a human head, stone heads laid in the buildings, the same theme at other sites. What the scene meant to its carvers cannot be checked directly.",
    ),
  },
  {
    id: "gobekli-tepe-sanctuary-without-settlement",
    title: "A sanctuary where nobody lived",
    claim: "Göbekli Tepe was a place of gathering and ritual built by hunter-gatherers who lived elsewhere. Its buildings were sanctuaries, and the mound was never a settlement.",
    proponents: ["Klaus Schmidt"],
    claimSources: [SCHMIDT_2010],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: ["gobekli-tepe-evidence-no-houses-found-by-2010", "gobekli-tepe-evidence-specialised-site"],
    evidenceAgainst: ["gobekli-tepe-evidence-domestic-buildings", "gobekli-tepe-evidence-rainwater-harvesting", "gobekli-tepe-evidence-art-does-not-exclude-houses"],
    wouldSettle: "Wider excavation outside the monumental buildings, with dates showing whether the small buildings and the large ones were in use at the same time.",
    ...firstStatus(
      SEEDED_ON,
      "weakly-supported",
      "The claim rested on houses and water not having been found. Soundings since 2015 have reported both, and the project's own summary calls a revision of the temple account unavoidable (Clare 2020).",
    ),
  },
  {
    id: "gobekli-tepe-inhabited-settlement",
    title: "People lived at Göbekli Tepe",
    claim:
      "The mound was a settlement with houses and a water supply from its earliest phase. Banning goes further and proposes that the large decorated buildings were themselves houses of large households.",
    proponents: ["E. B. Banning", "Lee Clare", "Moritz Kinzel"],
    claimSources: [BANNING_2011, CLARE_2020],
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    evidenceFor: [
      "gobekli-tepe-evidence-domestic-buildings",
      "gobekli-tepe-evidence-rainwater-harvesting",
      "gobekli-tepe-evidence-art-does-not-exclude-houses",
      "gobekli-tepe-evidence-cereal-processing-scale",
    ],
    evidenceAgainst: ["gobekli-tepe-evidence-specialised-site", "gobekli-tepe-evidence-no-houses-found-by-2010"],
    wouldSettle: "The full publication of the domestic buildings with their dates, and evidence of who used the large buildings and how: floors, hearths and household debris inside them, or their absence.",
    ...firstStatus(
      SEEDED_ON,
      "contested",
      "Houses, hearths and water collection are reported by the excavators, though so far in brief reports. How many people lived there, and whether the large buildings were houses as Banning proposes or special buildings as the excavators still call them, is disputed.",
    ),
  },
];

const QUESTIONS: readonly OpenQuestion[] = [
  {
    id: "gobekli-tepe-how-were-the-pillars-moved",
    question: "How were pillars weighing several tons quarried, moved and set upright, and by how many people?",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    landmarkIds: ["pillar-18", "pillar-31"],
    factIds: ["gobekli-tepe-fact-pillar-size"],
    theoryIds: ["gobekli-tepe-work-feasts"],
  },
  {
    id: "gobekli-tepe-roofed-or-open",
    question: "Were the round buildings roofed, or open to the sky?",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    landmarkIds: ["enclosure-a", "enclosure-b", "enclosure-c", "enclosure-d"],
    factIds: ["gobekli-tepe-fact-rebuilt-buildings"],
    theoryIds: ["gobekli-tepe-roofed-buildings"],
  },
  {
    id: "gobekli-tepe-why-were-the-enclosures-buried",
    question: "How did the enclosures come to be filled with rubble: buried on purpose, or swamped by slides from the slopes above?",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    landmarkIds: ["enclosure-c", "enclosure-d"],
    factIds: ["gobekli-tepe-fact-fill-contents", "gobekli-tepe-fact-fill-mixed-dates"],
    theoryIds: ["gobekli-tepe-deliberate-backfill", "gobekli-tepe-slope-slide-fill"],
  },
  {
    id: "gobekli-tepe-what-does-pillar-43-show",
    question: "What does the carved scene on Pillar 43 show?",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    landmarkIds: ["pillar-43"],
    factIds: ["gobekli-tepe-fact-pillar-43-reliefs", "gobekli-tepe-fact-enclosure-d-dates"],
    theoryIds: ["gobekli-tepe-pillar-43-comet-record", "gobekli-tepe-pillar-43-death-imagery"],
  },
  {
    id: "gobekli-tepe-temple-or-settlement",
    question: "Was this a sanctuary visited by people who lived elsewhere, or a place where people lived?",
    siteIds: GOBEKLI_TEPE_SITE_IDS,
    factIds: ["gobekli-tepe-fact-domestic-finds", "gobekli-tepe-fact-grinding-tools"],
    theoryIds: ["gobekli-tepe-sanctuary-without-settlement", "gobekli-tepe-inhabited-settlement"],
  },
];

export const GOBEKLI_TEPE_RECORDS: TheoryRecords = {
  facts: GOBEKLI_TEPE_FACTS,
  evidence: GOBEKLI_TEPE_EVIDENCE,
  theories: THEORIES,
  questions: QUESTIONS,
};
