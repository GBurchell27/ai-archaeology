"""Coarse suitability layer. Synthetic data only."""

import json

import numpy as np
import pytest
from PIL import Image
from scipy.stats import spearmanr

from ai_archaeology.pipeline.report import FORBIDDEN_KEYS
from ai_archaeology.suitability.aggregate import block_reduce, slope_degrees_geographic
from ai_archaeology.suitability.background import target_group_background
from ai_archaeology.suitability.distance import distance_km
from ai_archaeology.suitability.envelope import covariate_range, inside_envelope, locally_documented
from ai_archaeology.suitability.export import decile_raster, layer_entry, write_decile_png, write_index
from ai_archaeology.suitability.folds import block_folds, block_ids, macro_region
from ai_archaeology.suitability.grid import N_COLS, N_ROWS, SHAPE, area_weights, cell_centre, cell_of
from ai_archaeology.suitability.labels import in_class, in_period, presence_layers
from ai_archaeology.suitability.layer import evaluate_layer
from ai_archaeology.suitability.model import effort_stack, fit_logistic, predict_logistic
from ai_archaeology.world.records import WorldSite

LAND_ROWS, LAND_COLS = slice(200, 400), slice(400, 800)


def sigmoid(values):
    return 1.0 / (1.0 + np.exp(-values))


@pytest.fixture(scope="module")
def planted_layer():
    """Presence follows the first covariate only. The second is noise."""
    rng = np.random.default_rng(7)
    land = np.zeros(SHAPE, dtype=bool)
    land[LAND_ROWS, LAND_COLS] = True
    stack = rng.normal(size=(2, *SHAPE)).astype(np.float32)
    presence = land & (rng.random(SHAPE) < sigmoid(2.0 * stack[0] - 2.0))
    other_sites = land & (rng.random(SHAPE) < 0.5)
    site_counts = presence.astype(int) + other_sites
    result = evaluate_layer(presence, target_group_background(site_counts), stack, land, effort_stack(site_counts))
    return result, stack, land


def test_planted_rule_is_recovered_on_held_out_blocks(planted_layer):
    result, stack, land = planted_layer
    assert result.metrics["boyce"] > 0.5
    assert result.metrics["auc"] > 0.7
    assert result.metrics["auc"] > result.metrics["effortNullAuc"]
    assert result.metrics["gainTop10"] > 0
    scored = np.isfinite(result.scores)
    assert spearmanr(result.scores[scored], stack[0][scored]).statistic > 0.9


def test_target_group_background_removes_planted_survey_bias():
    """Sites are rare per cell, as in the real record. Where most surveyed cells hold the
    modelled class, the correction weakens: that limit is why the layer keeps its caveats."""
    rng = np.random.default_rng(3)
    n_cells = 200_000
    driver, access = rng.normal(size=(2, n_cells))
    features = np.column_stack([driver, access])
    surveyed = sigmoid(3.0 * access)
    presence = rng.random(n_cells) < 0.2 * sigmoid(2.0 * driver - 1.0) * surveyed
    documented = presence | (rng.random(n_cells) < 0.1 * surveyed)

    target_group = fit_logistic(features[documented], presence[documented])
    random_cells = rng.choice(n_cells, size=int(presence.sum()) * 3)
    uniform = fit_logistic(
        np.vstack([features[presence], features[random_cells]]),
        np.concatenate([np.ones(presence.sum()), np.zeros(len(random_cells))]),
    )

    bias_with_target_group = spearmanr(predict_logistic(target_group, features), access).statistic
    bias_with_uniform = spearmanr(predict_logistic(uniform, features), access).statistic
    assert bias_with_uniform > 0.4
    assert abs(bias_with_target_group) < 0.15


def test_folds_never_share_a_block():
    rows, cols = np.nonzero(np.ones(SHAPE, dtype=bool))
    folds, blocks = block_folds(rows, cols, n_folds=5, seed=0), block_ids(rows, cols)
    assert len(np.unique(blocks * 5 + folds)) == len(np.unique(blocks)) == 36 * 72
    assert set(np.unique(folds)) == {0, 1, 2, 3, 4}
    assert np.array_equal(folds, block_folds(rows, cols, n_folds=5, seed=0))
    assert not np.array_equal(folds, block_folds(rows, cols, n_folds=5, seed=1))
    assert set(np.unique(macro_region(rows, cols))) == {0, 1, 2, 3, 4}


