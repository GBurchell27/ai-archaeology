# Roadmap

Written 2026-11-28. This page is the direction: the vision, and the milestones that carry it. The tasks that hit each milestone are in [`todo.md`](todo.md), tagged with the same id. When a design choice is unclear, [`philosophy.md`](philosophy.md) decides it.

A milestone is finished when its success criteria are true. Size, licence and risk sit here so a task does not have to repeat them. "Unconfirmed" means the licence was not read for this page: do not download. A dataset is cleared only by a row in [`data-sources.md`](data-sources.md). A theory is added only by the steps in [`theories.md`](theories.md).

Nothing here is a discovery. A candidate stays a candidate. The atlas reports who says what.

## Vision

A visitor can stand in a published ancient place, and read the boldest idea about that place beside the evidence, with the author named.

The places are the ones with a sense of mystery. The idea the owner wants on the table is a lost advanced civilisation, as Graham Hancock and similar authors argue it in *Fingerprints of the Gods* (1995), *America Before* (2019) and the series *Ancient Apocalypse*. The idea is welcome. It is a theory. It is not a fact, it does not change a site's published date or description, and it is not drawn into a model as if it had been excavated.

Other periods are in scope when the place itself is genuinely interesting for that question. The walks already built, Göbekli Tepe, Karahan Tepe and Giza, stay. They are part of the same question, not a finished chapter to leave behind.

The panel the visitor reads is "Hancock's claim and the published evidence" only as a heading in these docs. A theory record does not use the word "mainstream": `scripts/check_theories.mts` rejects it, along with "fringe", "debunked" and "proves". The record names the person, the source, the evidence on each side, and a rung of the status ladder.

## Direction

1. **M1.** Finish the Giza plateau so the walk shows what published sources support, and stops where they stop.
2. **M2.** Write the claim-and-evidence record for each priority site, including the two walks that already exist.
3. **M3.** Add walkable model-and-splat twins, one site at a time, in the interest order below, and only as far as open terrain and open photographs allow.
4. **M4.** Make those visits work on a phone, through time, and as a tour someone can share.
5. **M5.** Later work that needs a licence first, or that is not on this list.

M2's writing for sites other than new Giza geometry may proceed during M1. M3 waits until M1's success criteria are met. M5 waits until Stonehenge and the next site in M3 have shipped, unless the owner pulls one item forward.

Work that keeps the live site running, accounts, the existing splats, and decisions not yet taken, is not a milestone. It stays under Ongoing in [`todo.md`](todo.md).

## Already in flight

These are not new milestones.

