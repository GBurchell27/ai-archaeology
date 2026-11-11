"""The tell score prefers a round flat-topped mound over a ridge, without using labels."""

import numpy as np

from ai_archaeology.eval.cv import leave_one_out, select_tell
from ai_archaeology.eval.metrics import wilson_interval
from ai_archaeology.eval.tell import TellWeights, hand_scores


def _landscape() -> np.ndarray:
    pixel = 30.0
    size = 160
    row, column = np.mgrid[0:size, 0:size]
    dem = np.full((size, size), 80.0, dtype=np.float32)
    mound = np.hypot(row - 40, column - 40) * pixel
    dem += np.where(mound < 70, 12.0, np.clip((210 - mound) / 140.0 * 12.0, 0, 12)).astype(np.float32)
    ridge = np.abs(row - 110) * pixel
    along = (column > 20) & (column < 140)
    dem += np.where(along, np.clip((90 - ridge) / 90.0, 0, 1) * 16.0, 0).astype(np.float32)
    return dem


def test_round_flat_top_outranks_a_ridge():
    dem = _landscape()
    from ai_archaeology.eval.detect import _elongation, prepare_surface
    from ai_archaeology.eval.tell import PeakTable, _features, context_rasters

    shared = context_rasters(dem, 30.0)
    surface = prepare_surface(dem, 30.0, 600.0)
    surface.update(shared)

    def row_features(row: int, column: int) -> list[float]:
        elongation = _elongation(surface["relief"], row, column)
        return _features(surface, row, column, 30.0, max(elongation, 1.0))

    features = np.vstack([row_features(40, 40), row_features(110, 80)])
    table = PeakTable(np.array([30.05, 30.1]), np.array([36.15, 36.05]), features.astype(np.float32))
    scores = hand_scores(table, TellWeights(600.0, 3.0, 1.2, 1.2, 1.0))
    assert scores[0] > scores[1]
    assert scores[0] > 0


def test_tell_tuning_does_not_receive_the_held_out_region():
    seen = []

    def tune(train_ids):
        seen.append(set(train_ids))
        return train_ids

    def apply(held, params):
        assert held not in params
        return held

    reports = leave_one_out(["urfa", "konya"], tune, apply)
    assert reports == ["urfa", "konya"]
    assert seen == [{"konya"}, {"urfa"}]


def test_wilson_interval_covers_a_known_proportion():
    low, high = wilson_interval(4, 47)
    assert low < 4 / 47 < high
    assert high - low < 0.25
    assert wilson_interval(0, 0) == (0.0, 0.0)


def test_select_tell_uses_only_the_regions_it_is_given(monkeypatch):
    calls = []

    def fake_scores(table, weights):
        calls.append(weights.relief_radius_m)
        return np.ones(len(table), dtype=np.float32)

    monkeypatch.setattr("ai_archaeology.eval.cv.hand_scores", fake_scores)
    monkeypatch.setattr("ai_archaeology.eval.cv.HAND_GRID", (TellWeights(600.0, 3.0, 1.0, 1.0, 1.0),))

    class Table:
        longitude = np.array([30.0, 30.01])
        latitude = np.array([37.0, 37.01])
        features = np.ones((2, 9), dtype=np.float32)

        def __len__(self):
            return 2

    class Site:
        id = "tell"
        longitude = 30.0
        latitude = 37.0
        terrain = "mound"

    class Grid:
        area_m2 = 20_000_000.0

    class Region:
        tables = {600.0: Table(), 1000.0: Table()}
        sites = [Site()]
        grid = Grid()

    prepared = {"urfa": Region(), "konya": Region()}
    choice = select_tell(prepared, ["urfa"])
    assert choice.weights.relief_radius_m == 600.0
    assert "konya" not in str(choice.weights)
