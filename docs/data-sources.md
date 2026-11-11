# Data sources

Public datasets considered for this project. A dataset is not cleared for use until its licence, coverage, and access method are filled in.

The SE Anatolia / Upper Mesopotamia register is [Anatolia/data-sources.md](../Anatolia/data-sources.md). Read each licence there before use. It is a research note, not a download list, and it does not clear a dataset by being mentioned.

Do not commit downloaded rasters. Put the commands that fetch a file in `scripts/`, and keep the file itself under `data/` (gitignored).

Do not put precise coordinates of candidate or undiscovered sites in this file or in the Anatolia register.

Other regions used by the cross-region pipeline are listed here. A blank row at the bottom is the template for the next one. Do not add coordinates of candidate or unpublished sites.

| Dataset | Resolution | Coverage | Licence | Access | Notes |
| --- | --- | --- | --- | --- | --- |
| Geological Survey Ireland Phase 2 LiDAR DTM | 1 m | One 2 km open-data tile in County Roscommon for this run. Phase 2 also covers parts of Clare, Galway, Longford, and Mayo. | Creative Commons Attribution 4.0. Attribution: Contains Irish Public Sector Data (Geological Survey Ireland) licensed under CC BY 4.0. | Tile index and 7z downloads: `https://gsi.geodata.gov.ie/server/rest/services/Lidar/IE_GSI_LiDAR_Coverage_GSI_Phase2_IE26_ITM/MapServer`. Catalogue: `https://data.gov.ie/dataset/open-topographic-lidar-data`. | Bare-earth DTM. Vertical datum Malin Head. Horizontal CRS IRENET95 / ITM (EPSG:2157). The smoke tile was captured on 2018-06-28. |
| National Monuments Service Archaeological Survey of Ireland (SMR open data) | Monument points | The same Roscommon tile, filtered to ringforts, barrows, enclosures, and hillforts. Burial classes are not training labels. | Creative Commons Attribution 4.0. Attribute the National Monuments Service, Government of Ireland. | `https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/arcgis/rest/services/SMROpenData/FeatureServer/0` and `https://www.archaeology.ie/collections-and-publications/open-data/`. | Published monument inventory, not a candidate list. Points are cached under `data/` and are not committed. |
| USGS 3DEP Elevation ImageServer | Best available DEM, exported near 1 m where the request asks for it | A 2 km window on the public Cahokia Mounds National Register polygon. | US public domain. Credit: Map services and data available from U.S. Geological Survey, National Geospatial Program. | `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer` | Bare-earth mosaic. Vertical datum NAVD88, metres. The export pixel size is whatever the service delivers; it is not proof of a 1 m lidar posting if a coarser DEM was the source. |
| National Register of Historic Places, unrestricted polygons | One public polygon | Cahokia Mounds, a listed National Historic Landmark. | US public domain. The service states that it holds unrestricted records and withholds sensitive properties. | `https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer` | This is not a state archaeological site file. The training label is the listing centroid, not a surveyed mound plan. |
| Copernicus DEM GLO-30 | about 30 m | A small window on two published atlas neolithic sites. Global land in the public tile set. | Free and open Copernicus DEM licence (reproduction, distribution, adaptation). Cite DOI `10.5270/ESA-c5d3d65`. | AWS public COGs: `https://copernicus-dem-30m.s3.amazonaws.com/`. Already registered for Anatolia in `Anatolia/data-sources.md`. | DSM, not bare earth. Vertical datum EGM2008. Will not resolve 10–30 m enclosures. |
| AHN4 DTM (Netherlands) | 0.5 m | Not downloaded in this run. | CC0, as restated on the Earth Engine AHN4 catalogue page. | `https://service.pdok.nl/rws/ahn/wcs/v1_0` | Adapter describes the dataset and does not fetch. Vertical datum NAP. |
| Danmarks Højdemodel DHM/Terræn | about 0.4 m | Not downloaded in this run. | CC BY 4.0, stated on Dataforsyningen for free geographic data. | `https://dataforsyningen.dk/` | Adapter does not fetch; the download API needs a user token. |
| Environment Agency LiDAR Composite DTM (England) | 1 m class | Not downloaded in this run. | Open Government Licence v3.0 is the licence on Environment Agency lidar downloads. Re-read the product page before a bulk download. | `https://environment.data.gov.uk/survey` | Adapter does not fetch. |
| ARSO LiDAR (Slovenia) | about 1 m | Not downloaded. | Unconfirmed in this change. | `https://gis.arso.gov.si/` | Fetch stays off until the publisher's licence is read. |
| INEGI Continuo de Elevaciones Mexicano | about 15 m | Not downloaded. Optional Mexico adapter. | Unconfirmed here. INEGI publishes its own terms of free use. | `https://www.inegi.org.mx/app/geo2/elevacionesmex/` | Fetch stays off until those terms are read in full. |
|  |  |  |  |  |  |