- The Giza walk stands on a 6 km GEM-15 ground with a Sentinel-2 drape. What remains of the plateau is M1.
- A separate photograph spike is testing openly licensed pictures of the Sphinx, the Sphinx Temple and the Valley Temple. It does not train a splat and it does not change the app. No second harvest.
- Single-pass SAR Doppler tomography is [issue 17](https://github.com/GBurchell27/ai-archaeology/issues/17) and `docs/sar/`. The 2022 method paper was retracted on 10 August 2026 (`docs/sar/method-audit.md`). No drawing of shafts until Gate C.
- On 2026-11-28 the open issue list held issue 17 only. This repository has no `competitor-idea` label. No text or data was taken from Ancient Content, from Hancock's books, or from the series, beyond naming the works and the sites they feature.

## M1. Close the Giza plateau

**Goal.** A visitor walking Giza can see the three pyramids on the surveyed ground, and can tell what was measured, what was estimated, and what was left out.

**Success.**

- Khafre's and Menkaure's present heights come from a survey that has been read, or they stay marked `[EST]` with the weak source named.
- The Sphinx, temples, causeways, boat pits and queens' pyramids are drawn only where one opened source gives both size and position.
- The Sphinx photograph spike's result is written down, including a result of "not enough photographs".
- Passages Petrie published (1883, chapter 7) may be a schematic. The ScanPyramids Big Void (Morishima and others 2017, *Nature*) and the north-face corridor (Procureur and others 2023, *Nature Communications*) are a hypothesis layer, off by default, purpose unstated. Both papers are opened before a figure is typed. No figure is copied.
- No shaft from the SAR work is drawn.
- Frame rate, the shadow map and the walk on a phone are noted, or the limit is written in the todo.

**Data and licence.** Petrie is already in [`data-sources.md`](data-sources.md). GEM-15 is CC BY 4.0. Sentinel-2 is Copernicus. The two muon papers are citations; their licences were not confirmed here, so nothing is reproduced from them.

**Risk.** A muon deficit drawn as a room, or joined to the Khafre-shaft claim in M2.

## M2. Hancock's claim and the published evidence

**Goal.** For every site below, the atlas shows the claim, who makes it, and the published evidence on both sides. A lost-civilisation sentence is never the site's own description.

**Success.**

- Each site has a theory record, or a one-line skip that says the opened sources did not contain the claim.
- The claim source was opened. A publisher blurb or a video summary is not enough. Where a record already exists and was read second-hand, the original is opened or the record is marked.
- Evidence on both sides, a status, and `scripts/check_theories.mts` passing.
- The retracted Gunung Padang paper is cited as retracted. Its dates are not the site's published date, and its pyramid is not drawn.
- Yonaguni is not drawn as a building. Bimini is not drawn as a constructed road.
- The Giza record of an Ice Age plan already exists (`giza-older-lost-civilisation`). It is revised from the book, not duplicated.

Open the chapter before naming a page. Where the claim is not in the three works named above, name the book or episode that was opened. Do not attribute a chapter from memory.

| Site | Where he features it | The other side, to open before a status |
| --- | --- | --- |
| Göbekli Tepe and Karahan Tepe | His later work, not *Fingerprints* (1995). *Magicians of the Gods* (2015) and the series. The walks already exist. | The excavators' records already in `lib/theories/`. Reuse them. Schmidt, Clare, Karul. |
| Giza | *Fingerprints*, with Bauval. The Ice Age plan, Orion, and the power plant are already records. | Add the 2025 Biondi and Malanga Khafre claim only after its paper and the 2026 retraction are opened. Add Kunkel, *Pharaoh's Pump* (1962; revised 1967), only after the book is opened. Draw neither. |
| Gunung Padang | *Ancient Apocalypse*, season 1, episode 1, as listed on his site. | Natawidjaja and others, *Archaeological Prospection*, 20 October 2023, [doi:10.1002/arp.1912](https://doi.org/10.1002/arp.1912), retracted 18 March 2024, [doi:10.1002/arp.1932](https://doi.org/10.1002/arp.1932). The editors say the radiocarbon samples were soils not tied to artifacts or features that could be reliably read as human-made, so the claim of a pyramid built 9,000 or more years ago does not stand. The authors disagree with the retraction. The hilltop terraces are a separate published site: open the Indonesian excavation report for their date. |
| Yonaguni | Treated in this literature as a drowned structure. Confirm the passage. | Schoch's own account: the form is bedrock, jointed and bedded sandstone of the Yaeyama Group, with the same kind of steps on the modern coast. He reads it as primarily natural. Kimura reads surfaces as shaped. Ogata and others 2019 read the island's terraces as weathering along joints. Open all three. |
| Bimini Road | *Ancient Apocalypse*, season 1, episode 4. Also long discussed as a road to Atlantis. | McKusick and Shinn 1980, *Nature* 287, "Bahamian Atlantis reconsidered", and Gifford and Ball 1980. Oriented cores of beachrock, layers dipping seaward, read as a natural sheet broken in place. Open the papers before quoting an age. |
| Baalbek | The trilithon and the quarry megalith, as work beyond the builders usually credited. Confirm the chapter. | The Roman temple project and any report of a pre-Roman terrace. Open both. No status until then. Dimensions only from the survey that was read. |
| Puma Punku and Tiwanaku | *Fingerprints*. Precision stonework as a lost technique. | The Tiwanaku archaeology (open Janusek or Vranich, or the report that replaces them) and Protzen's cutting trials. Open them before describing a tool. |
| Sacsayhuamán | *Fingerprints*. Polygonal masonry as older than the Inca. | Colonial descriptions and the archaeological attribution to the Inca. Open both. |
| Teotihuacan | *Fingerprints*, tied to the Quetzalcoatl story. | The city's published archaeology. The Feathered Serpent tunnel, the reported liquid mercury, and the robotic probe are finds of the INAH project (Sergio Gómez Chávez). Open those reports. They are facts once sourced, and they are not themselves the lost-civilisation claim. |
| Nan Madol | A drowned or lost-Pacific reading. Confirm the chapter. | The Saudeleur complex in the published record (open McCoy or Athens before a date). |
| Malta: Ħal Saflieni and Ġgantija | Temples and the hypogeum as older, or more knowing, than the usual account. Confirm the chapter. | The Neolithic excavation record. Heritage Malta's own page says photography is not allowed inside the Hypogeum. Acoustic claims need the study that measured them. |
| Serpent Mound | *America Before*, set beside other earthworks and Stonehenge as a shared legacy. *Ancient Apocalypse*, season 1, episode 6, visits North American mounds. | Herrmann and others 2014 and Romain and others 2017 argue an Early Woodland build with a later repair. Fletcher and others 1996 dated samples to the Fort Ancient period. Lepper argues the bulk-sediment dates run old. The dating is contested. A solstice alignment, if measured, does not by itself date the mound or establish a lost civilisation. |
| Derinkuyu | *Ancient Apocalypse*, season 1, episode 7, as a refuge. | The underground city is rock-cut, so the cutting is hard to date. Open a report before stating a century. Byzantine use is the occupation most often published; earlier phases are argued. A hand-mill is not a date if it could have been carried in later. |
| Stonehenge | *America Before* names it beside the Ohio earthworks. | The 2024 provenance papers are findings, kept apart from any lost-civilisation claim. Clarke and others, *Nature*, 14 August 2024, [doi:10.1038/s41586-024-07652-1](https://doi.org/10.1038/s41586-024-07652-1): the Altar Stone matched to Old Red Sandstone of the Orcadian Basin, at least 750 km, sea transport suggested by the authors. Bevins and others 2024 argue it is probably not from the Anglo-Welsh Basin. Parker Pearson and others 2024, *Archaeology International*, restate the Preseli quarries (Carn Goedog, Craig Rhos-y-felin) and answer the glacial-transport claim. A 2026 *Journal of the Geological Society* paper reports that examined Orcadian outcrops do not reproduce the stone's full signature. Name no quarry, and draw no source pin, until that paper is opened. |
| Machu Picchu, Carnac, Newgrange | On the walk list because the owner asked. Write a Hancock record only if an opened chapter claims them. | Machu Picchu: the Inca estate in the published record. Carnac: the Neolithic alignments. Newgrange: O'Kelly's record of the midwinter light through the roof-box, which is an observation, not a lost-civilisation claim. |

**Risk.** Copying his sentences. Letting a retracted date become the catalogue date. Drawing Yonaguni, Bimini or the Gunung Padang "pyramid" so that the picture argues the claim.

## M3. Walkable model and splat sites

**Goal.** After M1, a visitor can walk the next places the same way as Göbekli Tepe: a schematic model from published dimensions, and photographs where an open set actually links.

**Success.**

- One site at a time, in the order below. Stonehenge is first.
- The model uses figures from a source that was opened. Estimates are `[EST]`. The footer names the source.
- A splat is trained only from public domain, CC0, CC BY or CC BY-SA photographs, per file. The gate already used for the Sphinx spike applies: about 40 photographs registered in one model, or the site ships as a model only. Share-alike results stay in their own files under CC BY-SA.
- A `data-sources.md` row exists before any download.
- No drone flight for the atlas. Stonehenge: English Heritage allows personal photography and forbids drones over the monument. Machu Picchu: the Ministry's code of conduct forbids drones, tripods and commercial filming. The Hypogeum: no photography on site, so no interior splat.
- The address is a catalogue id. No coordinate in the link.
- Gunung Padang's retracted pyramid is not a model. Yonaguni and the Bimini Road are not walks.

Interest is the owner's order: Hancock's sites and the mystery list first. Feasibility decides whether that site is a splat, a model, or a record only. It does not silently drop a site.

| Order | Site | Feasibility | Ground and pictures |
| --- | --- | --- | --- |
| 1 | Stonehenge | High. Start here. | Environment Agency lidar composite, Open Government Licence v3.0, already described, not downloaded until the product page is re-read. Commons photographs, per file. Show the 2024 stone origins as sourced findings on the card. |
| 2 | Puma Punku and Tiwanaku | Model first. Count Commons files before promising a splat. | Copernicus GLO-30 (already cleared) or GEM-15 where the tile exists (CC BY 4.0). No Bolivian lidar until a row clears it. |
| 3 | Sacsayhuamán, then Machu Picchu | Commons visitor photographs. No drone. | Same terrain rule. Two walks, not one merged model. |
| 4 | Teotihuacan | The avenue and the pyramids can be a model. The tunnel cannot be a splat: it is closed. | GLO-30 or GEM-15. INEGI stays unconfirmed and is not required. Tunnel geometry only from the opened INAH reports. |
| 5 | Baalbek | Model of the trilithon and the quarry megalith if a survey gives sizes. | Confirm Commons coverage. No drone survey whose rights are unclear. |
| 6 | Malta | Ġgantija can be a model and, if photographs link, a splat. The Hypogeum is a model from a published plan. | Heritage Malta forbids photography inside the Hypogeum. |
| 7 | Derinkuyu | A model of the published plan. A full-city splat is unlikely. | Turkey, so the atlas's existing terrain sources apply where they cover Cappadocia. Confirm before download. |
| 8 | Nan Madol | Low until the photograph count is done. Islets will not read on a 30 m DEM. | GLO-30 is the cleared fallback and is too coarse to be the model. No paid lidar. |
| 9 | Serpent Mound | An earthwork on a terrain walk, not a building splat. | Open a lidar or DEM licence before download. Dating stays contested (M2). |
| 10 | Carnac | Rows of stones on a lidar ground, if the tile exists. | IGN LiDAR HD is Licence Ouverte 2.0 on data.gouv.fr (read 2026-11-28). Coverage of France is incomplete. Confirm a published tile for the alignments in Morbihan before download. |
| 11 | Newgrange | Exterior model. The light-box animation is M4. | The open topographic collection on data.gov.ie is stated CC BY 4.0 and includes Discovery Programme surveys. Brú na Bóinne has been shown from that collection. The registered Roscommon tile is not this landscape. Confirm the Meath tile and its attribution before download. |
| 12 | Gunung Padang | Surface terraces only, from a report that is not the retracted paper. | Columnar basalt is easy to mistake for cut stone. The model says what the opened report says. |

**Risk.** A thin photograph set trained into streaks, as at Karahan Tepe. A phase or a lost-civilisation plan drawn as the excavated record. Copying a plate.

## M4. A visit that can be followed

**Goal.** The new walks, and the ones already built, can be used on a phone, moved through time, and handed to someone else as a link.

**Success.**

- A phone can move and look in a walk without a keyboard. Keyboard and `prefers-reduced-motion` stay. Targets are at least 44 px.
- One published change is tied to the playhead. The first candidate is the midwinter light through Newgrange's roof-box, reconstructed from O'Kelly's published observation, source on the footer. The Giza casing against today's core is the alternative, because the layout already separates them. A hypothesis stays off until the visitor turns it on.
- The ice layer's limits stay honest: no sea-level figure until a curve is registered.
- Tour captions name a source. A Giza stop waits until M1 has reported. The wonders route's empty captions can be filled the same way.
- A shared walk carries the site id and, when needed, `source=photographs`. It does not carry a coordinate, and it does not turn on the recording-pattern layer.
- The news list shows the date it was last checked. It stays hand-kept.
- Suggest-a-site, after sign-in exists, asks for a published name and a source address. It has no field for a latitude or a longitude.

**Risk.** An animation that looks like a film of the past. A suggestion that names a lootable place.

## M5. Later, and only with a licence

**Goal.** Work that is real but not this direction yet: a recall test, an offline shell, an embed, and sites the owner did not put on the mystery list.

**Success.**

- Not started until Stonehenge and the next M3 site have shipped, unless the owner pulls an item forward.
- INEGI's terms are in `data-sources.md` before any download. The score is recall on published sites. Shareable output is a coarse cell or a point moved by at least 5 km. No public pin. A hit is not a discovery. No restricted Maya lidar and no paid data.
- The offline shell caches only files the site already publishes. Splats stay on the network for the first pass.
- An embed accepts a published site id and nothing else. Imagery follows the basemap decision already taken for the hosted copy (NASA Blue Marble by default).
- Çatalhöyük, Hattusa, Nemrut, Karnak, Petra and Angkor stay off this queue. A regional atlas generated on demand stays here too. Each needs the owner to pull it forward.

**Risk.** The lidar window is the looting risk. An unresolved licence means the window stays closed.

## Ongoing

The live site, accounts, the Göbekli and Karahan splats, Vercel checks, decisions waiting, and the accuracy list are not milestones. They remain in [`todo.md`](todo.md) so they are not lost. They do not jump the queue.

## What was read

[`philosophy.md`](philosophy.md), [`todo.md`](todo.md), [`theories.md`](theories.md), [`data-sources.md`](data-sources.md), the Giza and Göbekli theory ids, and [`world-atlas.md`](world-atlas.md) for what the app already does. Merged pull requests through 19. The retraction notice for the Gunung Padang paper. Clarke and others 2024 on the Altar Stone (the journal page). Heritage Malta on Hypogeum photography, English Heritage on drones at Stonehenge, and the Machu Picchu code of conduct. data.gouv.fr for the IGN LiDAR HD licence, and data.gov.ie for the open topographic collection's stated licence. Episode titles as listed on grahamhancock.com. No book chapter was taken as read.
