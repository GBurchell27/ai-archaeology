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

    metadata = json.loads((ROOT / "Anatolia/atlas/public/terrain/metadata.json").read_text())
    footer = metadata["attribution"]["gem15"]
    assert "This dataset is produced by Google" in footer
    assert "10.31223/X55N75" in footer
    terrain = ROOT / "Anatolia/atlas/public/terrain"
    assert metadata["details"]
    for site_id, detail in metadata["details"].items():
        assert detail["terrain"]["default"] == "gem15"
        height = terrain / detail["heightFile"]
        assert height.is_file()
        assert height.stat().st_size == detail["width"] * detail["height"] * 2
        fallback = detail["terrain"]["copernicus"]
        copernicus = terrain / fallback["heightFile"]
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
