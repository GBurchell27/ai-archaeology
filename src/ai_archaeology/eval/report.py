"""Write metrics without candidate coordinates, and keep coordinates under outputs/."""

from __future__ import annotations

import json
from pathlib import Path

OUTPUTS = Path("outputs")


def assert_private_path(path: Path) -> Path:
    resolved = path.resolve()
    root = OUTPUTS.resolve()
    if resolved != root and root not in resolved.parents:
        raise ValueError(f"candidate coordinates must stay under {root}, not {resolved}")
    return resolved


def write_candidates(path: Path, rows: list[dict]) -> None:
    destination = assert_private_path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(rows) + "\n")


def public_metrics(payload: dict) -> dict:
    """Drop anything that could be a candidate location."""
    banned = {"longitude", "latitude", "lon", "lat", "easting", "northing", "candidates"}
    return _strip(payload, banned)


def _strip(value, banned: set[str]):
    if isinstance(value, dict):
        return {key: _strip(item, banned) for key, item in value.items() if key not in banned}
    if isinstance(value, list):
        return [_strip(item, banned) for item in value]
    return value
