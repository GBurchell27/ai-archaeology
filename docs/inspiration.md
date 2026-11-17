# Inspiration and credits

Open projects, datasets and papers that informed the world atlas. This file says what each one is, its licence, and what this repository took from it: a dependency, data, or an idea only.

Licences are the ones the GitHub API or the publisher's page reported on 17 November 2026. Every link below answered on that day unless a note says otherwise. Data licences are also recorded in [`data-sources.md`](data-sources.md), which is the register that counts.

## Dependencies

Code this repository installs and runs.

| Project | Licence | Used for |
| --- | --- | --- |
| [NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) (`3d-tiles-renderer` 0.5.4) | Apache-2.0 | The globe surface. Its `GeneratedSurfacePlugin` builds the WGS84 ellipsoid and drapes streamed XYZ imagery on it, and its `GlobeControls` give the orbit, zoom and tilt. See `Anatolia/atlas/components/globe/GlobeSurface.tsx`. |
| three.js, React Three Fiber, drei, Next.js, React | MIT | The rest of the web app, as before the globe. Versions are in `Anatolia/atlas/package.json`. |
| NumPy, SciPy, scikit-learn, rasterio, Pillow (via matplotlib) | BSD-style and similar | The Python side: the catalogue merge, the covariate grids and the model. Versions are in `pyproject.toml`. |

## Data sources

Published records and grids. The licence and the access path of each one are in [`data-sources.md`](data-sources.md).

