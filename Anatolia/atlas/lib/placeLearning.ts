import { comparisonLessons } from "./comparisonLessons";
import { lonLatToMercator } from "./geo";
import { pinsInRange } from "./timeline";
import type { SiteFeature } from "./types";
import type { WikiFeature } from "./wikidata";

export interface Reading {
  title: string;
  credit: string;
  note: string;
  href: string;
}

export interface PlaceLesson {
  headline: string;
  evidence: string;
  interpretation: string;
  mapPrompt: string;
  sources: Reading[];
  related: string[];
  maps?: Reading[];
}

function reading(title: string, credit: string, href: string, note: string): Reading {
  return { title, credit, href, note };
}

const urfaMaps = [
  reading("Urfa, sheet 12-HA", "IRCICA Map Collection · 1929 · 1:200,000",
    "https://openaccess.ircica.org/handle/123456789/21212", "An Ottoman Turkish regional sheet from the Turkish mapping directorate."),
  reading("Urfa, revised regional sheet", "TBMM Library · 1948 · 1:200,000",
    "https://acikerisim.tbmm.gov.tr/items/1e950233-bfe8-4bb4-bedf-0830b3b6e0ba", "Roads and place names were revised in 1947. Compare them with the earlier Urfa sheet."),
  reading("Schools in Diyarbakır, Mardin and Urfa", "SALT Research · 1914",
    "https://archives.saltresearch.org/handle/123456789/111039", "A thematic map of late Ottoman educational institutions in the region."),
];

export const regionalMaps: Reading[] = [
  ...urfaMaps,
  reading("Eastern Turkey in Asia, historical sheet viewer", "British War Office · 1901–18 · 1:250,000 · CNR–ISMed",
    "https://magma.cnr.it/resource/map/eta", "Georeferenced sheets for Urfa, Diyarbakır, Mardin and Maraş. Read names and routes at regional scale."),
  reading("Ottoman Empire, administrative divisions", "R. Huber · Library of Congress · 1899",
    "https://www.loc.gov/resource/g7431f.ct002181/?st=slideshow", "A zoomable map of Ottoman provinces with French labels."),
  reading("Eastern Turkey in Asia, Syria and Western Persia", "Royal Geographical Society · 1910, railways updated 1915",
    "https://www.qdl.qa/en/archive/81055/vdc_100135715785.0x00000e", "A regional view of settlements, rivers and transport routes, digitized by the British Library."),
  reading("Turkey, 1:200,000 sheet index", "British War Office Series K511 · 1941–42 · University of Texas Libraries",
    "https://maps.lib.utexas.edu/maps/ams/turkey/", "Browse the Adıyaman, Siverek, Diyarbakır, Mardin and Nusaybin sheets."),
  reading("CORONA Atlas of the Middle East", "University of Arkansas CAST · USGS",
    "https://corona.cast.uark.edu/atlas", "Browse declassified satellite photographs and compare older land cover with modern imagery."),
  reading("Itiner-e, Roman roads", "Itiner-e research team · CC BY 4.0",
    "https://doi.org/10.5281/zenodo.17122148", "The source for the atlas road overlay. Its certainty fields help distinguish better-attested routes from reconstructions."),
  reading("Global Surface Water Explorer", "European Commission Joint Research Centre",
    "https://global-surface-water.appspot.com/", "Follow the extent and seasonality of surface water during the Landsat era."),
];

