"""Metadata sidecar for one standardised terrain raster.

``bare_earth`` is the bare-earth versus DSM flag: true is a bare-earth DTM,
false is a surface model that still includes buildings and vegetation.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy
import rasterio
from jsonschema import Draft202012Validator

from ai_archaeology import __version__
from ai_archaeology.ingest.constants import VERTICAL_UNIT

_SCHEMA_PATH = Path(__file__).with_name("terrain_metadata.schema.json")


@dataclass(frozen=True)
class ProcessingStep:
    name: str
    version: str
    parameters: dict


@dataclass(frozen=True)
class TerrainMetadata:
    source: str
    licence: str
    attribution: str
    acquisition_date: str | None
    native_resolution_m: float
    target_resolution_m: float
    vertical_datum: str
    crs: str
    nodata: float
    bare_earth: bool
    checksum_sha256: str
    processing_steps: list[ProcessingStep]
    adapter: str
    source_url: str
    created_at: str
    library_versions: dict[str, str]
    vertical_unit: str = VERTICAL_UNIT

    def to_dict(self) -> dict:
        payload = asdict(self)
        payload["processing_steps"] = [asdict(step) for step in self.processing_steps]
        return payload


def library_versions() -> dict[str, str]:
    return {
        "ai_archaeology": __version__,
        "numpy": numpy.__version__,
        "rasterio": rasterio.__version__,
        "gdal": str(rasterio.__gdal_version__),
    }


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_schema() -> dict:
    return json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))


def validate_metadata(payload: dict) -> None:
    Draft202012Validator(load_schema()).validate(payload)


def write_metadata(path: Path, metadata: TerrainMetadata) -> None:
    payload = metadata.to_dict()
    validate_metadata(payload)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_metadata(path: Path) -> TerrainMetadata:
    payload = json.loads(path.read_text(encoding="utf-8"))
    validate_metadata(payload)
    steps = [ProcessingStep(**step) for step in payload.pop("processing_steps")]
    return TerrainMetadata(processing_steps=steps, **payload)
