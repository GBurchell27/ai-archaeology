"""Assemble a shareable run report. Coordinate keys are removed."""

from __future__ import annotations

import json
from pathlib import Path

from ai_archaeology.ingest.products import assert_untracked_product
from ai_archaeology.ingest.schema import read_metadata

FORBIDDEN_KEYS = {
    "longitude",
    "latitude",
    "easting",
    "northing",
    "easting_m",
    "northing_m",
    "coordinates",
    "geometry",
    "bbox",
}


def public_payload(value):
    if isinstance(value, dict):
        return {
            key: public_payload(item)
            for key, item in value.items()
            if key not in FORBIDDEN_KEYS
        }
    if isinstance(value, list):
        return [public_payload(item) for item in value]
    return value


def rung_summaries(prepared) -> list[dict]:
    rows = []
    for rung in prepared.rungs:
        metadata = read_metadata(rung.metadata_path)
        rows.append(
            {
                "resolution_m": metadata.target_resolution_m,
                "native_resolution_m": metadata.native_resolution_m,
                "crs": metadata.crs,
                "vertical_datum": metadata.vertical_datum,
                "bare_earth": metadata.bare_earth,
                "licence": metadata.licence,
                "source": metadata.source,
                "checksum_sha256": metadata.checksum_sha256,
            }
        )
    return rows


def write_public_report(path: Path, payload: dict, repo_root: Path) -> dict:
    assert_untracked_product(path, repo_root)
    cleaned = public_payload(payload)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cleaned, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return cleaned
