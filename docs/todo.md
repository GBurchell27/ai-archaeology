# To do

Written 2026-11-19. Background and before/after screenshots for everything here are in `data/splat/_diagnose/overnight_log.md` (not in git). How the splats are built is in `scripts/splat/README.md`.

## Features to build

Ideas agreed on 2026-11-19. The reasoning behind them is in [`philosophy.md`](philosophy.md). No aesthetic changes are wanted: these are features. Focus stays on Anatolia and the very ancient.

- [ ] **1. A "Questions and theories" layer. Build first.**
  - A theory is a record of its own, like a site: the claim, who proposes it, the sites it touches, evidence for, evidence against, what would settle it, and a status from the ladder in `philosophy.md`.
  - Each piece of evidence is its own entry with a source and a kind: measurement, excavation, experiment, text, argument.
  - Status changes are logged with a date and a reason. Nothing is deleted.
  - Measured facts are stored apart from readings of them (for the Great Pyramid: alignment, block weights, the dated workers' town are facts; "power plant" is a theory attached to them).
  - Draft the record format first, then seed it with Göbekli Tepe and Giza.
  - `AGENTS.md` already allows attributed, graded theories in their own layer.
- [ ] **2. "What we don't know" on landmark cards.** A second tab on each walk-view card listing its open questions, each linking to theory records. Göbekli Tepe to start: how the pillars were moved, roofed or open, why the enclosures were buried, what Pillar 43 depicts.
- [ ] **3. A theory lens on the globe and map.** Pick a theory and the sites it touches light up, with its status and evidence in a side card. Pick a site and see every theory that touches it.
- [ ] **4. Named eras beside the date slider.** Date bands stay, since they work worldwide. Era chips depend on where the view is: Pre-Pottery Neolithic and Hittite over Anatolia, Old Kingdom over Egypt. A few are global (the end of the last Ice Age, the Bronze Age collapse). Needs a small sourced table of periods per region.
- [ ] **5. One settings panel.** Layers, timeline, base map, theme, labels and walk options are scattered. One panel with the same sections in every view, plus a few presets ("Deep past", "Megaliths only").
- [ ] **6. "Follow this site" links.** No API. A curated list per site of accounts and pages to follow (X accounts, excavation project pages, feeds), opening in a new tab. Stored as a small data file of names and links.
  - [ ] **Owner:** collect the account names and say which site or topic each belongs to.
  - [ ] Then: the data file, a section on the site card, and a "Follow" list for the whole atlas.
- [ ] **7. A puzzles index.** One page listing the standing questions across all sites (the heaviest blocks, the oldest dates, the most precise alignments), each a measured fact with its source, linking to the theories that try to explain it.
- [ ] **8. Experiments beside claims.** Where a claim is "this could not be done with the tools of the time", show the experimental archaeology that tested it (stone moving, cutting, lifting), for and against, on the same card.
- [ ] **9. Context layers for the deep past.** Sea level and ice extent through time on the globe, and the Younger Dryas interval marked on the timeline, each from a registered source, so date-based questions can be looked at against the world as it was.
- [ ] **10. Going global.** The close-up terrain already opens for any published site. Next: a regional atlas generated on demand, as Şanlıurfa has. Giza is the second walkable site: plentiful open data, and the centre of the questions above.
- [ ] **11. A reading list per site.** The excavation reports and the main books on every side, each labelled by kind (excavation report, peer-reviewed paper, popular book).

## Sharper Göbekli Tepe photographs (the splat)

The splat is sharp only near where photographers stood. 41 of 294 downloaded photographs trained it; the rest never linked. Views from anywhere else dissolve into streaks. In rough order of value for effort:

- [ ] **1. Link more of the photographs we already have.** Free, runs on the laptop, needs the GPU only for the retrain.
  - Rerun COLMAP with learned features in place of SIFT: `--FeatureExtraction.type ALIKED_N16ROT` (or `ALIKED_N32`) and a LightGlue matcher (`--FeatureMatching.type`, see `colmap exhaustive_matcher -h`). They match across much larger changes of angle and light.
  - Needs four small ONNX model files from COLMAP's GitHub releases (the URLs are the defaults of the `*_model_path` options). Record the download in `docs/data-sources.md`.
  - Use the roofed-era photographs only (2018 and later) and drop stitched panoramas.
  - Then undistort, train in Brush (`--sh-degree 0`), convert with the evidence cull, realign, and move the landmark positions (`PHOTOGRAPHS_POSITIONS_M` in `Anatolia/atlas/lib/walk/gobekliTepeLandmarks.ts`; scripts in `data/splat/_diagnose/landmarks/`).
  - Expect: more sharp directions around Enclosures B, C and D. Not every angle.
- [ ] **2. Hide what the photographs never saw.** Free, no GPU.
  - Fade splats out as the walker moves away from the training camera positions, so the trainer's guesses stop showing as streaks.
  - Mark the sharp viewpoints (the camera positions) so a visitor can jump between them.
  - Adds no detail; it stops the mess showing.
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
- [ ] Commit the overnight work (nothing is committed).

## Check on the real GPU

Everything overnight was judged in a software-rendered test browser.

- [ ] Frame rate in Göbekli Tepe's Photographs mode (872,000 splats) and in both models.
- [ ] Mouse look, the dive transition, and the pixel ratio settling without visible resizing.
- [ ] Zooming into a site from the map must arrive walking, not flying (R recovers it).
- [ ] Thin dotted vertical lines on Karahan Tepe's built east wall: real, or a test-renderer artefact?

## Known gaps

- [ ] No collision with walls or pillars; steps cannot be climbed.
- [ ] Without a mouse a visitor can move but not turn.
- [ ] The repeat-visit fix for the splat (`components/walk/SiteSplat.tsx`) relies on drei 10.7 internals: recheck on an upgrade.
- [ ] The "Periods" panel on the map closes after about 3 s under a resting pointer.
- [ ] The selected-site image window is graded for Göbekli Tepe; Sayburç, Nevalı Çori and Harran are much darker and want a per-window gain.

## Accuracy to confirm against the sources

- [ ] Göbekli Tepe dimensions were read from a web summary of Haklay & Gopher 2020, not the PDF.
- [ ] Göbekli Tepe: Enclosures D and C are drawn as circles; they are oval, but only one diameter was found.
- [ ] Karahan Tepe: Structure AB is drawn 2.3 m deep against a published 3.5 m; which side of AB Structure AA lies on is a guess; Structure AD's pillar heights are estimates; the porthole's height follows from those estimates.
- [ ] Karahan Tepe: Karul's publications after 2021 were not found.
