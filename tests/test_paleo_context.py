"""The globe's ice and sea level layer: the build's pure functions. Synthetic grids only."""

import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from ai_archaeology.paleo_context import (
    EXPOSED_LAND,
    GLOBAL_SHAPE,
    ICE,
    LAND,
    SEA,
    SOURCE_SHAPE,
    classify_step,
    index_payload,
    pad_to_global,
    source_file_name,
    step_entry,
    step_time_ids,
    time_id_year,
)

NO_DATA = -32768
PALEO = Path(__file__).resolve().parents[1] / "Anatolia" / "atlas" / "public" / "paleo"


def test_steps_run_every_500_years_from_20000_bce_to_the_present():
    years = [time_id_year(time_id) for time_id in step_time_ids()]
    assert years[0] == -20000 and years[-1] == 2000
    assert set(np.diff(years)) == {500}


def test_source_file_names_match_the_bucket():
    assert source_file_name("orog", -190) == "CHELSA_TraCE21k_orog_-190_V.1.0.tif"
    assert source_file_name("glz", -5) == "CHELSA_TraCE21k_glz_-005_V.1.0.tif"
    assert source_file_name("orog", 20) == "CHELSA_TraCE21k_orog_0020_V.1.0.tif"


def test_classes_ice_wins_then_land_the_sea_covers_today():
    orog = np.array([[NO_DATA, 300, 40, 1900, -28, 800, 900, 2500]], dtype=np.int16)
    present = np.array([[NO_DATA, 300, NO_DATA, 400, -28, NO_DATA, 880, 2400]], dtype=np.int16)
    glz = np.array([[NO_DATA, NO_DATA, NO_DATA, 1900, NO_DATA, 800, 700, NO_DATA]], dtype=np.int16)
    # In order: sea; land; exposed sea floor; ice on land; a depression below sea level, still land;
    # ice over today's sea; an ice surface in the files with no rise above today's ground, so no ice;
    # a rise with no ice surface, so no ice.
    assert classify_step(orog, glz, present).tolist() == [[SEA, LAND, EXPOSED_LAND, ICE, LAND, ICE, LAND, LAND]]


def test_padding_puts_the_source_rows_below_84_north():
    classes = np.full(SOURCE_SHAPE, ICE, dtype=np.uint8)
    padded = pad_to_global(classes)
    assert padded.shape == GLOBAL_SHAPE
    assert (padded[:24] == SEA).all() and (padded[24:] == ICE).all()
    with pytest.raises(ValueError):
        pad_to_global(np.zeros(GLOBAL_SHAPE, dtype=np.uint8))


def test_index_is_sorted_and_carries_the_credit():
    payload = index_payload([step_entry(20), step_entry(-200)], "2026-01-01")
    assert [step["year"] for step in payload["steps"]] == [-20000, 2000]
    assert payload["steps"][0] == {"year": -20000, "file": "-20000.png"}
    assert payload["source"]["licence"] == "CC0 1.0" and payload["source"]["citation"]


def test_published_files_match_their_index():
    index = json.loads((PALEO / "index.json").read_text(encoding="utf-8"))
    assert len(index["steps"]) == len(step_time_ids())
    # The source publishes no sea level, so the published file states none.
    assert all(set(step) == {"year", "file"} for step in index["steps"])
    for step in (index["steps"][0], index["steps"][-1]):
        with Image.open(PALEO / step["file"]) as raster:
            assert raster.size == (GLOBAL_SHAPE[1], GLOBAL_SHAPE[0]) and raster.mode == "L"
            assert set(np.unique(np.asarray(raster))) <= {SEA, LAND, EXPOSED_LAND, ICE}
    with Image.open(PALEO / index["steps"][-1]["file"]) as present:
        assert not np.isin(np.asarray(present), [EXPOSED_LAND, ICE]).any()  # the layer draws only what differs from today
