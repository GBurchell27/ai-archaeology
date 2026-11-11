"""A Turkey transfer target never reaches the model fit."""

from types import SimpleNamespace

import pytest

from ai_archaeology.pipeline.smoke import _cross_validate, _one_fold, _transfer


def _turkey():
    return SimpleNamespace(
        region=SimpleNamespace(
            role="transfer_target",
            is_transfer_target=True,
            region_id="turkey_tektek",
        )
    )


def test_cross_validate_skips_a_transfer_target():
    try:
        rows = _cross_validate([_turkey()], None, None)
    except AssertionError as exc:
        pytest.fail(f"transfer target reached training: {exc}")
    assert rows == []


def test_one_fold_refuses_a_transfer_target():
    with pytest.raises(AssertionError, match="not a training source"):
        _one_fold(_turkey(), None, [], 0)


def test_transfer_fit_is_not_called_on_the_target_alone(monkeypatch):
    calls = []

    def record_fit(*args, **kwargs):
        calls.append(args)
        raise AssertionError("transfer target reached fit_models")

    monkeypatch.setattr("ai_archaeology.pipeline.smoke.fit_models", record_fit)
    try:
        report = _transfer([_turkey()], None, None)
    except AssertionError as exc:
        pytest.fail(str(exc))
    assert calls == []
    assert report["status"] == "skipped"
