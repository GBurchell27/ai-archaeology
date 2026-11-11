"""Crusader close-ups must be real elevations: no void sentinels, no edge spikes."""

import json
from pathlib import Path

import numpy as np

from ai_archaeology.dem_window import clean_elevation_window

TERRAIN = Path("Anatolia/atlas/public/terrain")
SITES = Path("Anatolia/atlas/public/sites.geojson")
# A 10 km window in Turkey. Voids are tens of thousands of metres; real relief is not.
MAX_RELIEF_M = 3500.0
MAX_STEP_M = 250.0


def test_void_sentinel_and_edge_spike_are_removed():
    grid = np.full((32, 32), 420.0, dtype=np.float32)
    grid[10, 12] = -32767
    grid[4, 4] = np.nan
    grid[0, 16] = 0.0
    cleaned = clean_elevation_window(grid)
    assert np.isfinite(cleaned).all()
    assert cleaned.min() > 100
    assert abs(float(cleaned[10, 12]) - 420) < 1
    assert abs(float(cleaned[0, 16]) - 420) < 1
    assert abs(float(cleaned[4, 4]) - 420) < 1


def test_a_sea_band_is_not_treated_as_a_spike():
    grid = np.full((32, 32), 40.0, dtype=np.float32)
    grid[:8, :] = 0.0
    cleaned = clean_elevation_window(grid)
    assert float(cleaned[0, 16]) == 0.0
    assert float(cleaned[20, 16]) == 40.0


def test_gentle_relief_is_unchanged():
    rows = np.linspace(100, 180, 40, dtype=np.float32)
    grid = np.tile(rows[:, None], (1, 40))
    cleaned = clean_elevation_window(grid)
    assert np.allclose(cleaned, grid, atol=0.1)


def test_every_crusader_window_has_sane_elevation():
    features = json.loads(SITES.read_text())["features"]
    metadata = json.loads((TERRAIN / "metadata.json").read_text())
    crusader = [feature for feature in features if feature["properties"]["layer"] == "crusader"]
    assert len(crusader) >= 8
    for feature in crusader:
        detail = metadata["details"][feature["id"]]
        metres = _decode(feature["id"], detail)
        assert np.isfinite(metres).all()
        assert float(metres.min()) > -50
        assert float(metres.max()) < 5200
        assert float(metres.max() - metres.min()) < MAX_RELIEF_M
        step = max(float(np.abs(np.diff(metres, axis=0)).max()), float(np.abs(np.diff(metres, axis=1)).max()))
        assert step < MAX_STEP_M, f"{feature['id']} steps {step:.0f} m"


def _decode(site_id: str, detail: dict) -> np.ndarray:
    raw = np.frombuffer((TERRAIN / "details" / site_id / "height.u16").read_bytes(), dtype="<u2")
    expected = detail["height"] * detail["width"]
    assert raw.size == expected, site_id
    span = detail["elevation"]["max"] - detail["elevation"]["min"]
    return detail["elevation"]["min"] + raw.astype(np.float64).reshape(detail["height"], detail["width"]) / 65535.0 * span