| Source | Licence | What it gives |
| --- | --- | --- |
| [Wikidata](https://www.wikidata.org/) | CC0 1.0 | Most of the site catalogue, and the coordinates of the featured monuments. |
| [Pleiades](https://pleiades.stoa.org/), also mirrored at [isawnyu/pleiades.datasets](https://github.com/isawnyu/pleiades.datasets) | CC BY 3.0 for the data. The GitHub repository reports no single licence. | Ancient places of the Mediterranean and Near East, with period dating. The atlas reads the daily JSON dump, not the GitHub mirror. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | ODbL 1.0 | The separate megalith layer. |
| [people3k/p3k14c](https://github.com/people3k/p3k14c) (Bird et al. 2022, [doi:10.1038/s41597-022-01118-7](https://doi.org/10.1038/s41597-022-01118-7)) | CC0 for the data, citation requested. The repository itself is an R package with its own licence file. | Radiocarbon dates. Dating only. Its coordinates are fuzzed on purpose and never place a pin. |
| [XRONOS](https://xronos.ch/) (code at [xronos-ch/xronos.rails](https://github.com/xronos-ch/xronos.rails), MIT) | CC BY 4.0 for the data | Radiocarbon dates. Dating only. |
| IntCal20 (Reimer et al. 2020, [doi:10.1017/RDC.2020.41](https://doi.org/10.1017/RDC.2020.41)) | Published curve | The anchors of the coarse radiocarbon-to-calendar lookup were checked against the curve file at `https://intcal.org/curves/intcal20.14c`. |

## Ideas only

Nothing from these projects is installed or copied. They shaped a decision.

| Project | Licence | What was learned |
| --- | --- | --- |
| [takram-design-engineering/three-geospatial](https://github.com/takram-design-engineering/three-geospatial) | MIT | How a convincing atmosphere is built. The globe uses a much simpler rim-glow shell of its own (`GlobeAtmosphere.tsx`). |
| [vasturiano/three-globe](https://github.com/vasturiano/three-globe) and [globe.gl](https://github.com/vasturiano/globe.gl) | MIT | The idea of data layers on a globe: points, labels and rings as separate layers. |
| [mapbox/supercluster](https://github.com/mapbox/supercluster) | ISC | Hierarchical point clustering was considered. The globe ended up with one-degree buckets and screen-space count badges (`lib/globe/siteGrid.ts`, `lib/pinCluster.ts`), which was enough for one draw call per block. |
| [janarosmonaliev/github-globe](https://github.com/janarosmonaliev/github-globe) and [shuding/cobe](https://github.com/shuding/cobe) | MIT | Look and feel: a dark, quiet globe where the data glows. |
| [cambecc/earth](https://github.com/cambecc/earth) | MIT | The globe is the interface. Chrome stays small and out of the way. |
| [EarthObservation/RVT_py](https://github.com/EarthObservation/RVT_py) | Apache-2.0 | Which relief visualisations matter for archaeology. `ai_archaeology.relief` is a separate, smaller implementation after Zakšek, Oštir and Kokalj (2011). |
| [britishlibrary/peripleo](https://github.com/britishlibrary/peripleo) and the [World Historical Gazetteer](https://whgazetteer.org/) | MIT (Peripleo). WHG's code repository reports no standard licence. | Linked-places thinking: a record keeps its identifiers in other gazetteers, and a link is stronger evidence than nearness. The merge links Wikidata and Pleiades by identifier first. |
| [earth-chris/elapid](https://github.com/earth-chris/elapid) | MIT | A reference for presence-only modelling in Python. The model here uses scikit-learn directly. |
| Kiel "Megaliths of Europe" (Müller, Kruckenberg, Großmann and Luckner, [repository entry](https://landman.roots.uni-kiel.de/repository/125); paper: [A Map of European Megaliths](https://www.jna.uni-kiel.de/index.php/jna/article/view/1452), Journal of Neolithic Archaeology 25) | CC BY 4.0 on the repository entry | Not ingested. It is the first candidate for a next source: 17,409 published megalithic tombs. See [`world-catalogue.md`](world-catalogue.md). |

## Deliberately not copied

| Project | Licence | Why not |
| --- | --- | --- |
| [Arches](https://github.com/archesproject/arches) and the EAMENA platform built on it ([eamena-arches-dev](https://github.com/eamena-project/eamena-arches-dev)) | AGPL-3.0 | Network copyleft. Nothing was copied, and the atlas does not run it. The EAMENA database also restricts site coordinates, for good reasons, so its records are not a source either. |
| GPL-licensed tools noted in [`Anatolia/github-and-x.md`](../Anatolia/github-and-x.md), for example [eamena-project/eamena](https://github.com/eamena-project/eamena) (GPL-3.0) and the deprecated [pelagios/peripleo](https://github.com/pelagios/peripleo) (GPL-3.0) | GPL-3.0 | Copyleft. Read for method, not copied. |
| [mister-magpie/tell_segmentation](https://github.com/mister-magpie/tell_segmentation), the code for Casini et al. 2023 | No licence file | With no licence there is no permission to reuse. The paper was read. The code was not copied. |
| [The Megalithic Portal](https://www.megalithic.co.uk/) | All rights reserved | Not a source. The site refused the automated link check (HTTP 403), which is its right. |

## Papers the model design leaned on

- Yaworsky, Vernon, Spangler, Brewer and Codding (2020). Advancing predictive modeling in archaeology: an evaluation of regression and machine learning methods on the Grand Staircase-Escalante National Monument. *PLOS ONE* 15(10). [doi:10.1371/journal.pone.0239424](https://doi.org/10.1371/journal.pone.0239424). Compare a simple regression with a tree model and report held-out skill.
- Phillips, Dudík, Elith, Graham, Lehmann, Leathwick and Ferrier (2009). Sample selection bias and presence-only distribution models: implications for background and pseudo-absence data. *Ecological Applications* 19(1), 181–197. [doi:10.1890/07-2153.1](https://doi.org/10.1890/07-2153.1). The target-group background.
- Roberts and others (2017). Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure. *Ecography* 40, 913–929. [doi:10.1111/ecog.02881](https://doi.org/10.1111/ecog.02881). Block cross-validation.
- Hirzel, Le Lay, Helfer, Randin and Guisan (2006). Evaluating the ability of habitat suitability models to predict species presences. *Ecological Modelling* 199, 142–152. [doi:10.1016/j.ecolmodel.2006.05.017](https://doi.org/10.1016/j.ecolmodel.2006.05.017). The continuous Boyce index.
- Kvamme (1988). Development and testing of quantitative models. In Judge and Sebastian (eds), *Quantifying the Present and Predicting the Past*. US Bureau of Land Management. The gain statistic. No online copy was checked for this file.
- Casini, Marchetti, Montanucci, Orrù and Roccetti (2023). A human–AI collaboration workflow for archaeological sites detection. *Scientific Reports* 13. [doi:10.1038/s41598-023-36015-5](https://doi.org/10.1038/s41598-023-36015-5). A detector is a reading aid for an archaeologist, not a finder.
- Orengo and others (2020). Automated detection of archaeological mounds using machine-learning classification of multisensor and multitemporal satellite data. *PNAS* 117(31). [doi:10.1073/pnas.2005583117](https://doi.org/10.1073/pnas.2005583117).
- Menze and Ur (2012). Mapping patterns of long-term settlement in Northern Mesopotamia at a large scale. *PNAS* 109(14). [doi:10.1073/pnas.1115472109](https://doi.org/10.1073/pnas.1115472109).

The last two are regional mound detectors with high-resolution imagery and field checks. They are the reason this repository does not claim that a 0.25° global layer finds anything.
