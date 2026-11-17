# The world catalogue

Code: `src/ai_archaeology/world/`. Scripts: `scripts/fetch_world_*.py`, `scripts/fetch_featured_coordinates.py`, `scripts/build_world_catalogue.py`. Output: `Anatolia/atlas/public/world/`.

The catalogue holds **published site records from open sources**. No detector output is an input, and no candidate or unpublished location may enter it. Numbers in this file are from the build of 17 November 2026.

## Sources

Licences are registered in [`data-sources.md`](data-sources.md). Read that row before changing an ingester.

| Source | Licence | Records | What it contributes |
| --- | --- | ---: | --- |
| Wikidata | CC0 1.0 | 99,885 | Most pins. Name, point, type, sitelink count, Wikipedia link, image, heritage listing, World Heritage and Pleiades identifiers, sparse dating. |
| Pleiades | CC BY 3.0, "Pleiades contributors" | 24,970 read, 17,365 left as their own pins after the merge | Ancient places of the Mediterranean and Near East. Most of the dating in the catalogue. |
| OpenStreetMap megaliths | ODbL 1.0, "© OpenStreetMap contributors" | 15,845 | A separate layer. Never merged with the two above. |
| p3k14c | CC0, cite Bird et al. 2022 | 35,250 dated sites | Dates for pins that already exist. Its coordinates are fuzzed on purpose. |
| XRONOS | CC BY 4.0 | 46,521 dated sites | Dates for pins that already exist. |
| Featured list | curated in this repository | 396 | Dates, a category, a status and one line of text for the best-known early monuments. No coordinates. |

What each ingester keeps:

- **Wikidata** (`wikidata_world.py`, `sparql_client.py`). Two kinds of class tree. Megalithic and monumental trees (megalith, dolmen, menhir, stone circle, henge, passage grave, nuraghe, talaiot, tell, pyramid, ziggurat, geoglyph, stone row, burial mound, cairn, platform mound, rock art and their subclasses) are taken whole. The general trees (archaeological site, tumulus, hillfort) are kept only when the item has a Wikipedia article, because most of the rest are register stubs. Shipwrecks are excluded. An item needs a coordinate on Earth and a label in one of 17 languages. Items that are plainly modern (a museum, a memorial, land art, or a non-ancient type with an inception after 1800) are rejected. The run rejected 7,298 unnamed items, 3,217 without an article, and 1,004 modern ones. Featured monuments are always kept.
- **Pleiades** (`pleiades_world.py`). Places with a representative point, a name, and at least one archaeological place kind. Rivers, mountains, regions, peoples and Pleiades' own placeholders are left out. `locationPrecision` is `exact` only when Pleiades marks a location as precise.
- **OpenStreetMap** (`osm_megaliths.py`). Nodes and ways tagged `historic=archaeological_site` with `archaeological_site=megalith`, or carrying a `megalith_type`. A way is placed at its centre.
- **Radiocarbon** (`radiocarbon_sites.py`). One record per site, with the span of its dates.

## The source record

Every ingester writes `data/world/sources/<source>.jsonl`, one JSON object per line. The shape is the `WorldSite` dataclass in `records.py`, which validates on construction.

| Field | Meaning |
| --- | --- |
| `id` | `Q123` for Wikidata, bare digits for Pleiades, `osm-n123` or `osm-w123` for OpenStreetMap. Must match `^(?:Q\d+\|[a-z0-9]+(?:-[a-z0-9]+)*)$`. |
| `name`, `lon`, `lat` | The published name and point. |
| `source` | `wikidata`, `pleiades` or `osm`. |
| `licence`, `attribution`, `sourceUrl` | Carried on every record. Borrowed dating is appended, for example `CC0; dating: CC BY 4.0`. |
| `siteType` | One of `settlement`, `tell`, `megalith`, `tumulus`, `enclosure`, `monumental`, `geoglyph`, `rock-art`, `cave`, `necropolis`, `ritual`, `city`, `other`. |
| `types` | The source's own type labels. |
| `ids` | Cross-references: `wikidata`, `pleiades`, `osm`, `whs`, `xronos`. Null when unknown. |
| `startYear`, `endYear` | Integers, negative for BCE, or null. |
| `datingSource` | `wikidata`, `pleiades`, `c14`, `featured`, `label` (a year read off an OpenStreetMap tag) or `none`. |
| `importance` | Wikidata sitelink count. 0 when unknown, which is always the case for Pleiades and OpenStreetMap. |
| `wikipedia`, `image`, `heritage` | Optional. |
| `locationPrecision` | `exact` or `rough`. Only the Pleiades ingester sets `rough`. The design also named `centroid`, and nothing writes it. |

Radiocarbon records are a different, smaller shape in `data/world/dating/xronos_sites.jsonl`: `name`, `lon`, `lat`, `startYear`, `endYear`, `nDates`, `periods`, `source`. Both compilations share that one file.

