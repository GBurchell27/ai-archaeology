"""The caveat text shown with every layer. The numbers decide what it says."""

from __future__ import annotations

from ai_archaeology.eval.metrics import wilson_interval
from ai_archaeology.suitability.layer import LayerResult

STANDING_CAVEATS = (
    "Shows where published sites of this kind tend to be recorded, relative to other cells that "
    "hold any published site. It is not a map of undiscovered sites and it cannot find one.",
    "The published record follows where people have surveyed and what got catalogued. Comparing "
    "only against documented cells reduces that bias. It does not remove it.",
    "Cells are 0.25 degrees, about 28 km at the equator. Far too coarse to point at a place.",
    "Rivers are present-day drainage lines ranked by upstream area (HydroSHEDS), so they include "
    "dry desert channels. Coasts are present-day (ETOPO 2022). Climate is a model reconstruction "
    "(CHELSA-TraCE21k), not a measurement. None of it sees buried or drowned landscapes.",
    "Grey cells are 'no basis': at least one covariate lies outside the range of the documented "
    "cells the model learned from.",
    "Labels come from Wikidata and Pleiades. OpenStreetMap sites are left out.",
)
UNDATED_CAVEAT = "Only sites with a published date range count for this period. Most sites are undated."


def effort_caveat(result: LayerResult) -> str:
    auc, null_auc = result.metrics["auc"], result.metrics["effortNullAuc"]
    if auc > null_auc:
        verdict = "Terrain and climate add something beyond survey effort, on held-out 5 degree blocks."
    else:
        verdict = (
            "This layer does NOT beat the effort-only null: it tells you no more than "
            "'where sites of any kind are densely recorded'."
        )
    return f"Held-out AUC {auc:.2f} against {null_auc:.2f} for a null that only knows survey effort. {verdict}"


def capture_caveat(result: LayerResult) -> str:
    captured, total = result.captures["10"]
    low, high = wilson_interval(captured, total)
    return (
        f"The top-scoring 10% of documented area holds {captured / total:.0%} of held-out presence "
        f"cells (95% interval {low:.0%} to {high:.0%}); chance would be 10%."
    )


def transfer_caveat(result: LayerResult) -> str | None:
    if len(result.region_auc) < 2:
        return None
    worst = min(result.region_auc, key=result.region_auc.get)
    best = max(result.region_auc, key=result.region_auc.get)
    return (
        f"Fitted without a whole macro-region and tested on it, AUC runs from "
        f"{result.region_auc[worst]:.2f} ({worst}) to {result.region_auc[best]:.2f} ({best}). "
        "Near 0.5 means the pattern does not transfer there."
    )


def layer_caveats(result: LayerResult, period: str) -> list[str]:
    dynamic = [effort_caveat(result), capture_caveat(result), transfer_caveat(result)]
    if period != "all":
        dynamic.append(UNDATED_CAVEAT)
    return [text for text in dynamic if text] + list(STANDING_CAVEATS)
