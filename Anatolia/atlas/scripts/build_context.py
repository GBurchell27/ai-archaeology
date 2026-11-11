"""Build small context layers for the atlas. Raw downloads stay in /tmp.

Run from the repository root:

    .venv/bin/python Anatolia/atlas/scripts/build_context.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pyogrio
from PIL import Image
from pyproj import Transformer
from rasterio.enums import Resampling
import rasterio
from shapely import from_wkb, to_geojson
from shapely.geometry import shape
from shapely.ops import transform as shp_transform

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "Anatolia" / "atlas" / "public" / "context"
SRC = Path("/tmp/context-src")
WEST, SOUTH, EAST, NORTH = 25.5, 35.8, 45.0, 42.2
TO_4326 = Transformer.from_crs(3395, 4326, always_xy=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    roads = build_roads()
    rivers = build_lines(SRC / "ne_10m_rivers_lake_centerlines.shp", "name")
    lakes = build_polygons(SRC / "ne_10m_lakes.shp", "name")
    paleo = paleo_features()
    climate = build_climate()
    clay = color_raster(SRC / "clay.tif", OUT / "clay.png", ((8, 16, 28), (214, 176, 96)))
    soc = color_raster(SRC / "soc.tif", OUT / "soc.png", ((40, 48, 32), (214, 122, 48)))
    layers = layer_catalog(roads, rivers, lakes, paleo, clay, soc, climate)
    (OUT / "layers.json").write_text(json.dumps(layers, indent=2) + "\n")
    print("context layers", sum(path.stat().st_size for path in OUT.rglob("*") if path.is_file()) / 1_048_576)


def build_roads() -> int:
    minx, miny = _merc(WEST, SOUTH)
    maxx, maxy = _merc(EAST, NORTH)
    _meta, _fids, geometries, columns = pyogrio.raw.read(
        str(SRC / "itinere.gpkg"),
        columns=["Type", "Lower_Date", "Upper_Date", "Cons_per_e"],
        bbox=(minx, miny, maxx, maxy),
    )
    features = []
    for geometry, kind, lower, upper, certainty in zip(
        geometries, columns[0], columns[1], columns[2], columns[3], strict=True
    ):
        line = shp_transform(TO_4326.transform, from_wkb(geometry)).simplify(0.02, preserve_topology=True)
        if line.is_empty:
            continue
        features.append({
            "type": "Feature",
            "geometry": json.loads(to_geojson(line)),
            "properties": {
                "kind": "roman-road",
                "type": None if kind is None else str(kind),
                "certainty": None if certainty is None else str(certainty),
                "startYear": _year(lower),
                "endYear": _year(upper),
            },
        })
    _write("roads.geojson", features)
    print(f"roads {len(features)}")
    return len(features)


def build_lines(path: Path, name_field: str) -> int:
    _meta, _fids, geometries, columns = pyogrio.raw.read(str(path), columns=[name_field], bbox=(WEST, SOUTH, EAST, NORTH))
    features = []
    for geometry, name in zip(geometries, columns[0], strict=True):
        line = from_wkb(geometry).simplify(0.03, preserve_topology=True)
        if line.is_empty:
            continue
        features.append({
            "type": "Feature",
            "geometry": json.loads(to_geojson(line)),
            "properties": {"name": None if name is None else str(name), "kind": "present-day-river"},
        })
    _write("rivers.geojson", features)
    print(f"rivers {len(features)}")
    return len(features)


def build_polygons(path: Path, name_field: str) -> int:
    meta, _fids, geometries, columns = pyogrio.raw.read(str(path), columns=[name_field, "scalerank"], bbox=(WEST, SOUTH, EAST, NORTH))
    named = {field: column for field, column in zip(meta["fields"], columns, strict=True)}
    features = []
    for geometry, name, rank in zip(geometries, named[name_field], named["scalerank"], strict=True):
        if rank is not None and int(rank) > 6:
            continue
        polygon = from_wkb(geometry).simplify(0.02, preserve_topology=True)
        if polygon.is_empty:
            continue
        features.append({
            "type": "Feature",
            "geometry": json.loads(to_geojson(polygon)),
            "properties": {"name": None if name is None else str(name), "kind": "present-day-lake"},
        })
    _write("lakes.geojson", features)
    print(f"lakes {len(features)}")
    return len(features)


def paleo_features() -> int:
    """Coarse outlines. These are not traced shorelines and are not modern water."""
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[
                [32.35, 37.35], [32.7, 37.85], [33.15, 38.15], [33.7, 38.05],
                [34.05, 37.7], [33.7, 37.25], [33.05, 37.15], [32.55, 37.2], [32.35, 37.35],
            ]]},
            "properties": {
                "name": "Pleistocene Lake Konya",
                "kind": "paleolake",
                "approximate": True,
                "note": "Approximate, digitised from the basin described by Roberts (1983): late Pleistocene shore terraces at about 1005–1020 m around the Konya plain. Not a surveyed shoreline and not the modern playas.",
            },
        },
        {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[
                [42.25, 38.35], [42.55, 38.85], [43.05, 38.95], [43.45, 38.75],
                [43.55, 38.45], [43.15, 38.25], [42.6, 38.2], [42.25, 38.35],
            ]]},
            "properties": {
                "name": "Lake Van high stand",
                "kind": "paleolake",
                "approximate": True,
                "note": "Approximate, a coarse outline larger than the modern lake for the late-glacial high stand discussed by Wick, Lemcke, and Sturm (2003). Not a digitised terrace and not the present shore.",
            },
        },
    ]
    _write("paleo.geojson", features)
    return len(features)


def build_climate() -> int:
    records = [
        _series("sofular", "Sofular Cave", 31.934, 41.416, SRC / "sofular.txt", "age_calBP", "d18O_vpdb",
                "Fleitmann et al. 2009, Geophysical Research Letters 36. NOAA study 8637.",
                "https://www.ncei.noaa.gov/access/paleo-search/study/8637", "δ18O ‰ VPDB"),
        _series("van", "Lake Van", 42.8167, 38.63, SRC / "van.txt", "age_adj", "d18O",
                "Wick, Lemcke, and Sturm 2003, Quaternary Science Reviews; NOAA van2008d18O.",
                "https://www.ncei.noaa.gov/pub/data/paleo/paleolimnology/asia/turkey/van2008d18o.txt", "δ18O ‰"),
        _series("acigol", "Eski Acıgöl", 34.5447, 38.5503, SRC / "acigol.txt", "age_calBP", "d18O",
                "Roberts et al. 2001, The Holocene; NOAA eski-acigol2008d18o.",
                "https://www.ncei.noaa.gov/pub/data/paleo/paleolimnology/asia/turkey/eski-acigol2008d18o.txt", "δ18O ‰"),
        _series("soreq", "Soreq Cave", 35.0, 31.8, SRC / "soreq.txt", "age_yrBP", "d18O_VPDB",
                "Orland et al. 2012, Earth and Planetary Science Letters. Regional context, not in Turkey.",
                "https://www.ncei.noaa.gov/pub/data/paleo/speleothem/asia/israel/soreq2012d18o-noaa.txt", "δ18O ‰ VPDB"),
        _series("jeita", "Jeita Cave", 35.65, 33.95, SRC / "jeita.txt", "age_calBP", "d18OcarbVPDB",
                "Cheng et al. 2015, Geophysical Research Letters. Regional context, Lebanon, not in Turkey.",
                "https://www.ncei.noaa.gov/access/paleo-search/study/20446", "δ18O ‰ VPDB"),
    ]
    (OUT / "climate.json").write_text(json.dumps({"records": records}, indent=2) + "\n")
    print("climate", len(records), "points", sum(len(item["series"]) for item in records))
    return len(records)


def color_raster(path: Path, destination: Path, stops: tuple[tuple[int, int, int], tuple[int, int, int]]) -> dict:
    with rasterio.open(path) as source:
        array = source.read(1, out_shape=(140, 420), resampling=Resampling.average).astype(np.float32)
        bounds = [float(source.bounds.left), float(source.bounds.bottom), float(source.bounds.right), float(source.bounds.top)]
    finite = np.isfinite(array) & (array > -900)
    if not finite.any():
        raise RuntimeError(f"empty raster {path}")
    low, high = np.percentile(array[finite], [5, 95])
    mix = np.clip((array - low) / max(high - low, 1), 0, 1)
    image = np.zeros(array.shape + (4,), dtype=np.uint8)
    for channel in range(3):
        image[..., channel] = (stops[0][channel] + (stops[1][channel] - stops[0][channel]) * mix).astype(np.uint8)
    image[..., 3] = np.where(finite, 255, 0)
    Image.fromarray(image, "RGBA").save(destination, optimize=True)
    return {"min": float(low), "max": float(high), "bounds": bounds, "file": destination.name}


def layer_catalog(roads, rivers, lakes, paleo, clay, soc, climate) -> dict:
    noaa = "NOAA World Data Service for Paleoclimatology. Open download, no account. Cite the paper and the NOAA file."
    return {
        "layers": [
            {
                "id": "rivers",
                "title": "Present-day rivers",
                "group": "water",
                "kind": "line",
                "file": "rivers.geojson",
                "source": "Natural Earth 1:10m rivers and lake centerlines",
                "sourceUrl": "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
                "licence": "Public domain",
                "resolution": "1:10,000,000",
                "coverage": "Major rivers across Turkey. Not a full drainage network.",
                "time": "present-day",
                "features": rivers,
            },
            {
                "id": "lakes",
                "title": "Present-day lakes",
                "group": "water",
                "kind": "polygon",
                "file": "lakes.geojson",
                "source": "Natural Earth 1:10m lakes",
                "sourceUrl": "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/",
                "licence": "Public domain",
                "resolution": "1:10,000,000",
                "coverage": "Larger lakes in and beside Turkey, including Van and Tuz. Small lakes are omitted.",
                "time": "present-day",
                "features": lakes,
            },
            {
                "id": "paleo-water",
                "title": "Approximate paleolakes",
                "group": "water",
                "kind": "polygon",
                "file": "paleo.geojson",
                "source": "Roberts 1983, Quaternary Research 19; Wick, Lemcke and Sturm 2003, Quaternary Science Reviews 22",
                "sourceUrl": "https://doi.org/10.1016/0033-5894(83)90002-9",
                "licence": "Approximate outlines drawn for this atlas from the published descriptions. Not a reproduced figure.",
                "resolution": "coarse sketch, tens of kilometres",
                "coverage": "Konya basin and a high-stand sketch around Lake Van. Harran canals were not drawn: no open vector was found.",
                "time": "late Pleistocene, not modern",
                "features": paleo,
            },
            {
                "id": "roads",
                "title": "Roman roads",
                "group": "roads",
                "kind": "line",
                "file": "roads.geojson",
                "source": "Itiner-e static version 2024, de Soto et al. 2025, Zenodo",
                "sourceUrl": "https://doi.org/10.5281/zenodo.17122148",
                "licence": "CC BY 4.0",
                "resolution": "segment geometries simplified to about 2 km",
                "coverage": "Itiner-e roads clipped to about 25.5–45°E, 35.8–42.2°N. Certainty is the dataset field Cons_per_e.",
                "time": "Roman, shown with the Classical and Byzantine chip",
                "startYear": -300,
                "endYear": 700,
                "features": roads,
            },
            {
                "id": "clay",
                "title": "Soil clay, 0–5 cm",
                "group": "land",
                "kind": "raster",
                "file": "clay.png",
                "source": "SoilGrids 2.0 clay mean, 0–5 cm, ISRIC",
                "sourceUrl": "https://soilgrids.org/",
                "licence": "CC BY 4.0",
                "resolution": "sampled from the 250 m map to about 5 km for this drape",
                "coverage": "Turkey window 25.5–45°E, 35.8–42.2°N. Colour is a stretch of the 5th–95th percentile, not a classified map.",
                "time": "present-day soil",
                "stretch": clay,
            },
            {
                "id": "soc",
                "title": "Soil organic carbon, 0–5 cm",
                "group": "land",
                "kind": "raster",
                "file": "soc.png",
                "source": "SoilGrids 2.0 soil organic carbon mean, 0–5 cm, ISRIC",
                "sourceUrl": "https://soilgrids.org/",
                "licence": "CC BY 4.0",
                "resolution": "sampled from the 250 m map to about 5 km for this drape",
                "coverage": "Same Turkey window as the clay layer.",
                "time": "present-day soil",
                "stretch": soc,
            },
            {
                "id": "climate",
                "title": "Palaeoclimate records",
                "group": "climate",
                "kind": "point",
                "file": "climate.json",
                "source": "NOAA World Data Service for Paleoclimatology",
                "sourceUrl": "https://www.ncei.noaa.gov/products/paleoclimatology",
                "licence": noaa,
                "resolution": "point records; series thinned to at most 280 Holocene samples",
                "coverage": "Sofular Cave, Lake Van, and Eski Acıgöl are inside the Turkey window. Soreq Cave (Israel) and Jeita Cave (Lebanon) are regional context and sit south of the map, so they open from the list rather than a pin. Nar Gölü was not in the open NOAA Turkey folders checked on this run.",
                "time": "Holocene series, with 8.2 ka and 4.2 ka marks",
                "features": climate,
            },
        ]
    }


def _series(record_id, name, longitude, latitude, path, age_field, value_field, citation, url, units):
    ages, values = _columns(path, age_field, value_field)
    pairs = []
    for age, value in zip(ages, values, strict=True):
        if not (0 <= age <= 14000) or not math.isfinite(value):
            continue
        pairs.append([round(1950 - age), round(value, 3)])
    if len(pairs) > 280:
        step = max(1, len(pairs) // 280)
        pairs = pairs[::step]
    return {
        "id": record_id,
        "name": name,
        "longitude": longitude,
        "latitude": latitude,
        "units": units,
        "citation": citation,
        "sourceUrl": url,
        "licence": "NOAA World Data Service for Paleoclimatology. Open file, no account. Cite the paper and NOAA.",
        "series": pairs,
    }


def _columns(path: Path, age_field: str, value_field: str):
    header = None
    ages, values = [], []
    for line in path.read_text(errors="replace").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        if header is None:
            header = [part.strip() for part in parts]
            continue
        row = dict(zip(header, parts, strict=False))
        try:
            age = float(row[age_field])
            value = float(row[value_field])
        except (KeyError, ValueError):
            continue
        ages.append(age)
        values.append(value)
    return ages, values


def _write(name: str, features: list[dict]) -> None:
    (OUT / name).write_text(json.dumps({"type": "FeatureCollection", "features": features}) + "\n")


def _merc(longitude: float, latitude: float) -> tuple[float, float]:
    radius = 6378137.0
    x_coord = radius * math.radians(longitude)
    y_coord = radius * math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))
    return x_coord, y_coord


def _year(value) -> int | None:
    if value is None or (isinstance(value, float) and not math.isfinite(value)):
        return None
    year = int(round(float(value)))
    if abs(year) > 3000:
        return None
    return year


if __name__ == "__main__":
    main()