def test_envelope_masks_out_of_range_cells(planted_layer):
    low, high = covariate_range(np.linspace(0.0, 100.0, 101).reshape(-1, 1).repeat(2, axis=1))
    inside = inside_envelope(np.array([[50.0, 50.0], [50.0, 100.0], [-5.0, 50.0], [np.nan, 50.0]]), low, high)
    assert inside.tolist() == [True, False, False, False]

    documented = np.zeros(SHAPE, dtype=bool)
    documented[100, 100] = True  # one lonely site is not a basis
    documented[300:305, 0:5] = True
    supported = locally_documented(documented)
    assert not supported[100, 100] and supported[302, 2] and supported[302, N_COLS - 3] and not supported[302, 40]

    result, stack, land = planted_layer
    raster = decile_raster(result)
    extreme = land & (np.abs(stack[0]) > 4.0)
    assert extreme.any() and (raster[extreme] == 255).all()
    assert (raster[~land] == 0).all()


def coordinate_like_keys(value) -> set[str]:
    banned = FORBIDDEN_KEYS | {"lon", "lat", "lng", "row", "col", "rows", "cols", "cells", "x", "y"}
    if isinstance(value, dict):
        return (set(value) & banned).union(*(coordinate_like_keys(item) for item in value.values()))
    if isinstance(value, list):
        return set().union(*(coordinate_like_keys(item) for item in value))
    return set()


def test_export_has_no_coordinates_and_only_contract_values(planted_layer, tmp_path):
    result, _, _ = planted_layer
    write_decile_png(tmp_path / "monument_all.png", decile_raster(result))
    write_index(tmp_path / "index.json", [layer_entry("monument", "all", result)], [])

    image = Image.open(tmp_path / "monument_all.png")
    assert image.mode == "L" and image.size == (N_COLS, N_ROWS)
    assert set(np.unique(np.asarray(image)).tolist()) <= set(range(11)) | {255}
    assert set(np.unique(np.asarray(image)).tolist()) >= set(range(11))

    index = json.loads((tmp_path / "index.json").read_text(encoding="utf-8"))
    assert coordinate_like_keys(index) == set()
    layer = index["layers"][0]
    assert set(layer["metrics"]) == {"boyce", "gainTop10", "gainTop20", "auc", "effortNullAuc", "folds"}
    assert layer["caveats"] and "predicted" not in json.dumps(index).lower()


def test_grid_round_trips_at_poles_and_antimeridian():
    assert [int(index) for index in cell_of(-180.0, 90.0)] == [0, 0]
    assert [int(index) for index in cell_of(180.0, -90.0)] == [N_ROWS - 1, 0]
    assert [int(index) for index in cell_of(179.999, -89.999)] == [N_ROWS - 1, N_COLS - 1]
    rows, cols = np.nonzero(np.ones(SHAPE, dtype=bool))
    back_rows, back_cols = cell_of(*cell_centre(rows, cols))
    assert np.array_equal(back_rows, rows) and np.array_equal(back_cols, cols)
    assert area_weights()[0, 0] < 0.01 < 0.99 < area_weights()[N_ROWS // 2, 0]


def test_distance_crosses_the_antimeridian():
    target, query = np.zeros(SHAPE, dtype=bool), np.zeros(SHAPE, dtype=bool)
    target[360, 0] = True
    query[360, N_COLS - 4] = True
    assert distance_km(target, query)[360, N_COLS - 4] == pytest.approx(111.2, abs=0.5)


def test_fine_raster_aggregation():
    eastward_ramp = np.tile(np.arange(120, dtype=np.float32) * 1000.0, (60, 1))
    assert block_reduce(eastward_ramp, 60, np.mean).tolist() == [[29500.0, 89500.0]]
    slopes = slope_degrees_geographic(eastward_ramp, north_latitude=60.5, pixel_degrees=1 / 60)
    expected = np.degrees(np.arctan(1000.0 / (111_320.0 / 60 * np.cos(np.radians(60.0)))))
    assert slopes.mean() == pytest.approx(expected, rel=0.01)


def published_site(index: int, site_type: str, start, end) -> WorldSite:
    return WorldSite(
        id=f"Q{index}", name="synthetic", lon=-170.0 + index * 0.3, lat=10.0, source="wikidata",
        licence="CC0", attribution="synthetic", sourceUrl="", siteType=site_type, startYear=start, endYear=end,
    )


def test_labels_split_by_class_and_period():
    henge, undated_tell = published_site(1, "megalith", -3000, None), published_site(2, "tell", None, None)
    assert in_class(henge, "monument") and not in_class(henge, "settlement") and in_class(undated_tell, "any")
    assert in_period(henge, "mid-holocene") and not in_period(henge, "late-holocene")
    assert in_period(undated_tell, "all") and not in_period(undated_tell, "mid-holocene")
    sites = [published_site(index, "megalith", -3000, -2500) for index in range(250)]
    assert set(presence_layers(sites)) == {
        ("monument", "mid-holocene"), ("any", "mid-holocene"), ("monument", "all"), ("any", "all"),
    }
