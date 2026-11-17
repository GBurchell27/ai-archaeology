"""Fetch the global covariates for the coarse suitability layer and reduce them to 0.25 degree cells.

Writes small ``.npy`` grids (720 x 1440) and ``provenance.json`` under ``data/world/covariates/``
(gitignored). Raw downloads are cached under ``raw/`` so a rerun does not refetch.

Sources (licences are recorded in docs/data-sources.md):
- ETOPO 2022 60 arc-second ice-surface relief, NOAA NCEI, US public domain.
- HydroSHEDS 30 arc-second flow accumulation, Lehner and Grill (2013), free with attribution.
- CHELSA-TraCE21k bio01 and bio12, Karger et al. (2023), CC0 1.0.

Run: .venv/Scripts/python scripts/fetch_global_covariates.py
"""

from __future__ import annotations

import argparse
import datetime
import json
import time
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import Window

from ai_archaeology.suitability.aggregate import block_reduce, slope_degrees_geographic
from ai_archaeology.suitability.grid import N_COLS, N_ROWS, SHAPE

USER_AGENT = "ai-archaeology-atlas/0.1 (hobby research)"
ETOPO_URL = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/"
    "ETOPO_2022_v1_60s_N90W180_surface.tif"
)
HYDROSHEDS_URL = "https://data.hydrosheds.org/file/hydrosheds-v1-acc/hyd_glo_acc_30s.zip"
CHELSA_URL = "https://os.zhdk.cloud.switch.ch/chelsav1/chelsa_trace/bio/CHELSA_TraCE21k_{variable}_{time_id}_V1.0.tif"
# Time id k covers calendar years k*100 to k*100+99 (technical documentation, Table 4:
# 20 is 1900-1990 CE, 10 is 900-999 CE, -200 is 20100-20001 BCE).
# One slice near each period's midpoint: 7500 BCE, 3500 BCE, 750 BCE.
CLIMATE_TIME_IDS = {"early-holocene": -75, "mid-holocene": -35, "late-holocene": -8}
CLIMATE_VARIABLES = {"temperature": "bio01", "precipitation": "bio12"}
# About 8,600 km2 upstream at the equator, less toward the poles (cells shrink with latitude).
LARGE_RIVER_UPSTREAM_CELLS = 10_000


def download(url: str, destination: Path, attempts: int = 4) -> Path:
    if destination.exists():
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(destination.name + ".part")
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as handle:
                while chunk := response.read(1 << 20):
                    handle.write(chunk)
            partial.replace(destination)
            return destination
        except OSError:
            if attempt == attempts - 1:
                raise
            time.sleep(10 * 2**attempt)
    return destination


def aggregate_etopo(path: Path) -> dict[str, np.ndarray]:
    with rasterio.open(path) as source:
        if (source.height, source.width) != (10800, 21600):
            raise ValueError(f"unexpected ETOPO grid {source.height} x {source.width}")
        heights = source.read(1).astype(np.float32)
    is_land = heights > 0
    slopes = slope_degrees_geographic(heights, north_latitude=90.0, pixel_degrees=1 / 60)
    land_heights = np.where(is_land, heights, np.nan)
    return {
        "land_fraction": block_reduce(is_land.astype(np.float32), 15, np.mean),
        "elevation_mean": block_reduce(land_heights, 15, np.nanmean),
        "relief_std": block_reduce(land_heights, 15, np.nanstd),
        "slope_mean": block_reduce(np.where(is_land, slopes, np.nan), 15, np.nanmean),
    }


