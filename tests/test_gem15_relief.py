"""GEM-15 tile names and void fill. No network and no site coordinates."""

import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "Anatolia" / "atlas" / "scripts"


def _load(name: str):
    path = SCRIPTS / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_gem15_cell_url_uses_the_public_layout():
    tiles = _load("gem15_tiles")
    url = tiles.tile_url(38, 37, "dsm")
    assert url == (
        "https://storage.googleapis.com/climate-and-sustainability/gem-15/"
        "p30_p30/w38s37/dsm/zall/mosaic.tif"
    )
    assert tiles.tile_url(29, 40, "dsm").endswith("/p40_p20/w29s40/dsm/zall/mosaic.tif")
    assert tiles.tile_url(27, 37, "dsm").endswith("/p30_p20/w27s37/dsm/zall/mosaic.tif")


def test_gem15_cells_are_named_by_their_south_west_corner_in_every_hemisphere():
    tiles = _load("gem15_tiles")
    assert tiles.tile_url(-2, 51).endswith("/p50_m10/wm2s51/dsm/zall/mosaic.tif")
    assert tiles.tile_url(-78, -11).endswith("/m20_m80/wm78sm11/dsm/zall/mosaic.tif")
    assert tiles.tile_url(30, -21).endswith("/m30_p30/w30sm21/dsm/zall/mosaic.tif")
    assert list(tiles._cells(-0.5, -0.5, 0.5, 0.5)) == [(-1, -1), (-1, 0), (0, -1), (0, 0)]


def test_glo30_tiles_are_named_by_their_south_west_corner_in_every_hemisphere():
    tiles = _load("glo30_tiles")
    assert tiles.tile_name(37, 38) == "Copernicus_DSM_COG_10_N37_00_E038_00_DEM"
    assert tiles.tile_name(51, -2) == "Copernicus_DSM_COG_10_N51_00_W002_00_DEM"
    assert tiles.tile_name(-11, -78) == "Copernicus_DSM_COG_10_S11_00_W078_00_DEM"
    assert tiles.tile_name(-21, 30) == "Copernicus_DSM_COG_10_S21_00_E030_00_DEM"
    assert tiles.tile_name(0, 0) == "Copernicus_DSM_COG_10_N00_00_E000_00_DEM"
    # A point at lat -0.5, lon -0.5 floors to the S01 / W001 tile.
    assert list(tiles._cells(-0.6, -0.6, -0.4, -0.4)) == [(-1, -1)]
    assert tiles.tile_name(-1, -1) == "Copernicus_DSM_COG_10_S01_00_W001_00_DEM"
    assert tiles.tile_url(5, 7).endswith("_N05_00_E007_00_DEM/Copernicus_DSM_COG_10_N05_00_E007_00_DEM.tif")


def test_masked_cells_take_the_reference_on_the_gem_datum():
    fill = _load("relief_fill")
    primary = np.array([[10.0, np.nan], [12.0, np.nan]], dtype=np.float32)
    reference = np.array([[11.0, 5.0], [13.0, np.nan]], dtype=np.float32)
    # Pad so the overlap meets the median sample count.
    primary = np.pad(primary, 4, constant_values=10.0)
    reference = np.pad(reference, 4, constant_values=11.0)
    primary[0, 0] = np.nan
    filled, offset = fill.fill_masked_cells(primary, reference)
    assert offset == 1.0
    assert filled[0, 0] == 10.0
    assert np.isnan(filled[5, 5])
    assert filled[4, 5] == 4.0


def test_baked_place_relief_has_gem_and_copernicus():
    import json
    import subprocess

    tracked = set(subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines())
    metadata = json.loads((ROOT / "Anatolia/atlas/public/terrain/metadata.json").read_text())
    footer = metadata["attribution"]["gem15"]
    assert "This dataset is produced by Google" in footer
    assert "10.31223/X55N75" in footer
    terrain = ROOT / "Anatolia/atlas/public/terrain"
    assert metadata["details"]
    for site_id, detail in metadata["details"].items():
        assert detail["terrain"]["default"] == "gem15"
        height = terrain / detail["heightFile"]
        assert f"Anatolia/atlas/public/terrain/{detail['heightFile']}" in tracked
        assert height.is_file()
        assert height.stat().st_size == detail["width"] * detail["height"] * 2
        fallback = detail["terrain"]["copernicus"]
        relative = f"Anatolia/atlas/public/terrain/{fallback['heightFile']}"
        assert relative in tracked, relative
        copernicus = ROOT / relative
        assert copernicus.is_file()
        assert copernicus.stat().st_size == fallback["width"] * fallback["height"] * 2
        assert (terrain / detail["rasters"]["hillshade"]).is_file()
        assert site_id


def test_credit_names_google_and_the_preprint():
    credits = _load("terrain_credits")
    assert credits.GEM15_ATTRIBUTION == "This dataset is produced by Google"
    assert credits.GEM15_ATTRIBUTION in credits.GEM15_CREDIT
    assert "10.31223/X55N75" in credits.GEM15_CREDIT
    assert "CC BY 4.0" in credits.GEM15_CREDIT
    assert "experimental" in credits.GEM15_CREDIT.lower() or "Experimental" in credits.GEM15_CREDIT
    assert "GLO-30" in credits.GEM15_CREDIT