## Build order

`scripts/build_world_catalogue.py` does these steps in this order. The order matters.

1. **Coordinate fixes.** Wikidata records listed in `featured_coordinate_fixes.json` are moved to their published location.
2. **Implausible dates are removed.** A start before 3.4 million years ago, or a start after its end, is treated as no date. Ten Wikidata records lost a geological "inception" this way.
3. **Featured curation.** Curated dates replace source dates. The curated category fills in a type only where the source said `other`. A featured monument that Wikidata did not return is added from its fetched coordinate. None needed that in this build.
4. **Merge** Wikidata with Pleiades.
5. **Radiocarbon dating** of sites that still have no date.
6. **Packing** into the web files. OpenStreetMap joins only here, as its own file.

Featured comes before the merge so that a featured monument is still de-duplicated against Pleiades. The later steps only date undated sites, so curated dates win.

## Merge and de-duplication

`merge.py: merge_published`. OpenStreetMap records are refused with an error.

1. **By identifier.** A Wikidata item that names a Pleiades id is that place. The item is kept, and the Pleiades record is absorbed. 5,987 places were linked this way.
2. **Spatially**, for the Pleiades places left over. Only Wikidata items that name no Pleiades id are candidates for a match: an item that names a different Pleiades place is by its own statement somewhere else. A place matches the nearest item within **3 km** that has the **same folded name** (lower case, diacritics and Turkish letters folded, letters and digits only). Nearness alone never merges: in a dense site the next monument is metres away, and a wrong merge is worse than a second pin. An item absorbs one place at most. When several places claim it, the nearest wins and the others stay.

   1,618 places were linked this way.
3. Everything else stays. A different monument nearby is a different record.

When a place is absorbed, the Wikidata record wins: its name, point and type are kept. It gains the Pleiades id. If it has no date and the Pleiades place has one, it takes that date, and the Pleiades credit and licence are appended to its own.

99,885 Wikidata records and 24,970 Pleiades places became 117,250 sites.

## The featured tier

`featured_monuments.json` is a hand-kept list of 396 monuments, keyed by Wikidata QID. It carries **no coordinates**. Those come from Wikidata when the catalogue is built.

Each entry has exactly these fields: `qid`, `name`, `country`, `category`, `period`, `startYear`, `endYear`, `datingConfidence`, `status`, `why`, `source`. `featured.py: featured_problems` enforces the rules. `tests/test_world_featured.py` runs it on the committed list, checks that the list holds no coordinate keys, and checks that every coordinate fix cites a source.

- `category`: `megalith`, `city`, `settlement`, `burial`, `rock-art`, `other`, `pyramid-or-platform`, `monumental-enclosure`, `earthwork`, `rock-cut`, `tell`, `geoglyph`.
- `status`: `accepted` (385), `contested` (7), or `natural-or-pseudo` (4). The last two are listed so a claim can be weighed against the evidence. The interface marks them.
- `datingConfidence`: `high`, `medium` or `low`.
- `why`: at most 40 words. Plain, no superlatives it cannot support.
- `source`: a link a reader can check.

### Add an entry

1. Find the Wikidata item. It needs a coordinate (P625).
2. Add the object to `featured_monuments.json` with all eleven fields.
3. Run `pytest tests/test_world_featured.py`.
4. Rebuild. The coordinate is fetched by `scripts/fetch_featured_coordinates.py`, and the item is included in the Wikidata harvest by its `--featured` argument. Both are downloads, so the owner has to ask for them. Then run `scripts/build_world_catalogue.py`.

### Correct an entry

Dates, wording and status are edited in `featured_monuments.json`.

A wrong location is fixed in `featured_coordinate_fixes.json`, and only there:

```json
"Q16571176": {
  "lon": -67.535, "lat": -9.877,
  "source": "https://doi.org/10.1073/pnas.1614359114",
  "reason": "Wikidata P625 is the Acre state centroid, about 330 km from the geoglyphs; Watling et al. 2017 give Fazenda Colorada at …"
}
```

The rule: **a fix must cite a published source that gives the location**, and say in `reason` how far off the Wikidata point is. A fix is allowed only for a monument on the featured list, and its coordinates are given to three decimals at most, about 100 m. A test enforces all of this. The file is for points that are wrong by more than about 10 km. It is not a place to refine a location by eye, and it is never a place for an unpublished one. There are three fixes today, each with a DOI. The better long-term fix is to correct Wikidata itself.

## Radiocarbon dating

`radiocarbon_sites.py` turns each compilation into one record per site. `dating.py: attach_radiocarbon` attaches a record to a site only when all of these hold:

- the site has no date yet
- the two **name keys** are equal
- the radiocarbon record lies within **5 km** of the site

