"""Gradient-boosting baseline on hand-crafted relief features."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier


class InsufficientLabels(RuntimeError):
    pass


def fit_boosting(features: np.ndarray, labels: np.ndarray, seed: int):
    _require_both_classes(labels)
    model = HistGradientBoostingClassifier(
        max_depth=3,
        max_iter=40,
        learning_rate=0.1,
        random_state=seed,
    )
    model.fit(features, labels.astype(int))
    return model


def predict_boosting(model, features: np.ndarray) -> np.ndarray:
    return model.predict_proba(features)[:, 1]


def _require_both_classes(labels: np.ndarray) -> None:
    classes = set(int(label) for label in labels)
    if classes != {0, 1}:
        raise InsufficientLabels(f"boosting needs both classes, found {sorted(classes)}")