const lessons: Record<string, PlaceLesson> = {
  ...comparisonLessons,
  "gobekli-tepe": {
    headline: "How did people use the monumental buildings?",
    evidence: "Excavations revealed large stone enclosures with carved T-shaped pillars alongside smaller buildings. Grinding equipment and animal bones give researchers additional ways to study what people did here.",
    interpretation: "Excavators have proposed communal feasting as one explanation for some deposits. Later work asks how special buildings fit into a settlement with everyday activities. Read the two accounts together and see how the evidence and the questions changed.",
    mapPrompt: "Compare the hillshade with the 1968–69 CORONA layer and the modern satellite image. Look at the ridge and the modern shelter, then use the excavation account for the layout of individual buildings.",
    sources: [
      reading("Göbekli Tepe excavation project", "German Archaeological Institute", "https://www.dainst.org/en/research/projects/goebekli-tepe/1934", "Fieldwork history, current research questions and the buildings under study."),
      reading("Göbekli Tepe after twenty years of research", "Lee Clare · DAI · 2020", "https://publications.dainst.org/journals/efb/article/view/2596", "A reassessment of architecture, settlement and the history of excavation."),
      reading("The role of cult and feasting", "Oliver Dietrich and colleagues · Antiquity · 2012", "https://doi.org/10.1017/S0003598X00047840", "An early field-team interpretation of the buildings and associated deposits."),
      reading("World Heritage listing", "UNESCO World Heritage Centre", "https://whc.unesco.org/en/list/1572/", "The official statement of significance and conservation context."),
      reading("Şanlıurfa Archaeology Museum virtual tour", "Türkiye Ministry of Culture and Tourism", "https://sanalmuze.gov.tr/muzeler/SANLIURFA_MUZESI/", "Walk through the museum’s galleries and compare objects from different Neolithic settlements."),
    ],
    maps: [reading("Property and buffer-zone maps", "UNESCO World Heritage Centre", "https://whc.unesco.org/en/list/1572/maps", "Compare the protected property with its wider buffer zone.")],
    related: ["karahan-tepe", "sayburc", "nevali-cori"],
  },
  "karahan-tepe": {
    headline: "What can a building’s closure tell us?",
    evidence: "Excavation exposed interconnected structures, including a chamber cut into bedrock with carved features. The excavation team recorded intentional infilling of several structures and describes buildings of different forms and scales across the settlement.",
    interpretation: "The infill is evidence about how buildings went out of use. Their original uses are a separate archaeological question. Compare the building plans and the finds from different rooms before deciding which activities they could have supported.",
    mapPrompt: "Switch between relief and Sentinel-2 to read the Tektek plateau at landscape scale. Use the published excavation plans to study how adjoining rooms connect.",
    sources: [
      reading("Karahantepe fieldwork", "Necmi Karul · Taş Tepeler", "https://tastepeler.org/en/settlements/karahantepe", "An excavation-team account of the settlement, structures and objects."),
      reading("Buried buildings at Pre-Pottery Neolithic Karahantepe", "Necmi Karul · 2021", "https://dergipark.org.tr/en/pub/arkeolojiveetnografya/article/909296", "Excavation evidence for the deliberate filling of a group of structures."),
      reading("Karahantepe", "Türkiye Ministry of Culture and Tourism", "https://www.ktb.gov.tr/EN-327499/karahantepe.html", "The ministry’s introduction to the site and its architecture."),
    ],
    related: ["gobekli-tepe", "harbetsuvan-tepesi", "sayburc"],
  },
  sayburc: {
    headline: "Does a carved bench tell a story?",
    evidence: "Excavators documented a relief with five human and animal figures on the bench of a communal building. Work elsewhere at Sayburç has also recorded structures associated with everyday life.",
    interpretation: "Eylem Özdoğan reads the figures as connected scenes. Follow the figures’ positions and gestures in the publication, then ask what can be inferred about their relationship and what depends on an interpretation of the scene.",
    mapPrompt: "Use the aerial view to place the site beside the modern village. The published close-up of the bench shows details too small for the atlas terrain.",
    sources: [
      reading("Sayburç fieldwork", "Eylem Özdoğan · Taş Tepeler", "https://tastepeler.org/en/yerlesmeler/sayburc", "The excavation team introduces the communal building and the wider settlement."),
      reading("The Sayburç relief", "Eylem Özdoğan · Antiquity · 2022", "https://doi.org/10.15184/aqy.2022.125", "Photographs, drawings and the excavator’s argument for a narrative."),
      reading("A Pre-Pottery Neolithic settlement in the Urfa region", "Eylem Özdoğan · Documenta Praehistorica · 2024", "https://doi.org/10.4312/dp.51.23", "The relief in the context of the settlement’s buildings and material culture."),
    ],
    related: ["gobekli-tepe", "karahan-tepe", "edessa"],
  },
  "harbetsuvan-tepesi": {
    headline: "What changes when you look beyond the trench?",
    evidence: "Excavations on the Tektek plateau documented architecture, pillar fragments and small finds. A later field study compared ground-penetrating radar with magnetometry to investigate the area beyond the excavated trenches.",
    interpretation: "Trench observations and geophysical anomalies are different kinds of evidence. Compare where the two methods agree and where the researchers have to leave the interpretation open.",
    mapPrompt: "Read the slope and local relief around the hilltop. Use the field study to understand why survey instruments and the atlas terrain reveal different things.",
    sources: [
      reading("Harbetsuvan fieldwork", "Taş Tepeler", "https://tastepeler.org/en/yerlesmeler/harbetsuvan", "The official research account puts the excavated area in context."),
      reading("Small finds from Harbetsuvan", "Bahattin Çelik, Mustafa Güler and Gül Güler · 2023", "https://dergipark.org.tr/tr/pub/kdeniz/article/1397800", "Material from the excavations and its archaeological context."),
      reading("Comparing geophysical survey methods", "Archaeological Prospection · 2026", "https://onlinelibrary.wiley.com/doi/10.1002/arp.70037", "A field comparison of magnetometry and ground-penetrating radar."),
    ],
    related: ["karahan-tepe", "gobekli-tepe", "harran"],
  },
  "nevali-cori": {
    headline: "How do we study a village now under a reservoir?",
    evidence: "Rescue excavations documented rectangular buildings and a special building with T-shaped pillars before the Atatürk reservoir inundated the site. Published plans and the objects preserved in Şanlıurfa are central to understanding the excavated village.",
    interpretation: "Compare the placement of the special building with the rest of the settlement. A shared pillar form gives us a starting point for comparing Nevalı Çori with Göbekli Tepe, even though the buildings and their settings differ.",
    mapPrompt: "Switch to the historical photograph where available and compare the earlier valley with today’s reservoir. The excavation plan gives the building layout.",
    sources: [
      reading("Şanlıurfa Neolithic research history", "Taş Tepeler", "https://tastepeler.org/en/research/sanliurfa-neolithic-research-project", "The regional project recounts how the Nevalı Çori rescue excavations began."),
      reading("Şanlıurfa Archaeology Museum", "Türkiye Ministry of Culture and Tourism", "https://muze.gov.tr/muze-detay?DistId=SUM&SectionId=SUM02", "The museum presents finds and architecture from the region’s Neolithic sites."),
    ],
    maps: [reading("Nevalı Çori, layer II excavation plan", "Heidelberg University Library · Propylaeum", "https://books.ub.uni-heidelberg.de/propylaeum/catalog/view/1678/2865/131829", "A published plan for comparing the special building with other structures.")],
    related: ["gobekli-tepe", "samosata", "zeugma"],
  },
  harran: {
    headline: "Read a town with several histories",
    evidence: "The mound, walls, castle, monumental religious buildings and domestic architecture belong to different episodes in Harran’s long history. The excavation record adds much smaller traces, including glass bracelets recovered from multiple contexts.",
    interpretation: "Compare what the heritage listing emphasizes with what archaeologists can learn from small objects. The surviving townscape and the material in excavated layers answer different questions about life in Harran.",
    mapPrompt: "Compare the town’s position on the plain with Şanlıurfa’s setting. The twentieth-century sheets capture particular moments in road and settlement history.",
    sources: [
      reading("Harran and Sanliurfa", "Türkiye’s UNESCO Tentative List entry", "https://whc.unesco.org/en/tentativelists/1400/", "The nomination context and a description of the two historic settlements."),
      reading("Harran Castle", "Şanlıurfa Metropolitan Municipality", "https://www.sanliurfa.bel.tr/lang/en/icerik/202/7/-harran-castle-", "Local heritage account of the castle and archaeological mound."),
      reading("Harran ve Çevresi, Arkeoloji", "ŞURKAV · Turkish and English chapters", "https://www.sanliurfa.bel.tr/files/1/bsb_sonra/surkav_yayinlari/55_HARRAN_VE_CEVRESI%20_ARKEOLOJI_.pdf", "A regional volume bringing together excavation and historical research."),
      reading("Glass bracelets from the Harran excavations", "Istanbul University · Sanat Tarihi Yıllığı", "https://dergipark.org.tr/tr/pub/iuarts/article/1647875", "An object study based on the 2013–23 excavation seasons."),
    ],
    maps: [
      reading("Charra on the Tabula Peutingeriana", "KU Eichstätt–Ingolstadt · digital scholarly edition", "https://www1.ku.de/ggf/ag/tabula_peutingeriana/trefferanzeige_en.php?id=1779", "An entry and zoomable excerpt from a Roman road diagram preserved in a medieval copy."),
      reading("Harran excavation archive", "British Institute at Ankara · 1956 and 1959", "https://digitalrepository.biaa.ac.uk/harran-excavations?active_member=1999", "Excavation records and plans for the Great Mosque and its surroundings."),
    ],
    related: ["edessa", "karahan-tepe", "harbetsuvan-tepesi"],
  },
  edessa: {
    headline: "A city known by several names",
    evidence: "Edessa, Urhay and Şanlıurfa refer to the city in different languages and historical settings. The municipality identifies an Old Syriac inscription on one of the columns above the old town. Mosaics and their inscriptions give another view of local patrons and communities.",
    interpretation: "Compare the atlas’s Crusader-era view with the earlier evidence in the inscription and mosaic accounts. How would the city’s story change if you began with an object rather than a change of rulers?",
    mapPrompt: "Look for the citadel’s rise above the town, then compare the historic Urfa sheets with the modern street pattern.",
    sources: [
      reading("Urfa Castle and its inscriptions", "Şanlıurfa Metropolitan Municipality", "https://www.sanliurfa.bel.tr/lang/en/icerik/12/7/urfa-castle", "The local account describes the citadel, columns and Syriac inscription."),
      reading("Edessa Mozaikleri", "Türkiye Ministry of Culture and Tourism · Turkish", "https://ekitap.ktb.gov.tr/TR-80829/edessa-mozaikleri.html", "Read the published mosaic descriptions and their historical context."),
      reading("Harran and Sanliurfa", "Türkiye’s UNESCO Tentative List entry", "https://whc.unesco.org/en/tentativelists/1400/", "A starting point for the city’s architectural and religious history."),
    ],
    maps: [
      reading("Edessa on the Tabula Peutingeriana", "KU Eichstätt–Ingolstadt · digital scholarly edition", "https://www1.ku.de/ggf/ag/tabula_peutingeriana/trefferanzeige_en.php?id=1769", "A zoomable excerpt showing Edessa’s place in the route network."),
    ],
    related: ["harran", "sayburc", "gobekli-tepe"],
  },
  cayonu: {
    headline: "A settlement that kept rebuilding",
    evidence: "Çayönü’s excavators documented several architectural phases, including early round structures and later rectangular plans. They also studied evidence for changes in plant and animal use and the working of native copper.",
    interpretation: "The sequence lets you ask whether changes in food, tools and building layouts happened together. Compare several phases before treating any single plan as typical of the settlement.",
    mapPrompt: "Locate the settlement in the Ergani plain. Use the excavation team’s photographs and plans to compare foundations at building scale.",
    sources: [
      reading("Çayönü excavation project", "Çayönü Tepesi Excavation and Research Project", "https://cayonutepesi.org.tr/en", "The project team presents the history, aims and field programme."),
      reading("Structures of Çayönü", "Çayönü Tepesi Excavation and Research Project", "https://cayonutepesi.org.tr/en/cayonu/fotolar", "Illustrated accounts of the excavated buildings."),
    ],
    related: ["kortik-tepe", "hallan-cemi", "nevali-cori"],
  },
  "kortik-tepe": {
    headline: "What do objects in graves tell us about daily life?",
    evidence: "Rescue excavations in the Upper Tigris basin uncovered circular buildings, burials and carefully worked stone objects. Decorated vessels appear in burial contexts, where their placement is itself part of the archaeological evidence.",
    interpretation: "Compare the excavation record with the radiocarbon study. A collection of objects answers a different question from a sequence of dated layers, and researchers need both to describe change over time.",
    mapPrompt: "Follow the Tigris landscape, then open the excavation figures to examine the relationship between buildings and graves.",
    sources: [
      reading("Körtik Tepe excavation overview", "Vecihi Özkaya and Aytaç Coşkun · Antiquity", "https://antiquity.ac.uk/projgall/ozkaya/", "Structures, burials and illustrated objects from the excavations."),
      reading("New radiocarbon dates from Körtik Tepe", "Marion Benz and colleagues · Radiocarbon", "https://www.cambridge.org/core/services/aop-cambridge-core/content/view/39B1D2CADE3EF62384CAD0B7661D7CFE/S0033822200047081a.pdf/div-class-title-methodological-implications-of-new-radiocarbon-dates-from-the-early-holocene-site-of-kortik-tepe-southeast-anatolia-div.pdf", "How the dating team connects individual measurements to the stratigraphy."),
    ],
    related: ["cayonu", "hallan-cemi", "gobekli-tepe"],
  },
  arslantepe: {
    headline: "How did people account for goods before writing?",
    evidence: "The late fourth-millennium BCE mudbrick complex contained large groups of clay sealings bearing impressions. Their find contexts and the sequence of rooms let excavators investigate how goods were stored and managed.",
    interpretation: "The sealings offer evidence for administration. Compare them with the architecture and containers to see how researchers infer the routines and authority behind the seal impressions.",
    mapPrompt: "Locate the mound on the Malatya plain, then open the heritage map to examine the protected area around it.",
    sources: [
      reading("Arslantepe Mound", "UNESCO World Heritage Centre", "https://whc.unesco.org/en/list/1622/", "The stratified mound, its major building phases and the evidence for administration."),
      reading("The origins of statehood at Arslantepe", "Sapienza University of Rome", "https://www.uniroma1.it/en/notizia/arslantepe-origins-statehood-new-visitor-route-opened-unesco-site-sapienza-archaeological", "The excavation mission describes the research history and conservation work."),
    ],
    maps: [reading("Arslantepe property maps", "UNESCO World Heritage Centre", "https://whc.unesco.org/en/list/1622/maps", "Maps of the listed mound and surrounding protection zone.")],
    related: ["karkemish", "samosata", "zeugma"],
  },
  karkemish: {
    headline: "Follow a ceremonial route from palace to river",
    evidence: "The Turkish–Italian excavations have studied the palace, monumental gates and sculpted stone slabs of the Bronze and Iron Age city. The expedition traces a route past several monuments and down towards the Euphrates.",
    interpretation: "Compare the excavated findspots with the project’s reconstruction. A carved slab in a museum can be read differently once you know where people would have seen it in the city.",
    mapPrompt: "Follow the Euphrates on the atlas and use the expedition’s 3D project to see the architecture at street level.",
    sources: [
      reading("Excavations at Karkemish", "University of Bologna · Turkish–Italian expedition", "https://disci.unibo.it/en/research/archaeological-missions/achaeological-missions-abroad/karkemish-turkey/excavations", "The excavation areas, city phases and monuments under study."),
      reading("Karkemish on the Euphrates", "Nicolò Marchetti · Near Eastern Archaeology · 2012", "https://doi.org/10.5615/neareastarch.75.3.0132", "An excavation overview including new inscriptions and elite material culture."),
    ],
    maps: [reading("Karkemish 3D Visualization Project", "Turkish–Italian expedition · OrientLab", "https://www.orientlab.net/3d-kark/", "The project explains how field and museum photogrammetry informed its reconstructions.")],
    related: ["arslantepe", "zeugma", "birecik"],
  },
  zeugma: {
    headline: "What can rescue archaeology recover before a valley floods?",
    evidence: "Excavations ahead of the Birecik reservoir documented houses, floor mosaics, wall paintings and other remains at the Euphrates city. Some mosaics were conserved and moved to Gaziantep.",
    interpretation: "Pick a mosaic and trace it back to its room in the excavation reports. A museum display lets you see the image closely, while the house plan helps explain who could have seen it and how they moved through the building.",
    mapPrompt: "Compare the modern river and reservoir with archival satellite coverage. Then use the excavation volume to investigate individual houses.",
    sources: [
      reading("Excavations at Zeugma", "Packard Humanities Institute · excavation volumes", "https://zeugma.packhum.org/toc", "Open chapters on houses, mosaics, wall painting and the city’s military history."),
      reading("Chronology of the rescue excavations", "Zeugma excavation project", "https://zeugma.org.tr/en-gb/kazi-kronolojisi/", "How the Gaziantep Museum and partner teams responded to the rising reservoir."),
      reading("Zeugma Mosaic Museum", "Türkiye Ministry of Culture and Tourism", "https://muze.gov.tr/muze-detay?DistId=GZN&SectionId=GZN01", "The museum collection and interpretation of objects from the city."),
    ],
    related: ["rumkale", "karkemish", "nevali-cori"],
  },
  rumkale: {
    headline: "Where does the cliff end and the fortress begin?",
    evidence: "The fortifications stand where the Merzimen joins the Euphrates. The provincial culture directorate describes walls integrated with steep rock and records surviving religious and defensive structures.",
    interpretation: "Compare the obvious natural barriers with the places where walls or controlled entrances were needed. The topography helps explain what builders had to do to defend the site.",
    mapPrompt: "Rotate the relief to see the steep sides of the promontory. The present shoreline reflects the Birecik reservoir.",
    sources: [
      reading("Rumkale", "Gaziantep Provincial Culture and Tourism Directorate · Turkish", "https://gaziantep.ktb.gov.tr/TR-52351/rumkale.html", "A local account of the fortress, its setting and surviving buildings."),
      reading("Rumkale archaeological site", "Türkiye General Directorate of Cultural Heritage and Museums", "https://kvmgm.ktb.gov.tr/TR-207541/rumkale-oren-yeri-ziyarete-acilmistir.html", "The official record of the site opening under the Gaziantep Museum."),
    ],
    related: ["zeugma", "birecik", "samosata"],
  },
  samosata: {
    headline: "The old settlement and the relocated town",
    evidence: "The old settlement at Samsat was evacuated and the district centre was moved before the Atatürk reservoir covered the former town. The place is associated with ancient Samosata and has a much longer history than the modern replacement town.",
    interpretation: "A map search for Samsat can lead to two different locations. Use the historical account and maps to work out which settlement a source describes and when its information was recorded.",
    mapPrompt: "Find the present reservoir and compare it with a pre-dam sheet or CORONA frame. Be attentive to the difference between a modern place label and the older settlement.",
    sources: [
      reading("Samsat district history", "Adıyaman Provincial Culture and Tourism Directorate · Turkish", "https://adiyaman.ktb.gov.tr/TR-61341/samsat.html", "The local account records the 1988 evacuation and relocation."),
    ],
    related: ["nevali-cori", "arslantepe", "zeugma"],
  },
};

