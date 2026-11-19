"""Fetch CHELSA-TraCE21k surface altitude and ice-sheet altitude for the globe's ice and sea level layer.

Reads `orog` and `glz` at 0.25 degrees for every 500th year from 20,000 BCE to the present, over HTTP
range requests against the source's public bucket of cloud-optimised GeoTIFFs: only a coarse overview
of each file is transferred, not the 350 MB file. Writes one compressed grid per file under
``data/world/paleo/raw/`` (gitignored) and ``provenance.json``. A rerun skips grids it already has.

Source: CHELSA-TraCE21k centennial bioclim and topographic data, Karger et al. (2023), CC0 1.0.
The licence is recorded in docs/data-sources.md. Downloads real data: run only when the owner asks.

Run: .venv/Scripts/python scripts/fetch_paleo_context.py
Then: .venv/Scripts/python scripts/build_paleo_context.py
"""

from __future__ import annotations

import argparse
import datetime
import json
import time
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling

from ai_archaeology.paleo_context import SOURCE_NORTH_DEGREES, SOURCE_SHAPE, source_file_name, step_time_ids

USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"
BUCKET_URL = "https://os.zhdk.cloud.switch.ch/chelsa01/chelsa_trace21k/global/bioclim"
VARIABLES = ("orog", "glz")
PAUSE_SECONDS = 0.5


def read_coarse(variable: str, time_id: int) -> np.ndarray:
    """One file at 0.25 degrees (int16, -32768 for sea).

    shortcut: each cell is the nearest pixel of the file's 8 arc-minute overview, not a mean of the
    cell; read a finer overview and take the majority if coast cells matter.
    """
    url = f"/vsicurl/{BUCKET_URL}/{variable}/{source_file_name(variable, time_id)}"
    with rasterio.open(url) as source:
        if source.width != 43200 or abs(source.bounds.top - SOURCE_NORTH_DEGREES) > 0.01:
            raise ValueError(f"unexpected grid for {url}: {source.width} wide, top {source.bounds.top}")
        return source.read(1, out_shape=SOURCE_SHAPE, resampling=Resampling.nearest)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=Path("data/world/paleo"))
    out = parser.parse_args(argv).out
    raw = out / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    fetched = 0
    with rasterio.Env(GDAL_HTTP_USERAGENT=USER_AGENT, GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
                      GDAL_HTTP_MAX_RETRY=5, GDAL_HTTP_RETRY_DELAY=5):
        for time_id in step_time_ids():
            for variable in VARIABLES:
                destination = raw / f"{variable}_{time_id}.npz"
                if destination.exists():
                    continue
                np.savez_compressed(destination, altitude=read_coarse(variable, time_id))
                fetched += 1
                time.sleep(PAUSE_SECONDS)
    provenance = {
        "dataset": "CHELSA-TraCE21k centennial bioclim and topographic data (orog, glz), V1.0",
        "licence": "CC0 1.0",
        "service": BUCKET_URL,
        "fetched": datetime.date.today().isoformat(),
        "timeIds": step_time_ids(),
    }
    (out / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"fetched": fetched, "steps": len(step_time_ids())}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
