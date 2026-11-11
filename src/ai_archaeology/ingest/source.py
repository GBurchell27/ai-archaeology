"""A fetched terrain raster before it is standardised."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SourceTerrain:
    path: Path
    source: str
    licence: str
    attribution: str
    acquisition_date: str | None
    native_resolution_m: float
    vertical_datum: str
    bare_earth: bool
    source_url: str
    adapter: str


@dataclass(frozen=True)
class StandardisedRung:
    resolution_m: float
    elevation_path: Path
    relief_path: Path
    metadata_path: Path
    crs: str
