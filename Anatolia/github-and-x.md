# GitHub repositories and X sources for SE Anatolia / Upper Mesopotamia Neolithic research

**Research date.** 11 November 2026 (Europe/Amsterdam).  
**Constraints.** Read-only. No starring, following, posting, DMs, or new accounts. No unpublished or candidate-site coordinates.  
**Rule.** Every repository URL below was returned by the GitHub search/API or opened as a live GitHub page in this pass. Star counts, last-push times, and SPDX licences are taken from the GitHub API at retrieval, except where noted. Last-push times below are converted from UTC to **Europe/Amsterdam (UTC+1)**. Anything not independently confirmed is marked **unverified**. Low-quality and pseudo-archaeology material is flagged as such and is not presented as fact.

This file is a standalone copy of the two sections also appended to `anatolia-data-sources.md`.

---

## Best starting repositories

These are the most useful, verified, actively maintained (or recently updated) codebases for the directions already identified in the data register: CORONA/KH-9 processing, tell/mound detection, relief visualisation, and gazetteers.

1. **iamdonovan/spymicmac** — the closest ready-made toolkit for **KH-9 and historical film**, wrapping IGN MicMac. Directly relevant if USGS HEXAGON or other unscanned/raw film is ever used; also a model for historical-image geometry.
2. **NeoGeographyToolkit/StereoPipeline** (NASA Ames Stereo Pipeline) — mature, heavily used stereo-photogrammetry suite. The standard open tool if a CORONA or KH-9 **stereo DEM** is attempted (with a documented workflow; not archaeology-specific).
3. **horengo/Orengo_et_al_2020_PNAS** plus the other **horengo/** GEE and relief scripts — the actual code behind the published Sentinel-1/2 mound detector and related papers, including Berganzo et al. 2021 DTM preprocessing and Multi-Scale Relief Model.
4. **alepistola/AI_floodplains** — companion code for Alessandro Pistola’s CORONA + AI work on the Mesopotamian floodplain (submitted/published in *PLOS One*; almost certainly the codebase for the 2025 “AI-ming backwards” paper, though the repo title uses an earlier working title). Low stars, last push October 2024, no licence file.
5. **EarthObservation/RVT_py** (and the QGIS / ArcGIS Pro ports) — Relief Visualization Toolbox: sky-view factor, local relief, and related DEM visualisations. The right first toolkit for GLO-30 / FABDEM hillshade work on the Germuş–Tektek plateaus.
6. **EarthObservation/adaf** — Automated Detection of Archaeological Features, same Slovenian Earth Observation group as RVT. Designed around LiDAR-scale features; methods are relevant, but 30 m DEMs will not support the same targets.
7. **isawnyu/pleiades.datasets** and **eamena-project/eamena-data** — open gazetteer / heritage data dumps (Pleiades actively updated; EAMENA data also published on Zenodo). Not Turkish excavation GIS, but the right open place-data pattern.
8. **xronos-ch/xronos.R** (and the confirmed web app **xronos-ch/xronos.rails**) — open radiocarbon infrastructure already listed in the data register.

---

## GitHub repositories

### A. CORONA / KH-9 / historical imagery processing

| Repository | Stars | Last push (Europe/Amsterdam) | Licence | What it does | Relevance | Maturity |
|---|---|---|---|---|---|---|
| [iamdonovan/spymicmac](https://github.com/iamdonovan/spymicmac) | 17 | 9 Oct 2026, 08:36 | GPL-3.0 | Python package for processing **KH-9 and historical aerial imagery** with IGN MicMac (orthorectification, camera geometry, DEMs). Conda-forge feedstock also exists. | **Highest-relevance processing toolkit** for Declass-2/3 HEXAGON and, by extension, other panoramic/mapping-camera film. CORONA KH-4B geometry is not identical; read the docs before assuming a drop-in KH-4B workflow. | Actively maintained in 2026; modest star count but a real scientific package with a conda feedstock. |
| [micmacIGN/micmac](https://github.com/micmacIGN/micmac) | 937 | 21 Oct 2026, 15:42 | NOASSERTION (IGN MicMac; typically CeCILL — confirm in the repo licence files) | Free open-source photogrammetry / SfM engine from IGN France. The backend used by sPyMicMac. | Core photogrammetry engine if a historical-film or UAV workflow is built from scratch. Steep learning curve. | Mature, actively maintained. |
| [luc-girod/MicMacWorkflowsByLucGirod](https://github.com/luc-girod/MicMacWorkflowsByLucGirod) | 37 | 13 Sep 2024, 10:31 | GPL-3.0 | Documented MicMac workflows (Luc Girod). | Useful accompanying examples; not SE Anatolia-specific. | Last push 2024; still a standard reference. |
| [NeoGeographyToolkit/StereoPipeline](https://github.com/NeoGeographyToolkit/StereoPipeline) | 627 | 11 Nov 2026, 09:55 | Apache-2.0 | NASA Ames Stereo Pipeline: automated stereo and geodesy tools, widely used to build DEMs from satellite stereo (including planetary and terrestrial film/satellite). | The main open option for a **CORONA/KH-9 stereo DEM** if a documented ASP workflow is followed. Not archaeology-specific; quality will depend on RPC/camera models and GCPs. | Very mature; pushed on the research date. Companion library: [visionworkbench/visionworkbench](https://github.com/visionworkbench/visionworkbench) (504 stars, Apache-related / NOASSERTION). |
| [friedrichknuth/hsfm](https://github.com/friedrichknuth/hsfm) | 42 | 27 Feb 2026, 11:26 | MIT | Automated structure-from-motion processing of **historical aerial photographs**. | Relevant if Turkish HGM historical aerials ever become accessible; not a CORONA tool. | Maintained into 2026; smaller project. |
| [CristianICS/create_neochannels](https://github.com/CristianICS/create_neochannels) | 0 | 30 Apr 2023, 08:20 | MIT | Computes band-combination “neochannels” for **cropmark detection**, with a `corona` topic. | Small, specialised preprocessing idea for cropmarks on historical or multispectral imagery. | Single early commit burst in 2023; treat as a snippet, not a platform. |
| [Bender1011001/GeoAnomalyMapper](https://github.com/Bender1011001/GeoAnomalyMapper) | 2 | 29 Jul 2026, 06:41 | NOASSERTION | Mixed repo: InSAR sinkhole/subsidence tools plus a Python reader for the open CORONA archive with GCP georeferencing to GeoTIFF. Topics also include mineral exploration and physics-informed neural nets. | The CORONA reader may be useful to inspect, but this is **not a peer-reviewed archaeological package**. Inspect carefully before reuse. | Low maturity / mixed purpose. |
| [praveenmaths89/kittur-corona-archaeology](https://github.com/praveenmaths89/kittur-corona-archaeology) | 0 | 21 Oct 2026, 19:55 | MIT | Untitled repo (no description); name indicates a CORONA archaeology case study at Kittur (India). Very large repository size in the API (~640k). | **Not a Near East project.** Do not treat as a Taş Tepeler resource. Contents were not opened beyond the API metadata. | Unreviewed; 0 stars. |

No official **CORONA Atlas / CAST (University of Arkansas)** source repository was found in this search. The public Atlas remains the web/WMS service already documented in the data register (https://corona.cast.uark.edu/atlas), not a GitHub code dump.

### B. ML / automated detection of mounds, tells, and sites

| Repository | Stars | Last push (Europe/Amsterdam) | Licence | What it does | Relevance | Maturity |
|---|---|---|---|---|---|---|
| [horengo/Orengo_et_al_2020_PNAS](https://github.com/horengo/Orengo_et_al_2020_PNAS) | 15 | 5 Jul 2026, 08:47 | None listed in the API | Google Earth Engine JavaScript for Orengo, Garcia-Molsosa, Conesa, Petrie et al. 2020, *PNAS*: automated mound detection with multi-sensor, multi-temporal Sentinel data. | **Direct methodological precedent** for Harran-plain / lowland tell detection. Will not transfer cleanly to limestone-hilltop T-pillar enclosures. | Small but official paper repo; touched in 2026. |
| [horengo/Orengo_Garcia-Molsosa_2019_JAS](https://github.com/horengo/Orengo_Garcia-Molsosa_2019_JAS) | 1 | 5 Jul 2026, 08:49 | None listed | GEE JavaScript for Orengo & Garcia-Molsosa 2019, *JAS* (“A brave new world for archaeological survey”). | Earlier GEE survey/automation paper code from the same group. | Same as above. |
| [horengo/Berganzo_et_al_2021_DTM-preprocessing](https://github.com/horengo/Berganzo_et_al_2021_DTM-preprocessing) | 1 | 5 Jul 2026, 08:51 | None listed | Script to preprocess DTMs for CNN detection of archaeological features (Berganzo et al. 2021, *Remote Sensing*). | Directly relevant to relief-based detectors; written for higher-resolution DTMs than GLO-30. | Official paper code, 2026 touch. |
| [horengo/MSRM-Multi-Scale-Relief-Model](https://github.com/horengo/MSRM-Multi-Scale-Relief-Model) | 0 | 5 Jul 2026, 08:52 | None listed | Multi-Scale Relief Model, originally *Earth Surface Processes and Landforms* 43 (2018). | Useful relief visualisation / feature-enhancement method for DEMs. | Official script, 2026 touch. |
| [horengo/Orengo_Petrie_2017_RS](https://github.com/horengo/Orengo_Petrie_2017_RS) | 2 | 5 Jul 2026, 08:48 | None listed | Seasonal multitemporal analysis of multispectral satellite data in GEE (*Remote Sensing* 2017). | Useful GEE pattern for seasonal crop/soil marks. | Official paper code. |
| [alepistola/AI_floodplains](https://github.com/alepistola/AI_floodplains) | 0 | 17 Oct 2024, 16:14 | None listed | Jupyter notebooks for a *PLOS One* submission, “A Thousand Years of Future: New Archaeological Discoveries in the Mesopotamian Floodplain with AI and CORONA Imagery” (topics: semantic segmentation, MANet). Author is Alessandro Pistola, lead author of the 2025 *PLOS One* paper “AI-ming backwards… automatic detection of sites on CORONA imagery.” | **The CORONA + deep-learning Mesopotamia codebase.** Almost certainly the companion repo for that paper (working title differs). Last push predates the 2025 publication; confirm against the paper’s data-availability statement. | Research code, not a packaged library; no licence listed. |
| [NMC-CRS/simulated-training-data-for-archaeological-site-detection](https://github.com/NMC-CRS/simulated-training-data-for-archaeological-site-detection) | 2 | 2 Sep 2026, 18:43 | MIT | Python scripts for a paper on using **simulated training data** to locate archaeological sites with ML. | Interesting when labelled sites are scarce; not Near East-specific without reading the paper. | Small, recently updated. |
| [AhmedMAMahmoud/EAMENA-MachineLearning-ACD](https://github.com/AhmedMAMahmoud/EAMENA-MachineLearning-ACD) | 1 | 21 Jan 2026, 16:55 | CC-BY-4.0 | EAMENA machine-learning **automated change detection** around heritage places. | Disturbance/monitoring, not mound discovery. Methodologically aligned with EAMENA practice. | Specialist, low stars. |
| [eamena-project/eamena-gee](https://github.com/eamena-project/eamena-gee) | 1 | 9 Oct 2023, 12:52 | None listed | EAMENA Google Earth Engine and automatic change detection repo. | Official-org GEE scripts; last push 2023. | Older official experiment. |
| [y-vasyunin/archeoml](https://github.com/y-vasyunin/archeoml) | 1 | 10 Sep 2023, 07:50 | None listed | Public dataset for archaeological site detection from EO imagery through ML. | Generic EO dataset; region and quality not reviewed here beyond the description. | Idle since 2023. |

No public GitHub repository was found in this pass for **Casana**, **Menze & Ur 2012**, or a packaged “tell detector” from CAST. Those remain literature/methods, not code dumps.

Low-quality or off-topic hits from the same searches (not recommended): several 0-star “sequenceDiagram” forks about Saruq Al-Hadid; `Alirazasadaq6/Ancient-Foundation-Detection-Using-Machine-Learning` (no stars, generic student project); `mamaofthree579-ship-it/archaeo-resonance-pipeline` (fringe “harmonic / symbolic” fusion — **not a scientific detector**).

### C. Relief visualisation toolkits

| Repository | Stars | Last push (Europe/Amsterdam) | Licence | What it does | Relevance | Maturity |
|---|---|---|---|---|---|---|
| [EarthObservation/RVT_py](https://github.com/EarthObservation/RVT_py) | 55 | 25 Aug 2026, 20:44 | Apache-2.0 | **Relief Visualization Toolbox** in Python (sky-view factor, analytical hillshading, local relief, and related visibilities). | **Best open relief toolkit** for the 30 m DEM milestone on the Germuş–Tektek plateaus and the Harran plain. | Actively maintained. Ports: [rvt-qgis](https://github.com/EarthObservation/rvt-qgis) (21 stars) and [rvt-arcgis-pro](https://github.com/EarthObservation/rvt-arcgis-pro) (19 stars), both Apache-2.0, updated 2026. |
| [EarthObservation/adaf](https://github.com/EarthObservation/adaf) | 16 | 23 Sep 2026, 14:10 | Apache-2.0 | ADAF, in the same ZRC SAZU / Earth Observation organisation as RVT. The GitHub **description field was empty** in the API result; the live repo page exists. Workshop materials: `EarthObservation/adaf_ws-archon26`. | Archaeological feature detection from high-resolution elevation (typically LiDAR). Methods (and the RVT derivatives it sits on) are relevant; **do not expect it to work on 30 m GLO-30 as if it were LiDAR**. | Actively maintained in 2026. Read the README before relying on a feature list. |
| [horengo/MSRM-Multi-Scale-Relief-Model](https://github.com/horengo/MSRM-Multi-Scale-Relief-Model) | 0 | 5 Jul 2026, 08:52 | None listed | See table B. | Complements RVT with a published multi-scale relief model. | Official script. |
| [leonsmolej/simple-local-relief-visualizer](https://github.com/leonsmolej/simple-local-relief-visualizer) | 0 | 22 Oct 2026, 11:19 | MIT | Small Python tool for Simple Local Relief Model visualisations from LiDAR DEMs, aimed at archaeological prospection. | Tiny alternative SLRM script. Prefer RVT_py for production use. | New (created Oct 2026), 0 stars. |

### D. Gazetteers, site databases, chronology

| Repository | Stars | Last push (Europe/Amsterdam) | Licence | What it does | Relevance | Maturity |
|---|---|---|---|---|---|---|
| [isawnyu/pleiades.datasets](https://github.com/isawnyu/pleiades.datasets) | 54 | 10 Nov 2026, 14:55 | NOASSERTION (Pleiades data are typically CC BY — confirm in the repo) | Platform-independent dumps of the **Pleiades** ancient-places gazetteer. | Best machine-readable Pleiades export. Stronger for classical/historical toponyms (Harran, Edessa/Urfa) than for PPN excavations. | Very actively maintained (pushed the day before this research). Related: [ryanfb/pleiades-geojson](https://github.com/ryanfb/pleiades-geojson) (10 stars, also pushed 10 Nov 2026); [isawnyu/pleiades-gazetteer](https://github.com/isawnyu/pleiades-gazetteer) is a planning/ticket repo, last push 2016. |
| [ekansa/gane](https://github.com/ekansa/gane) | **API star count not in this search**; live GitHub page confirmed | Not retrieved from the API in this pass | Confirm on the repo | “Gazetteer of the Ancient Near East Data.” Live page opened in this pass. | The GANE resource already noted in the data register. Not a Taş Tepeler excavation GIS. | Exists; treat stars/licence as **to be read from the repo page** when first cloned. |
| [eamena-project/eamena-data](https://github.com/eamena-project/eamena-data) | 0 | 14 Nov 2025, 13:58 | None listed | EAMENA reference/business data, “regularly published on Zenodo (DOIs).” | Official data-publication path. Public coordinate depth remains restricted, as already noted for the EAMENA database. | Official org repo. |
| [eamena-project/eamenaR](https://github.com/eamena-project/eamenaR) | 4 | 28 May 2025, 19:26 | MIT | R package for front-end statistical analysis of the EAMENA database. | Useful if EAMENA research access is later granted; not a TAY substitute. | Official, modest activity. |
| [eamena-project/eamena](https://github.com/eamena-project/eamena) and [eamena-arches-dev](https://github.com/eamena-project/eamena-arches-dev) | 1 and 5 | Oct 2026 and Aug 2025 | GPL-3.0 / AGPL-3.0 | EAMENA application and Arches-platform development. | Software, not a site catalogue export. | Official, active. |
| [xronos-ch/xronos.R](https://github.com/xronos-ch/xronos.R) | 7 | 10 Jun 2026, 15:09 | NOASSERTION | R client for the XRONOS radiocarbon API. | The practical client for the chronology infrastructure already in the data register. | Official, 2026 update. |
| [xronos-ch/xronos.rails](https://github.com/xronos-ch/xronos.rails) | Star count **not taken from the API** in this pass; live page confirmed (“Web application powering XRONOS…”) | Not retrieved from the API | Confirm on the repo (open-source, as stated on xronos.ch) | The XRONOS web application. | Source of the API already documented. | Official; page confirmed this pass. |

No public **TAY Project** GitHub repository was found. TAY remains a web inventory (http://www.tayproject.org/), not an open git dump.

### E. Göbekli Tepe / Taş Tepeler–named repositories

Most GitHub repositories whose names contain “Gobekli” or “Göbekli” are **unrelated software**, student websites, a board game, or **pseudo-archaeology**. None is an official DAI, Istanbul University, or Ministry excavation database.

| Repository | Notes |
|---|---|
| [monkeyboots584-a11y/gobekli-tepe-circuit-analysis](https://github.com/monkeyboots584-a11y/gobekli-tepe-circuit-analysis) | **Pseudo-archaeology.** Description claims Göbekli Tepe is a “topological quantum processor” / “planetary stabilization system.” Ignore. |
| [Jacob-Jeffries/gtf](https://github.com/Jacob-Jeffries/gtf) | “Gobekli Tepe Foundation — A Philosophy for the New Age.” **Not a scientific data repo.** |
| [package-foundry/gobekli_api](https://github.com/package-foundry/gobekli_api) | Unrelated: a Go API-key library that happens to use the name. |
| [musyilmaz/bga-gobeklitepe](https://github.com/musyilmaz/bga-gobeklitepe) | Board-game implementation, not site data. |
| [codemasterdevan/MP1-Gobekli-Tepe-Website](https://github.com/codemasterdevan/MP1-Gobekli-Tepe-Website) | Student website project. |
| Various 0-star personal dumps (`tahayoussef/gobekli-tepe-data-platform`, `hohair/Gobekli-Tepe`, `dsilberschmidt/gobekli-finder`, `CharlesCNorton/gobekli-verified`, `bahattinyunus/The-Gobeklitepe-Chronology-Crisis`) | **Not reviewed in depth.** None showed an official affiliation or a documented open excavation GIS in the API metadata. Do not treat as ground truth or as DAI/Museum data. |

The Zenodo ontoterminology deposit already listed in the data register (DOI 10.5281/zenodo.13370342) is still not an excavation GIS. No official DAI 3D or iDAI.field public repo was found in this pass.

### F. Earth Engine archaeology scripts (and general GEE tooling)

Prefer the **horengo/** and **eamena-project/eamena-gee** repositories in tables B and D over generic GEE tutorials. The following are widely used GEE *platforms*, not archaeology detectors, but they are the practical way to run the Orengo scripts and the Sentinel/Landsat/GLO-30 stack:

| Repository | Stars | Last push (Europe/Amsterdam) | Licence | Role |
|---|---|---|---|---|
| [gee-community/geemap](https://github.com/gee-community/geemap) | 4071 | 11 Nov 2026, 19:56 | MIT | Python interface for interactive GEE work. |
| [google/earthengine-api](https://github.com/google/earthengine-api) | 3481 | 11 Nov 2026, 04:34 | Apache-2.0 | Official Python/JS bindings. |
| [opengeos/Awesome-GEE](https://github.com/opengeos/Awesome-GEE) | 1259 | 26 Oct 2026, 02:43 | CC0-1.0 | Curated GEE resource list (may link further archaeology examples). |
| [google/earthengine-community](https://github.com/google/earthengine-community) | 831 | 7 Nov 2026, 16:50 | Apache-2.0 | Community tutorials. |

A Google account is required to run Earth Engine (no account was created in this research).

---

## X accounts and posts

Searches used the X public read tools only (`search_posts_all`, `get_users_by_usernames`). Queries were capped at 25 results, with a modest number of calls. Times below are **Europe/Amsterdam (UTC+1)**. Post URLs are as returned by the API. Official excavation news was cross-checked against ministry and press sources, not taken from alternative-history accounts.

### Credible accounts (verified as the named people or project)

| Account | Who | Why follow (read-only) | Notes |
|---|---|---|---|
| [@drleeclare](https://x.com/drleeclare) | Lee Clare. Profile: “Archaeologist and field director at #Göbeklitepe… personal account.” ~13,300 followers. Account created 17 June 2025. | The most useful single account in this pass: first-hand comments on current excavations, chronology, and explicit rebuttals of pseudo-archaeology. | Personal views, as the bio states. |
| [@jens2go](https://x.com/jens2go) | Jens Notroff, DAI archaeologist long associated with Göbekli Tepe research. ~18,800 followers. | Papers, site commentary, and pointers to mainstream coverage (e.g. a CNN feature on Sayburç, 22 Oct 2026). Also quoted as a specialist on the 2026 Karahan leopard sculpture in *Live Science* / Smithsonian reporting. | Credible specialist. |
| [@TasTepeler](https://x.com/TasTepeler) | “TAŞ TEPELER”, location Şanlıurfa, ~9,200 followers, 1,414 posts. | Project-adjacent public account. Recent posts in the sample were often cultural/tourism (e.g. “Karahantepe bread,” 13 Sep 2026) rather than excavation reports. | Useful to watch; do not treat every post as a scientific announcement. Handle is `TasTepeler` (not `tastepeler`). |
| [@necmikarul](https://x.com/necmikarul) | Display name Necmi Karul, İstanbul, ~1,800 followers, **only 19 posts**. | The excavation director’s name matches, but the account is almost unused and was not a source of the 2025–2026 announcements in this search. | Treat cautiously until a post from this handle is actually read. |
| [@FlintDibble](https://x.com/FlintDibble) | Flint Dibble, archaeologist, ~44,400 followers. | General sceptical commentary on pseudo-archaeology (Hancock, etc.), not a Taş Tepeler excavator. | Useful context, not a site diary. |
| [@ProfDrDusak](https://x.com/ProfDrDusak) | Prof. Dr Abdurrahim Dusak, AK Party Şanlıurfa MP (verified). | Posted 20 Sep 2025 from a site visit to Karahan Tepe with the Şanlıurfa governor and Princess Akiko of Mikasa. | Political/official visit, not an excavation report. |
| [@AntiquityJ](https://x.com/AntiquityJ) | *Antiquity* journal. | Posted 3 Dec 2024 on CORONA imagery used to find Roman forts on the Syrian steppe (link to a 2023 open paper). | Credible journal account; the paper is about Roman forts, not Taş Tepeler. |

Handles that **did not** resolve to the expected organisations in this lookup (do not use): `dainst` resolved to an unrelated empty account; `EAMENA` resolved to an unrelated software developer; `JasonUr` resolved to an unrelated empty account; `KTB_Bakanlik` was not found. Official DAI and EAMENA X accounts, if they exist under other handles, were not confirmed here.

### Useful posts and recent news (2025–2026), with independent sources

These are the excavation and research developments worth knowing. Where a find was first seen in a noisy X thread, it is included **only** after a ministry, Anadolu Agency, *The Art Newspaper*, *Live Science*, Smithsonian, or BIAA source confirmed it.

1. **Human-faced T-pillar at Karahan Tepe, announced 6 October 2025.** Türkiye’s Ministry of Culture and Tourism (Minister Mehmet Nuri Ersoy) announced the first T-shaped pillar with a carved human face from the Taş Tepeler excavations, found in a structure with domestic elements. Excavation director Necmi Karul has discussed it as evidence that T-pillars represent human figures. Official/press: https://engelsiz.ktb.gov.tr/TR-406821/bakan-ersoy-duyurdu-karahantepe39de-insan-yuzlu-t-bicimli-dikilitas-bulundu.html · https://www.iletisim.gov.tr/Turkce/yerel_basin/detay/karahantepede-tarihte-bir-ilk-insan-yuzlu-t-bicimli-dikilitas-bulundu-kars · https://www.theartnewspaper.com/2025/10/09/discovery-of-11000-year-old-carved-face-in-turkey-offers-new-insight-into-early-human-expression. On X, a clear summary (not the primary source) is https://x.com/madamarchaeo/status/1975169022250398181 (6 Oct 2025, 13:59 Europe/Amsterdam).

2. **More than 30 sunken huts / dwellings at Karahan Tepe, reported mid-October 2025.** Karul, speaking to Anadolu Agency, described more than 30 oval, partly bedrock-cut huts (about 3–6 m across), arranged around a central public building, with hearths, grinding stones and standing stones. This is field reporting, not yet a substitute for a full stratigraphic publication (how many stood at the same time is still an open question). Official/press: https://www.iletisim.gov.tr/Turkce/yerel_basin/detay/karahantepede-30dan-fazla-kulube-ortaya-cikarildi-sanliurfa · https://www.aa.com.tr/tr/kultur/karahantepe-kazilari-12-bin-yillik-yerlesim-gelenegini-gun-yuzune-cikariyor/3726411. On X: https://x.com/madamarchaeo/status/1979704884128624704 (19 Oct 2025, 02:23 Europe/Amsterdam).

3. **Leopard-rider composite statue at Karahan Tepe, announced 25 August 2026.** A ~70 cm limestone sculpture of a human sitting on a leopard, found on a bench in a ~3 m-diameter stone-floored building, announced by Minister Ersoy. Covered by Anadolu Agency, the Presidency’s communications office, *The Art Newspaper*, *Live Science*, and the Smithsonian; Jens Notroff commented to *Live Science* as an external specialist. Official/press: https://www.aa.com.tr/en/culture/11-000-year-old-sculpture-of-human-figure-riding-leopard-found-in-turkiye/4036700 · https://www.iletisim.gov.tr/Turkce/yerel_basin/detay/karahantepede-11-bin-yillik-kompozit-heykel-bulundu-sanliurfa · https://www.livescience.com/archaeology/middle-east/unlike-anything-seen-before-archaeologists-unearth-a-unique-11-000-year-old-statue-of-a-person-riding-a-leopard-from-one-of-the-worlds-earliest-settlements. On X, Lee Clare amplified the announcement: https://x.com/drleeclare/status/2092152002574684450 (25 Aug 2026, 09:28 Europe/Amsterdam).

4. **Mendik Tepe (University of Liverpool / BIAA / Şanlıurfa Museum, Douglas Baird) is a large PPNA site**, dated in the 2025 Heritage Türkiye report to about 10,000–9,000 cal BC, and described by Baird as seeming earlier than *most of what has so far been excavated* at Göbekli Tepe and Karahan Tepe — a careful field statement, not a claim that it overturns the Holocene chronology. BIAA PDF: https://biaa.ac.uk/wp-content/uploads/2026/01/18-HT2025-Mendiktepe.pdf · AA: https://www.aa.com.tr/en/culture/mendik-tepe-believed-to-predate-gobeklitepe-being-unearthed-in-southeastern-turkiye/3671673. Lee Clare has separately stated that there is **no evidence Karahan Tepe is older than Göbekli Tepe**, and that so far only Göbekli Tepe has produced PPNA radiocarbon dates: https://x.com/drleeclare/status/2076735886004298176 (13 Jul 2026, 20:29 Europe/Amsterdam).

5. **Taş Tepeler 5th-year briefing, 27 November 2025**, Şanlıurfa. Minister Ersoy presented new finds and described the programme as running at **12 excavation points** (including Ayanlar Höyük, started with a visit by Princess Akiko of Mikasa). Provincial notice: http://www.sanliurfa.gov.tr/bakan-ersoy-yeni-kesifleri-tanitti.

6. **Yoğunburç** is being excavated by a Chinese–Turkish team within Taş Tepeler. Clare pointed to a first brief report: https://x.com/drleeclare/status/2086463925126631425 (9 Aug 2026, 16:45 Europe/Amsterdam) and a follow-up https://x.com/drleeclare/status/2086779386766782948 (10 Aug 2026, 13:39).

7. **Clare on chronology and buildings (useful correctives).** T-pillars most likely appear from the late PPNA around 9000 BCE, with most built in the PPNB; lower levels reached in a small area at Karahan have no T-pillars: https://x.com/drleeclare/status/2067721699605316085 (18 Jun 2026, 23:30). Domestic buildings at Göbekli Tepe have been known and published for years: https://x.com/drleeclare/status/2088694262749606384 (15 Aug 2026, 20:28). 2026 season evidence for the PPNA round/oval to PPNB rectangular building shift: https://x.com/drleeclare/status/2092496896996565170 (26 Aug 2026, 08:18).

8. **CORONA on X.** This search did not turn up new 2025–2026 Near East detector releases. Useful older pointers: *Antiquity* on CORONA and Roman forts, https://x.com/AntiquityJ/status/1863874577622855740 (3 Dec 2024, 10:15); a 2023 *Antiquity* HEXAGON paper circulated at https://x.com/ijaganjac09/status/1718568346973548575; a geologist noting the University of Arkansas CORONA Atlas and USGS EarthExplorer, https://x.com/ch_gruetze/status/1854486611955737023 (7 Nov 2024, 12:30).

### Pseudo-archaeology / disputed claims to ignore (or read only as noise)

These accounts and frames dominate many Göbekli / Karahan searches. They sometimes circulate **real photographs of real announced finds**, then wrap them in lost-civilisation, Younger Dryas impact, or “secret chamber / buried civilisation” narratives. Use the ministry/Karul/Clare/BIAA sources above instead.

- **[@MEGALITHOMANIA](https://x.com/MEGALITHOMANIA)** (Hugh Newman / Megalithomania). High volume on Taş Tepeler, often first to post photos of newly announced objects, but the framing is alternative/megalithic tourism: winter-solstice “discoveries,” a Gaia episode “Taş Tepeler: Buried Civilization,” and repeated “secret chamber, 9400 BC” language (e.g. https://x.com/MEGALITHOMANIA/status/2001017893052453247, https://x.com/MEGALITHOMANIA/status/2106306259632713940). **Not an excavation project.** Do not cite as a primary source.
- **[@AndrewBCollins](https://x.com/AndrewBCollins)** (Andrew Collins), alternative author, circulating the same “Beast Rider” material with Newman (https://x.com/AndrewBCollins/status/2094205466419040762).
- **Younger Dryas impact / lost advanced civilisation claims** applied to Göbekli Tepe, Karahan Tepe, or Sayburç. Lee Clare has addressed this directly: archaeology of the Younger Dryas is “a very different story from the pseudoarchaeological narrative” (https://x.com/drleeclare/status/2089424390001692745, 17 Aug 2026, 20:49); Sayburç was not “founded by survivors of the Younger Dryas Impact” (https://x.com/drleeclare/status/2090884061447540752, 21 Aug 2026, 21:29); excavation expansion at Göbekli Tepe is part of the official Geleceğe Miras / Taş Tepeler programme, “not the personal achievement of an internet” personality (https://x.com/drleeclare/status/2088152602827452799, 14 Aug 2026, 08:35); and a short “pseudo-grifter bingo” of lost knowledge / deliberate burial / pre-flood civilisation tropes (https://x.com/drleeclare/status/2079317400713859548, 20 Jul 2026, 23:27).
- **Graham Hancock–style** and adjacent YouTube ecosystems (Bright Insight, Ethical Skeptic threads, “they have stopped excavating,” calendar-from-Pillar-43 as settled fact, quantum or “circuit” readings of the architecture). These are disputes in public media, not excavation results. Official research remains a Pre-Pottery Neolithic landscape of hunter-gatherer and early sedentary communities in the early Holocene — extraordinary architecture, not a lost industrial civilisation.

---

## Method notes

- GitHub: `search_repositories` via the cursor-github connector, 11 November 2026. Queries that used only `user:` / `repo:` qualifiers joined by OR were rejected by GitHub and were rerun as separate searches. Broad keyword queries returned many false positives (e.g. Adafruit “RVT,” Eclipse “Pleiades,” generic GEE tutorials); those were discarded.
- X: public `search_posts_all` and `get_users_by_usernames` only. No posts, follows, likes, or DMs. Recent excavation claims that originated in alternative accounts were kept only when a ministry, AA, or specialist source confirmed them.
- This document does not recommend field visits, downloads of restricted data, or the publication of unpublished coordinates.
