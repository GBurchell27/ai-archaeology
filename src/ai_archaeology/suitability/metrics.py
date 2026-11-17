"""Presence-only skill scores, all computed on held-out cells."""

from __future__ import annotations

import numpy as np
from scipy.stats import spearmanr
from sklearn.metrics import roc_auc_score


def presence_auc(scores: np.ndarray, labels: np.ndarray) -> float:
    """AUC of presence cells against the other documented (target-group) cells."""
    return float(roc_auc_score(labels.astype(int), scores))


def continuous_boyce(presence_scores: np.ndarray, available_scores: np.ndarray, n_windows: int = 101) -> float:
    """Continuous Boyce index (Hirzel et al. 2006).

    Slides a window a tenth of the score range wide and asks whether the presence share over
    the available share rises with the score. +1 is ideal, 0 is random, negative is wrong.
    """
    low, high = float(available_scores.min()), float(available_scores.max())
    width = (high - low) / 10.0
    if width <= 0:
        return 0.0
    starts, ratios = [], []
    for start in np.linspace(low, high - width, n_windows):
        available = np.mean((available_scores >= start) & (available_scores <= start + width))
        if available > 0:
            present = np.mean((presence_scores >= start) & (presence_scores <= start + width))
            starts.append(start)
            ratios.append(present / available)
    correlation = spearmanr(starts, ratios).statistic
    return float(correlation) if np.isfinite(correlation) else 0.0


def capture_at_top_area(
    scores: np.ndarray, labels: np.ndarray, area: np.ndarray, top_fraction: float
) -> tuple[int, int]:
    """How many presence cells fall in the highest-scoring ``top_fraction`` of the area."""
    order = np.argsort(-scores, kind="stable")
    in_top = np.cumsum(area[order]) / area.sum() <= top_fraction
    return int(labels[order][in_top].sum()), int(labels.sum())


def kvamme_gain(captured: int, total: int, top_fraction: float) -> float:
    """1 - area share / presence share. 0 is random; NaN when nothing was captured."""
    return 1.0 - top_fraction * total / captured if captured else float("nan")