The nearest such record wins. In this build 756 sites were dated this way.

The name key is the folded name with generic site words removed ("cave", "tell", "tomb", "of", "la" and so on), so "Cave of El Castillo" matches "Castillo". Numbers are never dropped, and at least one word of four or more letters must remain. Otherwise the whole folded name is the key. That stops a register stub such as "Odensala 460:1" from taking a parish's date.

**Coordinates.** Radiocarbon coordinates decide whether a name match is plausible and nothing else. No function writes a radiocarbon longitude or latitude onto a site, and no radiocarbon record becomes a pin. p3k14c blurs its locations on purpose, and this respects that.

**The calendar conversion is approximate.** Uncalibrated 14C ages are turned into calendar years by a piecewise-linear lookup through 40 anchors read off the IntCal20 curve (Reimer et al. 2020). Measured against the curve every 100 14C years, it is within about 280 years (mean about 40) back to 15,000 BP, and within about 700 years (mean about 150) from there to 50,000 BP. Plateaus and wiggles are flattened. Measurement error is ignored. It is good enough to place a site in the right millennium on a timeline. It is not a calibration. Use a real calibration library if a finer date is ever needed.

A site's span is its oldest and youngest date. With 20 dates or more it is the 5th to 95th percentile, so one stray date does not stretch it.

## Web files

Static JSON under `Anatolia/atlas/public/world/`, written by `web_pack.py`. The TypeScript side of the same shapes is `Anatolia/atlas/lib/world/catalogueTypes.ts`. Coordinates are rounded to 5 decimals, about one metre.

A **column block** holds one array per field, all the same length:

```
{"id": […], "name": […], "lon": […], "lat": […], "type": […],
 "start": […], "end": […], "importance": […], "source": […], "featured": […]}
```

`type` indexes `index.json.siteTypes`. `source` indexes `index.json.sources`. `featured` is 1 or 0. Rows are ordered best known first.

| File | Contents |
| --- | --- |
| `index.json` | `generated`, `count`, `coreCount`, `siteTypes`, `sources` (each with `id`, `name`, `licence`, `attribution`, `url`, `count`), `cellDegrees` (10), `cells` (key → count), `osmMegaliths` (`count`, `file`), `namesFile`. |
| `core.json` | A column block of the 40,000 sites the globe loads at once. |
| `cells/<key>.json` | A column block of the other sites in one 10° × 10° cell. `key` is `<lonIndex>_<latIndex>`, with `lonIndex = floor((lon + 180) / 10)` (0–35) and `latIndex = floor((lat + 90) / 10)` (0–17). |
| `names.json` | The search index for every site outside the core: `id`, `name`, `lon`, `lat`, `type`, `start`, `end` only. Fetched when the search box is first used. |
| `featured.json` | An array of `id`, `name`, `lon`, `lat`, `country`, `category`, `period`, `startYear`, `endYear`, `datingConfidence`, `status`, `why`, `source`. The point is the merged record's. |
| `detail/<bucket>.json` | `{id: record}` for every site, including OpenStreetMap ones. `bucket` is the last two characters of the id, lower-cased. A record has `lon`, `lat`, `name`, `licence`, `attribution`, `datingSource`, `ids`, and, only when present, `wikipedia`, `image`, `types`, `heritage`. `sourceUrl` is stored only when it differs from the one the id implies. Fetched when a site card opens, and read by the close-up API to turn an id into a point. |
| `osm-megaliths.json` | A column block of the OpenStreetMap layer. |

**What goes in the core** (`split_core`): every featured site, then two ranked lists share the rest of the 40,000. About a quarter goes to Pleiades-only places, ranked by being dated, exactly located, of a leading type, and long-lived. The rest goes to Wikidata records by sitelink count, with megaliths, monumental buildings and geoglyphs counted double, and dated sites ahead on a tie. Pleiades gets a fixed share because it has no sitelink count and would otherwise never appear from orbit.

The build is deterministic: the same inputs give the same bytes. `--generated` sets the date stamp.

## Sizes

There is no enforced size limit. The build prints the sizes, and these are the ones to watch, because the browser pays for them:

| File | Size in this build | When it is fetched |
| --- | ---: | --- |
| `index.json` | 3 KB | at start |
| `core.json` | 2.6 MB | at start |
| `featured.json` | 148 KB | at start |
| `names.json` | 4.8 MB | first use of search |
| `cells/` (184 files) | 5.2 MB in all, largest 2.4 MB | by cell, below 2,500 km |
| `detail/` (100 shards) | 33.5 MB in all, largest 354 KB | one shard per opened card |
| `osm-megaliths.json` | 1.2 MB | when the layer is switched on |

The whole folder is 47 MB and is committed. The sizes above are uncompressed. A new source that adds many sites should grow the cells and the detail shards, not the core. The largest cell is `19_14` (10–20°E, 50–60°N). If it grows much further, a smaller cell size is the fix.

