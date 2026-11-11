"""A Turkey transfer target never reaches the model fit."""

from types import SimpleNamespace

from ai_archaeology.pipeline.smoke import _cross_validate, _transfer


def test_cross_validate_skips_a_transfer_target(monkeypatch):
    calls = []
    monkeypatch.setattr(
        "ai_archaeology.pipeline.smoke._one_fold",
        lambda *args, **kwargs: calls.append(args),
    )
    turkey = SimpleNamespace(region=SimpleNamespace(role="transfer_target", region_id="turkey_tektek"))
    assert _cross_validate([turkey], None, None) == []
    assert calls == []


def test_transfer_fit_is_not_called_on_the_target_alone(monkeypatch):
    calls = []
    monkeypatch.setattr(
        "ai_archaeology.pipeline.smoke.fit_models",
        lambda *args, **kwargs: calls.append(args),
    )
    turkey = SimpleNamespace(
        region=SimpleNamespace(
            role="transfer_target",
            is_transfer_target=True,
            region_id="turkey_tektek",
        )
    )
    report = _transfer([turkey], None, None)
    assert calls == []
    assert report["status"] == "skipped"
