"""Tracked pipeline files do not carry precise coordinates."""

import re
import subprocess
from pathlib import Path

from ai_archaeology.pipeline.report import public_payload
from ai_archaeology.transfer.jitter import displacement_m, jitter_shareable_point

ROOT = Path(__file__).resolve().parents[1]
COORDINATE_PAIR = re.compile(r"-?\d{1,3}\.\d{4,}\s*[, ]\s*-?\d{1,3}\.\d{4,}")
PUBLISHED_SITE_FILES = {
    "Anatolia/atlas/public/sites.geojson",
    "Anatolia/explorer/public/sites.geojson",
    # These tests pin the published files above. They are not candidate locations.
    "tests/test_atlas_sites.py",
    "tests/test_sites_geojson.py",
    # Published atlas context (rivers, lakes, roads), not candidate sites.
    "Anatolia/atlas/public/context/lakes.geojson",
    "Anatolia/atlas/public/context/rivers.geojson",
    "Anatolia/atlas/public/context/roads.geojson",
    "Anatolia/atlas/scripts/build_context.py",
    "Anatolia/atlas/public/wikidata/sites.geojson",
    "tests/test_wikidata_sites.py",
}
BINARY_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".u16", ".tif", ".tiff", ".woff", ".woff2"}


def test_tracked_files_have_no_candidate_coordinate_pairs():
    tracked = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
    offenders = []
    for relative in tracked:
        if relative in PUBLISHED_SITE_FILES:
            continue
        path = ROOT / relative
        if not path.is_file() or path.suffix.lower() in BINARY_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if COORDINATE_PAIR.search(text):
            offenders.append(relative)
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