## Known data problems

- **Type "other".** 20,005 sites, about one in six, have no usable type. Wikidata's class labels did not match any rule, or the item is typed only as "archaeological site". The type filter cannot separate them.
- **Register stubs.** 76,358 sites have a sitelink count of 0. Many are a name, a point and a register number. They are real published records, and they carry little else.
- **Sparse dating.** 30,374 of 117,250 sites have a date (25.9%). Of those, 21,145 come from Pleiades, 8,084 from Wikidata, 756 from radiocarbon and 389 from the featured list. A Wikidata "inception" is sometimes the year a monument was registered. Inceptions after 1900 on ancient types are dropped for that reason.
- **Uneven coverage.** Using rough longitude and latitude boxes, 89,503 of the 99,885 Wikidata records fall in Europe, 4,525 in Asia, 2,806 in Africa and the nearer Near East, 2,243 in North America, 680 in South America, and 73 in Oceania. Pleiades is 78% in the Europe box and has nothing outside the ancient Mediterranean world and the Near East. The OpenStreetMap megaliths are 98% European.
- **Rough locations.** 709 sites carry a Pleiades location that is not marked precise. The globe draws them like any other point.
- **Duplicates that survive.** Two records for one place stay separate when neither names the other's identifier and their folded names differ, however close they are. "Tumulus de Péré" and "Péré tumulus" are two pins. That is the price of never merging two different monuments.
- **Castles and fortresses typed "other".** About 5,500 Wikidata records classed as castle, castle ruin, fortress or fortification match no type rule. The Pleiades mapping puts the same kinds under "enclosure". The Wikidata rules are left alone because the change would shift the suitability model's labels.
- **OpenStreetMap overlap.** The megalith layer is not de-duplicated against the catalogue, by design. Switching it on shows some monuments twice.

## Sources deliberately not ingested

| Source | Why not |
| --- | --- |
| The Megalithic Portal | All rights reserved. |
| EAMENA | Site coordinates are restricted, to protect the sites. |
| Australian state heritage registers | Site locations are restricted. |
| Sources under CC BY-ND | A merged, re-typed catalogue is a derivative. |
| Sources under a non-commercial licence, as catalogue data | A non-commercial condition would attach to the committed catalogue files. The globe imagery is NC, but it is streamed and is not part of the catalogue. |
| Fuzzed radiocarbon coordinates | Used for dating only. They never place a pin. |

A source that restricts its coordinates is not to be worked around by taking the same points from somewhere else.

## Sources that would improve coverage next

In rough order of value for the effort. "Licence read" means the licence text was read for this project and is, or can go, in `data-sources.md`. "Not yet read" means the licence named here is what the publisher is understood to use, and it must be read on the publisher's page before any download. Record counts are approximate and unverified.

| Priority | Source | Stated licence | Records | Licence status | Why |
| ---: | --- | --- | ---: | --- | --- |
| 1 | Kiel "Megaliths of Europe" (Müller and others) | CC BY 4.0 | 17,409 megalithic tombs | Licence line read on the Kiel repository entry. Download terms not yet read. | One curated, typed, dated dataset for the class the atlas is about. |
| 2 | UNESCO World Heritage List, through the Wikidata identifier P757 | CC0 as Wikidata data | not counted | Licence read (Wikidata). | Already harvested as `ids.whs`. Needs only a flag and a filter, no new download. |
| 3 | Ireland, Sites and Monuments Record | CC BY 4.0 | about 151,000 | Licence read. Registered for the cross-region check. | Typed, dense, authoritative. Would fix Ireland and test the cell sizes. |
| 4 | Historic England, National Heritage List (scheduled monuments) | Open Government Licence | about 20,000 | Not yet read. | Typed and authoritative for England. |
| 5 | Canmore, Scotland | Open Government Licence | about 320,000 | Not yet read. | Very dense. Needs filtering to archaeological classes. |
| 6 | Norway, Askeladden | NLOD | about 220,000 | Not yet read. | Dense, typed. |

All six are European or already in hand. None fixes the real gap, which is open, coordinate-bearing inventories for Africa, Asia, the Americas and Oceania. Where such inventories exist they are often restricted for good reasons. Any new source goes into its own ingester, writes the same source record, gets a row in `data-sources.md` first, and joins the merge only if its licence allows it to be combined. A share-alike source gets its own file and layer, as OpenStreetMap has.

## Tests

`pytest tests/test_world_wikidata.py tests/test_world_pleiades.py tests/test_world_osm_megaliths.py tests/test_world_radiocarbon.py tests/test_world_featured.py tests/test_world_catalogue.py tests/test_world_catalogue_web.py`

All inputs are synthetic, apart from the committed featured list.
