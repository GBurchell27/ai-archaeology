/**
 * Giza and the Great Pyramid: the measured and excavated facts, kept apart from readings of them.
 * Each figure names its source. Some sources were read only second-hand (an abstract, an encyclopedia
 * article): docs/data-sources.md says which. No coordinates belong in this file.
 */

import type { Fact, TheorySource } from "./theoryTypes";

/** World-catalogue ids: the Giza pyramid complex and the Great Pyramid. */
export const GIZA_SITE_IDS: readonly string[] = ["Q12508", "Q37200"];

const PETRIE_1883 = "Petrie, W. M. F. 1883. The Pyramids and Temples of Gizeh";
const PETRIE_ONLINE = "https://www.ronaldbirdsall.com/gizeh/petrie";

export const PETRIE_OUTSIDE: TheorySource = {
  citation: `${PETRIE_1883}, chapter 6, Outside of Great Pyramid, pp. 37–54.`,
  kind: "excavation-report",
  url: `${PETRIE_ONLINE}/c6.html`,
};
export const PETRIE_INSIDE: TheorySource = {
  citation: `${PETRIE_1883}, chapter 7, Inside of Great Pyramid, pp. 55–95.`,
  kind: "excavation-report",
  url: `${PETRIE_ONLINE}/c7.html`,
};
export const PETRIE_METHODS: TheorySource = {
  citation: `${PETRIE_1883}, chapter 19, Mechanical Methods of the Pyramid Builders, pp. 173–177.`,
  kind: "excavation-report",
  url: `${PETRIE_ONLINE}/c19.html`,
};
export const NELL_RUGGLES: TheorySource = {
  citation:
    "Nell, E. & Ruggles, C. 2013. The orientations of the Giza pyramids and associated structures. Preprint arXiv:1302.5622, accepted for Archaeoastronomy: The Journal of Astronomy in Culture 25.",
  kind: "peer-reviewed-paper",
  url: "https://arxiv.org/abs/1302.5622",
};
export const AERA_LOST_CITY: TheorySource = {
  citation: "Ancient Egypt Research Associates. Lost City of the Pyramids (Heit el-Ghurab). Project page.",
  kind: "project-page",
  url: "https://aeraweb.org/projects/lost-city/",
};
export const TALLET_2017: TheorySource = {
  citation:
    "Tallet, P. 2017. Les papyrus de la mer Rouge I: Le « journal de Merer » (Papyrus Jarf A et B). Cairo: Institut français d'archéologie orientale.",
  kind: "excavation-report",
};
export const NOVA_BUILDERS_1997: TheorySource = {
  citation: "NOVA Online 1997. Who Built the Pyramids? Interviews with Mark Lehner and Zahi Hawass. WGBH/PBS.",
  kind: "other",
  url: "https://www.pbs.org/wgbh/nova/pyramid/explore/builders.html",
};
export const KOCH_PROJECT_1999: TheorySource = {
  citation: "Members of the David H. Koch Pyramids Radiocarbon Project. 1999. Dating the Pyramids. Archaeology 52(5), September/October 1999. Full results: Bonani, G., Haas, H., Hawass, Z., Lehner, M., et al. 2001. Radiocarbon dates of Old and Middle Kingdom monuments in Egypt. Radiocarbon 43(3): 1297–1320.",
  kind: "other",
  url: "https://archive.archaeology.org/9909/abstracts/pyramids.html",
};
export const BRIER_2007: TheorySource = {
  citation: "Brier, B. 2007. How to Build a Pyramid. Archaeology 60(3), May/June 2007.",
  kind: "other",
  url: "https://archive.archaeology.org/0705/etc/pyramid.html",
};
export const LIVERPOOL_2018: TheorySource = {
  citation: "University of Liverpool. 2018. Ancient quarry ramp system may have helped workers build Egypt's Great Pyramids. News release, 5 November 2018, as carried by Phys.org.",
  kind: "other",
  url: "https://phys.org/news/2018-11-ancient-quarry-ramp-workers-egypt.html",
};

