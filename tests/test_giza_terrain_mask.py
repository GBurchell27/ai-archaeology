"""Pyramid mounds are cleared without a network and without coordinates."""

import importlib.util
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "Anatolia" / "atlas" / "scripts" / "giza_terrain_mask.py"


def _load():
    spec = importlib.util.spec_from_file_location("giza_terrain_mask", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_the_trio_follows_published_spacing_not_the_tallest_nearby_mound():
    mask = _load()
    cell_m = 15.0
    pyramids = (
        mask.PyramidPlan("khufu", 0.0, 0.0, 230.0),
        mask.PyramidPlan("khafre", -330.0, 350.0, 215.0),
        mask.PyramidPlan("menkaure", -570.0, 740.0, 105.0),
    )
    grid = np.full((180, 180), 50.0, dtype=np.float32)
    west_m, north_m = -1000.0, -200.0
    for pyramid, height_m in zip(pyramids, (140.0, 130.0, 55.0), strict=True):
        _cone(grid, *_cell(pyramid, west_m, north_m, cell_m), height_m, 7.0)
    # Taller than Menkaure, and too close to Khufu to be one of the three.
    _cone(grid, *_cell(mask.PyramidPlan("decoy", 160.0, 20.0, 40.0), west_m, north_m, cell_m), 80.0, 4.0)
    peaks = mask.match_pyramids(grid, cell_m, pyramids)
    for peak, pyramid in zip(peaks, pyramids, strict=True):
        row, col = _cell(pyramid, west_m, north_m, cell_m)
        assert abs(peak[0] - row) <= 1 and abs(peak[1] - col) <= 1


def test_a_mound_is_replaced_by_the_ground_beside_it():
    mask = _load()
    cell_m = 15.0
    grid = np.full((80, 80), 40.0, dtype=np.float32)
    grid += np.linspace(0.0, 4.0, 80, dtype=np.float32)[None, :]
    far = float(grid[2, 2])
    plan = mask.PyramidPlan("khufu", 0.0, 0.0, 120.0)
    row, col = 40.0, 40.0
    _cone(grid, row, col, 90.0, 6.0)
    foot = mask.PlacedFootprint(plan, row, col, mask.corner_radius_m(plan.base_m), 0.0)
    cleared = mask.flatten_footprints(grid, [foot], cell_m)
    centre = float(cleared[int(row), int(col)])
    # The cone is gone. The cell sits on the gently sloping ground, not on the mound.
    assert 38.0 < centre < 50.0
    assert centre < float(grid[int(row), int(col)]) - 40.0
    assert float(cleared[2, 2]) == far


def test_an_overlap_keeps_the_lower_base_whichever_pyramid_is_first():
    mask = _load()
    cell_m = 10.0
    grid = np.full((80, 80), 30.0, dtype=np.float32)
    grid[:, 48:] = 80.0
    khufu = mask.PlacedFootprint(mask.PyramidPlan("khufu", 0.0, 0.0, 40.0), 40.0, 34.0, 100.0, 0.0)
    khafre = mask.PlacedFootprint(mask.PyramidPlan("khafre", 0.0, 0.0, 40.0), 40.0, 44.0, 100.0, 0.0)
    forward = mask.flatten_footprints(grid, [khufu, khafre], cell_m)
    reverse = mask.flatten_footprints(grid, [khafre, khufu], cell_m)
    assert np.array_equal(forward, reverse)
    lower = min(
        mask.footprint_base_m(grid, khufu, [khufu, khafre], cell_m),
        mask.footprint_base_m(grid, khafre, [khufu, khafre], cell_m),
    )
    # The midpoint is inside both disks. It takes the lower base, not whichever was written last.
    assert abs(float(forward[40, 39]) - lower) < 1e-3
    assert lower < 50.0


def _cell(pyramid, west_m: float, north_m: float, cell_m: float) -> tuple[float, float]:
    column = (pyramid.east_m - west_m) / cell_m - 0.5
    row = (pyramid.south_m - north_m) / cell_m - 0.5
    return row, column


def _cone(grid: np.ndarray, row: float, col: float, height_m: float, radius_cells: float) -> None:
    rows = np.arange(grid.shape[0], dtype=np.float32)[:, None]
    cols = np.arange(grid.shape[1], dtype=np.float32)[None, :]
    distance = np.hypot(rows - np.float32(row), cols - np.float32(col))
    grid += (height_m * np.clip(1.0 - distance / radius_cells, 0.0, 1.0)).astype(np.float32)
