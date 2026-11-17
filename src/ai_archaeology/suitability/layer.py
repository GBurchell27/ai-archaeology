"""Evaluate and map one site class x period layer."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ai_archaeology.suitability.crossval import out_of_fold_scores
from ai_archaeology.suitability.envelope import covariate_range, inside_envelope, locally_documented
from ai_archaeology.suitability.folds import MACRO_REGIONS, block_folds, macro_region
from ai_archaeology.suitability.grid import area_weights
from ai_archaeology.suitability.labels import MIN_PRESENCE_CELLS
from ai_archaeology.suitability.metrics import capture_at_top_area, continuous_boyce, kvamme_gain, presence_auc
from ai_archaeology.suitability.model import MODELS, fit_logistic, predict_logistic

N_FOLDS = 5
MIN_REGION_PRESENCES = 20


class InsufficientCells(ValueError):
    """Too few presence or contrast cells to say anything."""


@dataclass
class LayerResult:
    presences: int
    model_name: str
    metrics: dict[str, float]
    fold_metrics: list[dict[str, float]]  # the same scores within each held-out fold
    captures: dict[str, tuple[int, int]]  # top-area share -> (presences captured, presences held out)
    region_auc: dict[str, float]
    scores: np.ndarray  # full grid, NaN where the model has no basis
    reference_scores: np.ndarray  # final scores of the documented cells: the decile yardstick
    land: np.ndarray


def best_model(features: np.ndarray, labels: np.ndarray, folds: np.ndarray) -> tuple[str, np.ndarray]:
    """The model with the higher held-out AUC, and its held-out scores."""
    held_out = {
        name: out_of_fold_scores(fit, predict, features, labels, folds) for name, (fit, predict) in MODELS.items()
    }
    name = max(held_out, key=lambda candidate: presence_auc(held_out[candidate], labels))
    return name, held_out[name]


def held_out_metrics(scores, null_scores, labels, area) -> tuple[dict[str, float], dict[str, tuple[int, int]]]:
    captures = {share: capture_at_top_area(scores, labels, area, fraction) for share, fraction in (("10", 0.1), ("20", 0.2))}
    metrics = {
        "boyce": continuous_boyce(scores[labels], scores),
        "gainTop10": kvamme_gain(*captures["10"], 0.1),
        "gainTop20": kvamme_gain(*captures["20"], 0.2),
        "auc": presence_auc(scores, labels),
        "effortNullAuc": presence_auc(null_scores, labels),
        "folds": N_FOLDS,
    }
    return metrics, captures


def per_fold_metrics(scores, null_scores, labels, area, folds) -> list[dict[str, float]]:
    return [
        held_out_metrics(scores[held_out], null_scores[held_out], labels[held_out], area[held_out])[0]
        for held_out in (folds == fold for fold in np.unique(folds))
        if 0 < labels[held_out].sum() < held_out.sum()
    ]


def region_aucs(model_name: str, features, labels, regions) -> dict[str, float]:
    """AUC in each macro-region when the model is fitted on all the others."""
    fit, predict = MODELS[model_name]
    scores = out_of_fold_scores(fit, predict, features, labels, regions)
    result = {}
    for index, name in enumerate(MACRO_REGIONS):
        inside = regions == index
        if MIN_REGION_PRESENCES <= labels[inside].sum() < inside.sum():
            result[name] = presence_auc(scores[inside], labels[inside])
    return result


def score_grid(model_name: str, features, labels, stack, land, background) -> tuple[np.ndarray, np.ndarray]:
    """Final model fitted on every documented cell, scored on land the model has a basis for."""
    fit, predict = MODELS[model_name]
    model = fit(features, labels, 0)
    land_features = stack[:, land].T
    inside = inside_envelope(land_features, *covariate_range(features)) & locally_documented(background)[land]
    scores = np.full(land.shape, np.nan)
    rows, cols = np.nonzero(land)
    scores[rows[inside], cols[inside]] = predict(model, land_features[inside])
    return scores, predict(model, features)


def evaluate_layer(presence, background, stack, land, effort) -> LayerResult:
    """Cross-validate on 5 degree blocks against the effort-only null, then map the layer."""
    documented = background & land & np.isfinite(stack).all(axis=0)
    rows, cols = np.nonzero(documented)
    labels = presence[rows, cols]
    if min(labels.sum(), (~labels).sum()) < MIN_PRESENCE_CELLS:
        raise InsufficientCells(f"{int(labels.sum())} presence and {int((~labels).sum())} contrast cells")
    features, effort_features = stack[:, rows, cols].T, effort[:, rows, cols].T
    folds = block_folds(rows, cols, N_FOLDS)
    model_name, held_out = best_model(features, labels, folds)
    null_scores = out_of_fold_scores(fit_logistic, predict_logistic, effort_features, labels, folds)
    area = area_weights()[rows, cols]
    metrics, captures = held_out_metrics(held_out, null_scores, labels, area)
    scores, reference_scores = score_grid(model_name, features, labels, stack, land, background)
    return LayerResult(
        presences=int(labels.sum()),
        model_name=model_name,
        metrics=metrics,
        fold_metrics=per_fold_metrics(held_out, null_scores, labels, area, folds),
        captures=captures,
        region_auc=region_aucs(model_name, features, labels, macro_region(rows, cols)),
        scores=scores,
        reference_scores=reference_scores,
        land=land,
    )
