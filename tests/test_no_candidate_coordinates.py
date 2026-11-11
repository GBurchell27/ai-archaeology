"""Tracked pipeline files do not carry precise coordinates."""

import re
import subprocess
from pathlib import Path

from ai_archaeology.pipeline.report import public_payload
from ai_archaeology.transfer.jitter import displacement_m, jitter_shareable_point

ROOT = Path(__file__).resolve().parents[1]
COORDINATE_PAIR = re.compile(r"-?\d{1,3}\.\d{4,}\s*[, ]\s*-?\d{1,3}\.\d{4,}")
SCAN_ROOTS = (
    "regions",
    "configs/cross_region.yaml",
    "src/ai_archaeology/ingest",
    "src/ai_archaeology/regions",
    "src/ai_archaeology/train",
    "src/ai_archaeology/transfer",
    "src/ai_archaeology/pipeline",
    "scripts/run_cross_region_smoke.py",
    "docs/cross-region-pipeline.md",
    "docs/data-sources.md",
)


def test_new_pipeline_files_have_no_coordinate_pairs():
    offenders = []
    for relative in SCAN_ROOTS:
        path = ROOT / relative
        files = [path] if path.is_file() else sorted(path.rglob("*"))
        for candidate in files:
            if not candidate.is_file() or candidate.suffix in {".tif", ".tiff"}:
                continue
            text = candidate.read_text(encoding="utf-8", errors="ignore")
            if COORDINATE_PAIR.search(text):
                offenders.append(str(candidate.relative_to(ROOT)))
    assert offenders == []


def test_region_yaml_does_not_name_longitude_or_latitude():
    for path in (ROOT / "regions").glob("*.yaml"):
        text = path.read_text(encoding="utf-8").lower()
        assert "longitude" not in text
        assert "latitude" not in text


def test_git_does_not_track_rasters_or_private_candidates():
    tracked = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
    leaked = [
        path
        for path in tracked
        if path.startswith(("data/", "outputs/", "candidates_private"))
        or path.endswith((".tif", ".tiff", ".laz", ".las"))
    ]
    assert leaked == []


def test_public_report_drops_coordinate_keys():
    cleaned = public_payload({"region_id": "example", "longitude": 1, "nested": {"latitude": 2}})
    assert cleaned == {"region_id": "example", "nested": {}}


def test_shareable_jitter_is_at_least_five_kilometres():
    origin = (0.0, 0.0)
    moved = jitter_shareable_point(*origin)
    assert displacement_m(origin, moved) >= 5000.0
