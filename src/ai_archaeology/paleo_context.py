"""Ice and sea level through time, as coarse class rasters for the globe. Pure functions, no network.

Source: CHELSA-TraCE21k `orog` (surface altitude) and `glz` (ice-sheet surface altitude), CC0 1.0,
registered in docs/data-sources.md. Its sea is no-data, so land at a step is where `orog` has a value.
`glz` has values far beyond the ice (over most of Scandinavia today), so it is not an ice mask by
itself: ice is drawn where the step's surface also stands well above today's.
A modelled reconstruction: one global sea level per step, no rise or sinking of the land. The source
publishes no sea level figure, so none is derived or written here.
"""

from __future__ import annotations

import numpy as np

CELL_DEGREES = 0.25
GLOBAL_SHAPE = (720, 1440)
# The source grid stops at 84N; the rows above it are written as sea.
SOURCE_NORTH_DEGREES = 84.0
SOURCE_SHAPE = (696, 1440)
# The files' no-data value is -32768; nothing on Earth's land lies this far below sea level.
LOWEST_REAL_ALTITUDE_M = -1000

# The globe draws these with the class-raster shader of the recording-pattern layer: 0 is never drawn,
# 1 to 10 take a colour each, 11 to 254 are not drawn. So the two drawn classes come first.
SEA, EXPOSED_LAND, ICE, LAND = 0, 1, 2, 20
CLASS_LEGEND = {
    str(SEA): "Sea, or north of 84°N where the source has no data",
    str(LAND): "Land at this step that is also land today (not drawn)",
    str(EXPOSED_LAND): "Land at this step where the source has sea today",
    str(ICE): "Ice at this step standing at least 150 m above today's surface",
}

# Sea floor the source shows as land is lifted by up to about 120 m, so less than this is not ice.
ICE_MIN_RISE_M = 150

# Time id k of the source covers the calendar years k*100 to k*100+99; -200 is the earliest, 20 the latest.
FIRST_TIME_ID, PRESENT_TIME_ID, TIME_ID_STRIDE = -200, 20, 5
SOURCE = {
    "name": "CHELSA-TraCE21k, centennial topographic data (orog, glz)",
    "licence": "CC0 1.0",
    "citation": (
        "Karger, D. N., Nobis, M. P., Normand, S., Graham, C. H., and Zimmermann, N. E. (2023), "
        "CHELSA-TraCE21k: high-resolution (1 km) downscaled transient temperature and precipitation data "
        "since the Last Glacial Maximum, Climate of the Past 19, 439–456"
    ),
    "url": "https://doi.org/10.5194/cp-19-439-2023",
}


def step_time_ids() -> list[int]:
    """Every fifth time id (500 years, the step of the ice model the source interpolates), oldest first."""
    return list(range(FIRST_TIME_ID, PRESENT_TIME_ID + 1, TIME_ID_STRIDE))


def time_id_year(time_id: int) -> int:
    """First calendar year a time id covers; negative is BCE."""
    return time_id * 100


def source_file_name(variable: str, time_id: int) -> str:
    return f"CHELSA_TraCE21k_{variable}_{time_id:04d}_V.1.0.tif"


def has_value(altitude: np.ndarray) -> np.ndarray:
    return altitude > LOWEST_REAL_ALTITUDE_M


def classify_step(orog: np.ndarray, glz: np.ndarray, present_orog: np.ndarray) -> np.ndarray:
    """One class per cell: ice wins, then land the sea covers today, then other land, else sea.

    Ice is where the source has an ice surface and the step's surface stands at least 150 m above
    today's (above today's sea level where the sea is today). So ice that is as thick today, as in
    Greenland and Antarctica, is not drawn, and neither is the thin edge of an ice sheet.
    """
    land = has_value(orog)
    sea_today = ~has_value(present_orog)
    surface_today = np.where(sea_today, 0, present_orog).astype(np.int32)
    classes = np.full(orog.shape, SEA, dtype=np.uint8)
    classes[land] = LAND
    classes[land & sea_today] = EXPOSED_LAND
    classes[land & has_value(glz) & (orog - surface_today >= ICE_MIN_RISE_M)] = ICE
    return classes


def pad_to_global(classes: np.ndarray) -> np.ndarray:
    """The source rows (84N to 90S) set into the 0.25 degree global raster, row 0 at 90N."""
    if classes.shape != SOURCE_SHAPE:
        raise ValueError(f"expected {SOURCE_SHAPE}, got {classes.shape}")
    padded = np.full(GLOBAL_SHAPE, SEA, dtype=np.uint8)
    padded[GLOBAL_SHAPE[0] - SOURCE_SHAPE[0] :] = classes
    return padded


def step_entry(time_id: int) -> dict:
    year = time_id_year(time_id)
    return {"year": year, "file": f"{year}.png"}


def index_payload(steps: list[dict], generated: str) -> dict:
    return {
        "generated": generated,
        "cellDegrees": CELL_DEGREES,
        "northLimitDegrees": SOURCE_NORTH_DEGREES,
        "classes": CLASS_LEGEND,
        "steps": sorted(steps, key=lambda step: step["year"]),
        "source": SOURCE,
    }
