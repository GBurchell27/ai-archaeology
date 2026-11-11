"""Precision and recall for a binary patch classifier."""

from __future__ import annotations

import numpy as np


def binary_metrics(labels: np.ndarray, probabilities: np.ndarray, threshold: float = 0.5) -> dict:
    predicted = probabilities >= threshold
    truth = labels.astype(bool)
    true_positive = int(np.sum(predicted & truth))
    false_positive = int(np.sum(predicted & ~truth))
    false_negative = int(np.sum(~predicted & truth))
    precision = _ratio(true_positive, true_positive + false_positive)
    recall = _ratio(true_positive, true_positive + false_negative)
    f1 = 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "n": int(labels.size),
        "n_positive": int(np.sum(truth)),
    }


def _ratio(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator
