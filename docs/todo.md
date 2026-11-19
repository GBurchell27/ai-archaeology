# To do

Written 2026-11-19. Background and before/after screenshots for everything here are in `data/splat/_diagnose/overnight_log.md` (not in git). How the splats are built is in `scripts/splat/README.md`.

## Features built on 2026-11-19, and what is left of each

Features 1 to 8 and 11 of the list agreed on 2026-11-19 are built; [`world-atlas.md`](world-atlas.md) and [`theories.md`](theories.md) describe them. Everything was judged in a software-rendered test browser. What remains:

- [ ] **Theory records: sources read only second-hand.** The Merer papyri, Bauval & Gilbert, Hancock, Krupp, Fairall and Dunn records rest on Wikipedia or publisher blurbs; Banning 2011, Stocks 2001, Bonani et al. 2001 and Dash's 3.6 arcminutes on abstracts, press releases or a note in another paper. Read the originals or mark the records.
- [ ] **Theory records: no rows in `data-sources.md`.** The published sources cited under `lib/theories/` are not registered there yet.
- [ ] **Theory records: first statuses.** Each is one reading of the listed evidence. The owner should review them, above all the slope-slide fill and inhabited-settlement theories (contested) and the power plant (unsupported so far).
- [ ] **Reading lists: details not confirmed.** Pages for Clare 2020, Notroff et al. 2017, Sweatman & Tsikritsis 2017 and Hauptmann 1993 and 1999; the one-line notes on the books are descriptions, not quotations. The Tepe Telegrams blog would not open and is left out.
- [ ] **6. Follow links. Owner:** collect the social accounts. Only official project pages are listed; the place for accounts is the end of `FOLLOW_LINKS` in `lib/reading/followLinks.ts`.
- [ ] **4. Named periods.** Only Anatolia and Egypt have a table. Pottery Neolithic, Chalcolithic, Early Bronze Age and the Hittite Old Kingdom and Empire split are left out because no source would open. Hittite and Phrygian dates are one site's sequence (Gordion). The Younger Dryas dates come from a handout reproducing Rasmussen et al. 2014, not the article.
- [ ] **9. Sea level and ice extent through time on the globe.** Not built: it needs a registered dataset, and no dataset is downloaded without the owner asking. The Younger Dryas band on the timeline is built.
- [ ] **10. A regional atlas generated on demand.** Not built. Giza is walkable (model only).
- [ ] **10. Giza model.** The present heights of Khafre and Menkaure, and that they lie south-west of Khufu, rest on Wikipedia; replace with a survey. Lehner, the AERA survey notes and Nell & Ruggles's full text were not read. The Sphinx, temples, causeways, boat pits and queens' pyramids are not drawn for want of a source giving both size and position.
- [ ] **5. Settings panel.** The place view has none. "Megaliths only" does nothing on the Anatolia map, which has no site type filter.

## Sharper Göbekli Tepe photographs (the splat)

The splat is sharp only near where photographers stood. 41 of 294 downloaded photographs trained it; the rest never linked. Views from anywhere else dissolve into streaks. In rough order of value for effort:

- [ ] **1. Link more of the photographs we already have.** Free, runs on the laptop, needs the GPU only for the retrain.
  - Rerun COLMAP with learned features in place of SIFT: `--FeatureExtraction.type ALIKED_N16ROT` (or `ALIKED_N32`) and a LightGlue matcher (`--FeatureMatching.type`, see `colmap exhaustive_matcher -h`). They match across much larger changes of angle and light.
  - Needs four small ONNX model files from COLMAP's GitHub releases (the URLs are the defaults of the `*_model_path` options). Record the download in `docs/data-sources.md`.
  - Use the roofed-era photographs only (2018 and later) and drop stitched panoramas.
  - Then undistort, train in Brush (`--sh-degree 0`), convert with the evidence cull, realign, and move the landmark positions (`PHOTOGRAPHS_POSITIONS_M` in `Anatolia/atlas/lib/walk/gobekliTepeLandmarks.ts`; scripts in `data/splat/_diagnose/landmarks/`).
  - Expect: more sharp directions around Enclosures B, C and D. Not every angle.
- [x] **2. Hide what the photographs never saw.** Built 2026-11-19: the whole splat fades with distance from the nearest training camera (full within 6 m, gone at 22 m), and the camera positions are marked and can be stepped between.
  - [ ] The fade is one opacity for the whole scene, so the aerial overview is lost. `SHARP_WITHIN_M` and `GONE_BEYOND_M` in `lib/walk/photoViewpoints.ts` are the dial.
  - [ ] It patches one line of drei 10.7's splat shader: recheck on an upgrade.
  - [ ] In the photographs a landmark card sometimes shows after a viewpoint step and is gone within a second. Not investigated.
- [ ] **3. A trainer built for tourist photographs.** Needs an NVIDIA GPU, so a rented one for a few hours.
  - Candidates: nerfstudio `splatfacto-w` or another "in the wild" Gaussian-splat method (per-photo appearance), with depth or normal regularisation against floaters.
  - Brush, used now, treats all photographs as one consistent scene and has no such guidance.
- [ ] **4. Better source material.** The real fix.
  - A continuous video walk round the visitor walkway, or a few hundred overlapping photographs from one visit. Own footage, or footage with permission.
  - No openly licensed video of either site was found (Commons, Openverse, Europeana, Internet Archive).

## Karahan Tepe photographs

- [ ] The splat is a fragment from 17 photographs; open sources have no more site imagery. Tasks 1, 3 and 4 above apply here too.
- [ ] Decide on the Sketchfab models: a whole-site model under CC BY (built from someone else's drone footage, so its licence is unverified) and per-structure models under CC BY-NC-SA. Download needs a signed-in account.

## Decisions waiting

- [ ] Satellite as the terrain map's default base. Compare `map_review_2/after/9_turkey_satellite.png` with `8_globe.png`.
- [ ] Shelter roof in the Göbekli Tepe splat: the streak cull removed its far side. The uncut file is `data/splat/gobekli-tepe/gobekli-tepe.hd-unculled.splat`.
- [ ] Browser Back after "← Anatolia map" returns to the walk. Keep or skip that entry.
- [ ] A globe card for a site the map does not have opens the map with nothing selected and no message.
- [ ] Karahan Tepe: a walker who starts in Structure AD cannot leave on foot, because no entrance is published and none is drawn. Keep, or add a labelled way out.
- [ ] Late Bronze Age collapse is shown as a worldwide period chip, though it is an eastern Mediterranean event.
- [ ] The splat is fully faded 22 m from every camera. Keep, or leave a faint overview for a flyer.

## Check on the real GPU

Everything overnight was judged in a software-rendered test browser.

- [ ] Frame rate in Göbekli Tepe's Photographs mode (872,000 splats) and in both models.
- [ ] Giza: frame rate, the 900 m shadow map, depth precision, walking speed (five times the other sites), and a faint horizontal line seen on Khufu's far face.
- [ ] Collision and keyboard turning (arrows, Page Up and Page Down) together with mouse look.
- [ ] The lifted site windows at Sayburç, Nevalı Çori and Harran.
- [ ] Mouse look, the dive transition, and the pixel ratio settling without visible resizing.
- [ ] Zooming into a site from the map must arrive walking, not flying (R recovers it).
- [ ] Thin dotted vertical lines on Karahan Tepe's built east wall: real, or a test-renderer artefact?

## Known gaps

- [ ] Collision is for a walker in the models only. Göbekli Tepe's benches and pedestals are walked through, and there is no touch input.
- [ ] The repeat-visit fix for the splat (`components/walk/SiteSplat.tsx`) relies on drei 10.7 internals: recheck on an upgrade.

## Accuracy to confirm against the sources

Checked on 2026-11-19 against Haklay & Gopher 2020, Karul 2021 and Schmidt 2010 as published. Still open:

- [ ] Göbekli Tepe: Enclosures D and C are oval but only a maximum diameter is published (14 m, 11 m), so both are drawn as circles.
- [ ] Karahan Tepe: Structure AB stays 2.3 m deep, read by eye off the scale bar of Karul 2021 Fig. 8; the 3.5 m is on the Taş Tepeler page only.
- [ ] Karahan Tepe: Structure AD's pillar heights and the porthole's height are in no source found.
- [ ] Karahan Tepe: Karul 2021 Fig. 3 suggests AD is about 19 m east to west, against the 23 m circle drawn; Fig. 2 suggests AB sits on AD's north-south axis, not 3 m west.
- [ ] Karahan Tepe: no open excavation report later than 2021 was found.
