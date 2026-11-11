"""Fit the CNN and the gradient-boosting baseline and score a patch set."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ai_archaeology.train.boosting import InsufficientLabels, fit_boosting, predict_boosting
from ai_archaeology.train.cnn import fit_cnn, predict_cnn
from ai_archaeology.train.features import relief_feature_vector
from ai_archaeology.train.metrics import binary_metrics
from ai_archaeology.train.patches import LabelledPatch


@dataclass
class FittedModels:
    boosting: object | None
    cnn: object | None


def as_arrays(patches: list[LabelledPatch]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    images = np.stack([patch.values for patch in patches]).astype(np.float32)
    features = np.stack([relief_feature_vector(patch.values) for patch in patches])
    labels = np.asarray([patch.label for patch in patches], dtype=np.int64)
    images[images == -9999.0] = 0.0
    return images, features, labels


def fit_models(patches: list[LabelledPatch], epochs: int, learning_rate: float, seed: int) -> tuple[FittedModels, dict]:
    if len(patches) < 2:
        return FittedModels(None, None), {"status": "skipped", "reason": "fewer than 2 patches"}
    images, features, labels = as_arrays(patches)
    boosting, boosting_note = _fit_boosting(features, labels, seed)
    cnn, cnn_note = _fit_network(images, labels, epochs, learning_rate, seed)
    return FittedModels(boosting, cnn), {"status": "ok", "gradient_boosting": boosting_note, "cnn": cnn_note}


def score_patches(models: FittedModels, patches: list[LabelledPatch]) -> dict:
    if not patches:
        return {"status": "skipped", "reason": "no evaluation patches"}
    images, features, labels = as_arrays(patches)
    report = {"status": "ok", "n": int(labels.size), "n_positive": int(np.sum(labels))}
    if models.boosting is not None:
        report["gradient_boosting"] = binary_metrics(labels, predict_boosting(models.boosting, features))
    if models.cnn is not None:
        report["cnn"] = binary_metrics(labels, predict_cnn(models.cnn, images))
    return report


def combined_probability(models: FittedModels, images: np.ndarray, features: np.ndarray) -> np.ndarray:
    parts = []
    if models.boosting is not None:
        parts.append(predict_boosting(models.boosting, features))
    if models.cnn is not None:
        parts.append(predict_cnn(models.cnn, images))
    if not parts:
        raise InsufficientLabels("no fitted model")
    return np.mean(parts, axis=0)


def _fit_boosting(features, labels, seed):
    try:
        return fit_boosting(features, labels, seed), {"status": "fitted", "n": int(labels.size)}
    except InsufficientLabels as exc:
        return None, {"status": "skipped", "reason": str(exc)}


def _fit_network(images, labels, epochs, learning_rate, seed):
    try:
        return fit_cnn(images, labels, epochs, learning_rate, seed), {"status": "fitted", "n": int(labels.size)}
    except InsufficientLabels as exc:
        return None, {"status": "skipped", "reason": str(exc)}
