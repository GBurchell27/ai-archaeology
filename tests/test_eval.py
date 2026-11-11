"""Blind-fold structure, recall maths, and the rule that candidate coordinates stay private."""

import math
from pathlib import Path

import pytest

from ai_archaeology.eval.cv import leave_one_out
from ai_archaeology.eval.metrics import density_per_100km2, expected_random_recall, nearest_hits, recall_at
from ai_archaeology.eval.report import assert_private_path, public_metrics, write_candidates


def test_held_out_region_is_absent_from_tuning():
    seen = []

    def tune(train_ids):
        seen.append(tuple(train_ids))
        return {"fold": tuple(train_ids)}

    def apply(held, params):
        assert held not in params["fold"]
        return held

    reports = leave_one_out(["urfa", "konya", "aegean-south"], tune, apply)
    assert reports == ["urfa", "konya", "aegean-south"]
    assert seen == [("konya", "aegean-south"), ("urfa", "aegean-south"), ("urfa", "konya")]


def test_recall_bands_and_random_baseline_on_a_synthetic_window():
    # 10 km square. One candidate 100 m from the site, one 800 m away.
    sites = [("tell", 32.0, 37.0)]
    near = (32.0 + 100 / 111_320, 37.0)
    far = (32.0, 37.0 + 800 / 110_540)
    hits = nearest_hits(sites, [near, far])
    assert hits[0].band == "250"
    assert recall_at(hits, 250) == 1
    assert recall_at(nearest_hits(sites, [far]), 500) == 0
    assert recall_at(nearest_hits(sites, [far]), 1000) == 1
    area_km2 = 100.0
    assert density_per_100km2(2, area_km2) == pytest.approx(2.0)
    area_m2 = area_km2 * 1_000_000
    chance = expected_random_recall(2, area_m2, 250)
    disk = math.pi * 250 ** 2
    assert chance == pytest.approx(1 - (1 - disk / area_m2) ** 2)


def test_candidate_coordinates_are_rejected_outside_outputs(tmp_path):
    with pytest.raises(ValueError):
        write_candidates(Path("Anatolia/eval/candidates.json"), [{"longitude": 30.0, "latitude": 37.0}])
    private = Path("outputs/eval/test-candidates.json")
    write_candidates(private, [{"longitude": 30.0, "latitude": 37.0}])
    assert_private_path(private)
    private.unlink()
    published = public_metrics({"recall_250": 0.2, "sites": [{"id": "troy", "band": "miss", "longitude": 26.2}]})
    assert "longitude" not in json_dump(published)
    assert published["sites"][0]["id"] == "troy"


def json_dump(payload) -> str:
    import json
    return json.dumps(payload)
