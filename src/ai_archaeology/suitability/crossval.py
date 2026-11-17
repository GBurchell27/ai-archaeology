"""Held-out scores: each cell is scored by a model that never saw its fold."""

from __future__ import annotations

import numpy as np


def out_of_fold_scores(fit, predict, features: np.ndarray, labels: np.ndarray, folds: np.ndarray) -> np.ndarray:
    scores = np.empty(len(labels), dtype=float)
    for fold in np.unique(folds):
        held_out = folds == fold
        model = fit(features[~held_out], labels[~held_out], 0)
        scores[held_out] = predict(model, features[held_out])
    return scores
