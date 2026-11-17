"""The two presence-versus-background models and the effort-only null they must beat."""

from __future__ import annotations

import numpy as np
from scipy import ndimage
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from ai_archaeology.suitability.grid import latitude_grid
from ai_archaeology.train.boosting import fit_boosting, predict_boosting

EFFORT_SMOOTHING_CELLS = 2.0


def with_squares(features: np.ndarray) -> np.ndarray:
    return np.hstack([features, features**2])


def fit_logistic(features: np.ndarray, labels: np.ndarray, seed: int = 0):
    """Logistic regression on standardised linear and quadratic terms."""
    model = make_pipeline(
        StandardScaler(),
        FunctionTransformer(with_squares),
        LogisticRegression(max_iter=2000, class_weight="balanced", random_state=seed),
    )
    return model.fit(features, labels.astype(int))


def predict_logistic(model, features: np.ndarray) -> np.ndarray:
    return model.predict_proba(features)[:, 1]


# name -> (fit(features, labels, seed), predict(model, features))
MODELS = {
    "logistic": (fit_logistic, predict_logistic),
    "boosting": (fit_boosting, predict_boosting),
}


def effort_stack(site_counts: np.ndarray) -> np.ndarray:
    """Covariates of the effort-only null: smoothed density of all published sites, and |latitude|.

    The density includes the held-out cells themselves, which favours the null. That is the
    safe direction: a layer that still beats it has earned the claim.
    """
    density = ndimage.gaussian_filter(
        np.log1p(site_counts.astype(np.float32)), EFFORT_SMOOTHING_CELLS, mode=("nearest", "wrap")
    )
    return np.stack([density, np.abs(latitude_grid())]).astype(np.float32)
