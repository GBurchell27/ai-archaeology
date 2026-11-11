"""Published atlas sites, grouped into spatial blocks for blind folds.

A site the detector is scored on is never a label in the fold that is
supposed to be blind. Regions are geographic blocks, not a grid fitted to
the mounds.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

ATLAS_SITES = Path("Anatolia/atlas/public/sites.geojson")

# Leave-one-region-out blocks. Sites in one block stay out of every other
# block's threshold tuning.
REGIONS: dict[str, tuple[str, ...]] = {
    "urfa": ("gobekli-tepe", "karahan-tepe", "sayburc", "harbetsuvan-tepesi", "edessa", "harran"),
    "euphrates": ("nevali-cori", "rumkale", "birecik", "samosata", "turbessel", "ravendel", "zeugma", "karkemish"),
    "tigris": ("cayonu", "hallan-cemi", "kortik-tepe"),
    "malatya": ("arslantepe", "nemrut"),
    "amanus": ("antioch", "baghras", "marash"),
    "cukurova": ("tarsus", "mamistra", "adana", "saleph"),
    "konya": ("catalhoyuk", "boncuklu-hoyuk", "can-hasan"),
    "burdur": ("hacilar",),
    "cappadocia": ("asikli-hoyuk", "goreme", "kultepe"),
    "hattusa": ("hattusa", "alacahoyuk"),
    "phrygia": ("gordion",),
    "aegean-north": ("troy", "pergamon", "smyrna-hospitaller"),
    "aegean-south": ("ephesus", "sardis", "aphrodisias", "bodrum-petronion"),
    "marmara": ("nicaea", "dorylaeum", "constantinople"),
    "kars": ("ani",),
}

# mound: a published tell, tumulus, or compact hill the 30 m grid might show.
# urban: a city, castle, battle, flooded site, or rock-cut landscape that is
# not a 3–40 m mound of 80–600 m. Notes stay with the site record.
TERRAIN: dict[str, tuple[str, str]] = {
    "gobekli-tepe": ("mound", "Limestone hilltop enclosures. The hill may show; the pillars do not at 30 m."),
    "karahan-tepe": ("mound", "Tektek hilltop excavation, not a cultivated tell on a plain."),
    "sayburc": ("mound", "Plateau site. The published relief is a low rise, not a tall tell."),
    "harbetsuvan-tepesi": ("mound", "Tektek hilltop site, same caveat as Karahan Tepe."),
    "nevali-cori": ("urban", "Submerged by the Atatürk reservoir. The DEM is the water surface."),
    "harran": ("urban", "Historic town on a flat plain."),
    "edessa": ("urban", "City under modern Şanlıurfa."),
    "antioch": ("urban", "City under modern Antakya."),
    "nicaea": ("urban", "City under modern İznik."),
    "dorylaeum": ("urban", "Battle pin, not a mound."),
    "constantinople": ("urban", "City under modern Istanbul."),
    "turbessel": ("urban", "Castle on a rock, not a 3–40 m tell."),
    "ravendel": ("urban", "Castle, location approximate, not a tell."),
    "rumkale": ("urban", "Castle on a Euphrates rock."),
    "birecik": ("urban", "Town on the Euphrates."),
    "samosata": ("urban", "Town, later flooded by the Atatürk reservoir."),
    "marash": ("urban", "City under modern Kahramanmaraş."),
    "baghras": ("urban", "Castle in the Amanus, not a tell."),
    "tarsus": ("urban", "City on the Cilician plain."),
    "mamistra": ("urban", "Town on the Cilician plain."),
    "adana": ("urban", "City on the Cilician plain."),
    "saleph": ("urban", "River-crossing event pin, not a mound."),
    "smyrna-hospitaller": ("urban", "Harbor castle pin on the historic city."),
    "bodrum-petronion": ("urban", "Castle on a rocky peninsula, not a tell."),
    "catalhoyuk": ("mound", "Settlement tell on the Konya plain."),
    "asikli-hoyuk": ("mound", "Aceramic tell on the Melendiz."),
    "boncuklu-hoyuk": ("mound", "Small Neolithic tell near Çatalhöyük."),
    "cayonu": ("mound", "Pre-Pottery Neolithic settlement mound."),
    "hallan-cemi": ("mound", "Protoneolithic mound."),
    "kortik-tepe": ("mound", "Early settled mound on the Batman Çayı."),
    "hacilar": ("mound", "Neolithic mound south of Burdur."),
    "can-hasan": ("mound", "Can Hasan 1 mound. The Neolithic mound nearby is not a separate pin."),
    "hattusa": ("urban", "Walled city several kilometres across, not one 80–600 m tell."),
    "troy": ("mound", "Hisarlık is a tell. The lower town is wider than the mound."),
    "kultepe": ("mound", "City mound and lower town. The pin is only about a kilometre precise."),
    "alacahoyuk": ("mound", "Bronze Age and Hittite mound."),
    "arslantepe": ("mound", "About 30 m tell in the Malatya plain."),
    "karkemish": ("mound", "Citadel mound on the Euphrates. The lower town is larger."),
    "gordion": ("mound", "Phrygian citadel mound. The tumuli are separate hills."),
    "sardis": ("urban", "Lydian city and acropolis, not a single low tell."),
    "ephesus": ("urban", "Harbour city under and beside Selçuk."),
    "pergamon": ("urban", "Acropolis on a high ridge, not a 3–40 m tell."),
    "aphrodisias": ("urban", "Greco-Roman city on a valley floor."),
    "zeugma": ("urban", "Roman city, partly under the Birecik reservoir."),
    "nemrut": ("mound", "Commagene tumulus. It may be taller than the 40 m height gate."),
    "goreme": ("urban", "Rock-cut valleys. Not a settlement mound."),
    "ani": ("urban", "Ruined city on a plateau edge."),
}


@dataclass(frozen=True)
class KnownSite:
    id: str
    name: str
    layer: str
    longitude: float
    latitude: float
    region: str
    terrain: str
    terrain_note: str
    source: str
    source_url: str


def load_catalog(path: Path | None = None) -> list[KnownSite]:
    features = json.loads((path or ATLAS_SITES).read_text())["features"]
    by_region = {site_id: region for region, ids in REGIONS.items() for site_id in ids}
    sites: list[KnownSite] = []
    for feature in features:
        site_id = feature["id"]
        terrain, note = TERRAIN[site_id]
        longitude, latitude = feature["geometry"]["coordinates"]
        sites.append(KnownSite(
            id=site_id,
            name=feature["properties"]["name"],
            layer=feature["properties"]["layer"],
            longitude=float(longitude),
            latitude=float(latitude),
            region=by_region[site_id],
            terrain=terrain,
            terrain_note=note,
            source=feature["properties"]["source"],
            source_url=feature["properties"]["sourceUrl"],
        ))
    return sites


def sites_in(catalog: list[KnownSite], region: str) -> list[KnownSite]:
    return [site for site in catalog if site.region == region]