def aggregate_large_rivers(zip_path: Path) -> np.ndarray:
    """True for cells that hold at least one 30 arc-second pixel with a large upstream area."""
    with zipfile.ZipFile(zip_path) as archive:
        raster_name = next(name for name in archive.namelist() if name.lower().endswith(".tif"))
    river_cells = np.zeros(SHAPE, dtype=bool)
    with rasterio.open(f"/vsizip/{zip_path.as_posix()}/{raster_name}") as source:
        if source.width != 43200 or source.height % 30:
            raise ValueError(f"unexpected HydroSHEDS grid {source.height} x {source.width}")
        first_row = int(round((90.0 - source.bounds.top) / 0.25))
        for start in range(0, source.height, 600):
            rows = min(600, source.height - start)
            upstream = source.read(1, window=Window(0, start, source.width, rows))
            upstream[upstream == source.nodata] = 0  # ocean
            cell_start = first_row + start // 30
            river_cells[cell_start : cell_start + rows // 30] = (
                block_reduce(upstream, 30, np.max) >= LARGE_RIVER_UPSTREAM_CELLS
            )
    return river_cells


def read_climate_slice(variable: str, time_id: int) -> np.ndarray:
    """One CHELSA-TraCE21k slice at 0.25 degrees, read over HTTP range requests.

    shortcut: the file has one-row strips and no overviews, so each cell is the mean of the
    30 pixels along its centre row only; download whole files if finer means are needed.
    """
    url = "/vsicurl/" + CHELSA_URL.format(variable=variable, time_id=time_id)
    with rasterio.Env(GDAL_HTTP_USERAGENT=USER_AGENT, GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
                      GDAL_HTTP_MAX_RETRY=5, GDAL_HTTP_RETRY_DELAY=5):
        with rasterio.open(url) as source:
            if source.width != 43200 or source.height % 30:
                raise ValueError(f"unexpected CHELSA grid {source.height} x {source.width}")
            first_row = int(round((90.0 - source.bounds.top) / 0.25))
            centre_rows = source.read(
                1, out_shape=(source.height // 30, source.width), resampling=Resampling.nearest
            )
    cells = np.full(SHAPE, np.nan, dtype=np.float32)  # CHELSA stops at 84N
    cells[first_row : first_row + centre_rows.shape[0]] = centre_rows.reshape(-1, N_COLS, 30).mean(axis=2)
    return cells


def save_grid(directory: Path, name: str, grid: np.ndarray) -> dict:
    if grid.shape != (N_ROWS, N_COLS):
        raise ValueError(f"{name}: expected {SHAPE}, got {grid.shape}")
    np.save(directory / f"{name}.npy", grid)
    finite = grid[np.isfinite(grid)] if grid.dtype != bool else grid
    return {"min": float(finite.min()), "max": float(finite.max()), "mean": float(finite.mean())}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=Path("data/world/covariates"))
    out = parser.parse_args(argv).out
    out.mkdir(parents=True, exist_ok=True)
    summary = {}
    etopo = download(ETOPO_URL, out / "raw" / "etopo" / ETOPO_URL.rsplit("/", 1)[1])
    for name, grid in aggregate_etopo(etopo).items():
        summary[name] = save_grid(out, name, grid.astype(np.float32))
    hydrosheds = download(HYDROSHEDS_URL, out / "raw" / "hydrosheds" / "hyd_glo_acc_30s.zip")
    summary["large_river"] = save_grid(out, "large_river", aggregate_large_rivers(hydrosheds))
    for period, time_id in CLIMATE_TIME_IDS.items():
        for label, variable in CLIMATE_VARIABLES.items():
            name = f"{label}_{period}"
            if not (out / f"{name}.npy").exists():
                np.save(out / f"{name}.npy", read_climate_slice(variable, time_id))
            summary[name] = save_grid(out, name, np.load(out / f"{name}.npy"))
    provenance = {
        "fetched": datetime.date.today().isoformat(),
        "sources": {"etopo": ETOPO_URL, "hydrosheds": HYDROSHEDS_URL, "chelsa": CHELSA_URL},
        "climateTimeIds": CLIMATE_TIME_IDS,
        "largeRiverUpstreamCells": LARGE_RIVER_UPSTREAM_CELLS,
        "grids": summary,
    }
    (out / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
