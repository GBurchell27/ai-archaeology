"""Terrain metadata sidecars must match the JSON Schema."""

from pathlib import Path

import pytest
from jsonschema import ValidationError

from ai_archaeology.ingest.schema import (
    ProcessingStep,
    TerrainMetadata,
    read_metadata,
    validate_metadata,
    write_metadata,
)


def _metadata() -> TerrainMetadata:
    return TerrainMetadata(
        source="synthetic",
        licence="CC-BY-4.0",
        attribution="test attribution",
        acquisition_date=None,
        native_resolution_m=1.0,
        target_resolution_m=5.0,
        vertical_datum="Malin Head",
        crs="EPSG:32629",
        nodata=-9999.0,
        bare_earth=True,
        checksum_sha256="a" * 64,
        processing_steps=[ProcessingStep("resample", "1", {"method": "average"})],
        adapter="ireland_gsi",
        source_url="https://example.test/licence",
        created_at="2026-11-11T00:00:00+00:00",
        library_versions={"ai_archaeology": "0.1.0"},
    )


def test_metadata_round_trip(tmp_path: Path):
    path = tmp_path / "elevation.json"
    write_metadata(path, _metadata())
    loaded = read_metadata(path)
    assert loaded.bare_earth is True
    assert loaded.vertical_unit == "metres"
    assert loaded.licence == "CC-BY-4.0"


def test_missing_licence_fails_validation():
    payload = _metadata().to_dict()
    del payload["licence"]
    with pytest.raises(ValidationError):
        validate_metadata(payload)


def test_bare_earth_must_be_boolean():
    payload = _metadata().to_dict()
    payload["bare_earth"] = "dsm"
    with pytest.raises(ValidationError):
        validate_metadata(payload)