export const GIZA_FACTS: readonly Fact[] = [
  {
    id: "giza-fact-petrie-alignment",
    statement:
      "Petrie's survey of 1880 to 1882 found the four sides of the Great Pyramid's casing base turned 3′20″, 3′57″, 3′41″ and 3′54″ of arc anticlockwise from the cardinal directions: a mean of 3′43″, about a sixteenth of a degree.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: PETRIE_OUTSIDE,
  },
  {
    id: "giza-fact-alignment-later-surveys",
    statement:
      "Comparing five surveys, from Petrie (1880 to 1882) to their own (2006), Nell and Ruggles put the mean turn of the sides between 3 and 4 arcminutes anticlockwise of the cardinal directions. Glen Dash's reanalysis of Lehner and Goodman's 1984 survey gives 3.6 arcminutes. " +
      "Nell and Ruggles advise that the figures should not be quoted to better than 1 arcminute.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: NELL_RUGGLES,
  },
  {
    id: "giza-fact-base-sides",
    statement:
      "Petrie measured the sides of the casing base at 9069.4 inches (north), 9067.7 (east), 9069.5 (south) and 9068.6 (west): a mean of 9068.8 inches, about 230.35 m, with under 2 inches between the longest and the shortest.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: PETRIE_OUTSIDE,
  },
  {
    id: "giza-fact-kings-chamber-roof",
    statement: "The King's Chamber is roofed with nine granite beams. Petrie found every one of them broken across near the south side.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: PETRIE_INSIDE,
  },
  {
    id: "giza-fact-heaviest-beams",
    statement: "Brier gives the weight of some of the roof beams of the pyramid's chambers as more than 60 tons each.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: BRIER_2007,
  },
  {
    id: "giza-fact-granite-coffer",
    statement:
      "The King's Chamber holds a box of red granite. It has a groove and three pin-holes for a lid, saw marks on its outer faces, and inside it the trace of a tube drill that ran off line.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: PETRIE_INSIDE,
  },
  {
    id: "giza-fact-block-supply-rate",
    statement: "Mark Lehner reckons that building the pyramid within a reign of about 20 years means setting about 340 blocks a day. He speaks of blocks of 2 to 3 tons.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: NOVA_BUILDERS_1997,
  },
  {
    id: "giza-fact-workers-town",
    statement:
      "A Fourth Dynasty town of more than 7 hectares lies south of the Sphinx, excavated since 1988. It has bakeries, long galleries, workshops, storehouses, small houses and the houses of administrators. " +
      "The excavators tie it to the building of the pyramids of Menkaure, Khafre and probably Khufu.",
    siteIds: GIZA_SITE_IDS,
    kind: "excavation",
    source: AERA_LOST_CITY,
  },
  {
    id: "giza-fact-workers-cemetery",
    statement: "Zahi Hawass reports a cemetery of the pyramid workers beside their settlement, with 600 skeletons found by 1997.",
    siteIds: GIZA_SITE_IDS,
    kind: "excavation",
    source: NOVA_BUILDERS_1997,
  },
  {
    id: "giza-fact-gang-graffiti",
    statement: "Painted work-gang marks stand on blocks in the relieving chambers above the King's Chamber, in places never meant to be seen. Among the gangs named is the “Friends of Khufu”.",
    siteIds: GIZA_SITE_IDS,
    kind: "text",
    source: NOVA_BUILDERS_1997,
  },
  {
    id: "giza-fact-merer-logbook",
    statement:
      "Papyri found in 2013 at the Red Sea harbour of Wadi al-Jarf include the logbook of an inspector named Merer. It records his crew of about 40 men shipping limestone blocks by boat from the Tura quarries to “Akhet-Khufu”, the Horizon of Khufu, " +
      "in the 26th or 27th year of Khufu's reign.",
    siteIds: GIZA_SITE_IDS,
    kind: "text",
    source: TALLET_2017,
  },
  {
    id: "giza-fact-radiocarbon-dates",
    statement:
      "Charcoal, reed and wood from the mortar of the Giza pyramids and other monuments were radiocarbon dated in 1984 and 1995. The 1984 dates averaged 374 years older than the historical dates of the kings; the 1995 dates ran 100 to 200 years older, " +
      "and those for Khufu's pyramid spread over about 400 years.",
    siteIds: GIZA_SITE_IDS,
    kind: "measurement",
    source: KOCH_PROJECT_1999,
  },
  {
    id: "giza-fact-hatnub-ramp",
    statement:
      "At the alabaster quarry of Hatnub a ramp was found in 2018 with a staircase and rows of post holes on each side, on a slope of 20 percent or more. The excavators date it to the reign of Khufu.",
    siteIds: GIZA_SITE_IDS,
    kind: "excavation",
    source: LIVERPOOL_2018,
  },
];