const urfaPlaces = new Set(["gobekli-tepe", "karahan-tepe", "sayburc", "harbetsuvan-tepesi", "nevali-cori", "harran", "edessa"]);

const urfaReadings = [
  reading("Taş Tepeler talks and events", "Taş Tepeler · archaeologists’ talks and project events",
    "https://tastepeler.org/en/events-news", "Find talks by field researchers on the regional excavations, artefacts and interpretations."),
  reading("Şanlıurfa Museum Neolithic catalogue", "Şanlıurfa Metropolitan Municipality · 2024 · Turkish and English",
    "https://www.sanliurfa.bel.tr/uploads/2025/20250901142857-32824-28081.pdf", "Illustrated object entries from the regional excavations."),
];

export function placeLesson(id: string): PlaceLesson | undefined {
  return lessons[id];
}

export function readingsForPlace(id: string): Reading[] {
  const local = lessons[id]?.sources ?? [];
  return urfaPlaces.has(id) ? [...local, ...urfaReadings] : local;
}

export function mapsForPlace(id: string): Reading[] {
  const local = lessons[id]?.maps ?? [];
  return [...local, ...(urfaPlaces.has(id) ? regionalMaps : regionalMaps.slice(urfaMaps.length))];
}

export function relatedPlaces(place: SiteFeature | WikiFeature, curated: SiteFeature[]) {
  const links = placeLesson(place.id)?.related ?? [];
  if (links.length > 0) {
    return links.flatMap((id) => {
      const match = curated.find((site) => site.id === id);
      return match ? [{ id, name: match.properties.name }] : [];
    });
  }

  const [east, north] = lonLatToMercator(...place.geometry.coordinates);
  const latitudeScale = Math.cos(place.geometry.coordinates[1] * Math.PI / 180);
  const { startYear, endYear } = place.properties;
  return curated.flatMap((site) => {
    if (site.id === place.id) return [];
    const [x, y] = lonLatToMercator(...site.geometry.coordinates);
    const distance = Math.hypot(x - east, y - north) * latitudeScale;
    if (distance < 1000 || distance > 120000) return [];
    const overlaps = startYear != null && endYear != null
      && pinsInRange([site], { start: startYear, end: endYear }, false).length > 0;
    return [{ id: site.id, name: site.properties.name, distance, overlaps }];
  }).sort((a, b) => Number(b.overlaps) - Number(a.overlaps) || a.distance - b.distance)
    .slice(0, 3)
    .map(({ id, name }) => ({ id, name }));
}

