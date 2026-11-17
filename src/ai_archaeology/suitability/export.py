"""Write the web files: one decile PNG per layer and index.json. No coordinates, no per-cell tables."""

from __future__ import annotations

import datetime
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image  # ships with matplotlib, not a new dependency

from ai_archaeology.pipeline.report import public_payload
from ai_archaeology.suitability.caveats import layer_caveats
from ai_archaeology.suitability.grid import CELL_DEGREES
from ai_archaeology.suitability.layer import LayerResult

OCEAN, NO_BASIS = 0, 255
CLASS_TITLES = {"monument": "monuments", "settlement": "settlements", "funerary": "burial sites", "any": "sites of any kind"}
PERIOD_TITLES = {
    "early-holocene": "from 10,000–5000 BCE",
    "mid-holocene": "from 5000–2000 BCE",
    "late-holocene": "from 2000 BCE–500 CE",
    "all": "of any period",
}
LEGEND = {
    "0": "Ocean",
    "1-10": "Decile rank among documented cells: 10 = most like the cells where such sites are recorded",
    "255": "No basis: outside the range of conditions the model learned from",
}
LICENCES = [
    {"name": "ETOPO 2022", "licence": "US public domain", "attribution": "NOAA NCEI, doi:10.25921/fd45-gt74"},
    {"name": "HydroSHEDS", "licence": "Free with attribution", "attribution": "Lehner and Grill (2013)"},
    {"name": "CHELSA-TraCE21k", "licence": "CC0 1.0", "attribution": "Karger et al. (2023)"},
    {"name": "Wikidata", "licence": "CC0 1.0", "attribution": "Wikidata"},
    {"name": "Pleiades", "licence": "CC BY 3.0", "attribution": "Pleiades contributors"},
]


def decile_raster(result: LayerResult) -> np.ndarray:
    """0 ocean, 1-10 decile of the score among documented cells, 255 no basis."""
    edges = np.quantile(result.reference_scores, np.arange(1, 10) / 10.0)
    scored = np.isfinite(result.scores)
    raster = np.full(result.land.shape, OCEAN, dtype=np.uint8)
    raster[result.land] = NO_BASIS
    raster[scored] = 1 + np.searchsorted(edges, result.scores[scored], side="right")
    return raster


def write_decile_png(path: Path, raster: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(raster).save(path, optimize=True)


def layer_entry(site_class: str, period: str, result: LayerResult) -> dict:
    layer_id = f"{site_class}_{period}"
    metrics = {
        name: None if not math.isfinite(value) else round(value, 3) for name, value in result.metrics.items()
    }
    return {
        "id": layer_id,
        "file": f"{layer_id}.png",
        "title": f"Where published {CLASS_TITLES[site_class]} {PERIOD_TITLES[period]} tend to be recorded",
        "siteClass": site_class,
        "period": period,
        "presences": result.presences,
        "metrics": metrics,
        "caveats": layer_caveats(result, period),
    }


def write_index(path: Path, layers: list[dict], skipped: list[dict]) -> dict:
    payload = public_payload({
        "generated": datetime.date.today().isoformat(),
        "cellDegrees": CELL_DEGREES,
        "layers": layers,
        "skipped": skipped,
        "legend": LEGEND,
        "licences": LICENCES,
    })
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return payload
