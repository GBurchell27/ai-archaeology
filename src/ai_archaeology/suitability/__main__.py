"""Build the coarse suitability layers from published site records and the covariate grids."""

from __future__ import annotations

import argparse
from pathlib import Path

from ai_archaeology.suitability.background import target_group_background
from ai_archaeology.suitability.covariates import build_stack, load_grids
from ai_archaeology.suitability.export import decile_raster, layer_entry, write_decile_png, write_index
from ai_archaeology.suitability.labels import CLASS_NAMES, PERIOD_NAMES, presence_raster, read_label_sites, site_count_raster
from ai_archaeology.suitability.layer import InsufficientCells, LayerResult, evaluate_layer
from ai_archaeology.suitability.model import effort_stack


def no_skill_reason(result: LayerResult) -> str | None:
    """A layer with no held-out skill at all is dropped, not published with an apology."""
    if result.metrics["auc"] <= 0.5 or result.metrics["boyce"] <= 0:
        return f"no held-out skill (AUC {result.metrics['auc']:.2f}, Boyce {result.metrics['boyce']:.2f})"
    return None


def metrics_report(result: LayerResult) -> str:
    """Pooled held-out value and the fold range of every metric, for the run log."""
    lines = [f"  presences {result.presences}  model {result.model_name}  regions {result.region_auc}"]
    for name, pooled in result.metrics.items():
        folds = [fold[name] for fold in result.fold_metrics]
        lines.append(f"  {name}: {pooled:.3f} (folds {min(folds):.3f} to {max(folds):.3f})")
    return chr(10).join(lines)


def build_layers(sites, grids, out: Path) -> tuple[list[dict], list[dict]]:
    site_counts = site_count_raster(sites)
    background, effort = target_group_background(site_counts), effort_stack(site_counts)
    layers, skipped = [], []
    for period in PERIOD_NAMES:
        stack, land = build_stack(grids, period)
        for site_class in CLASS_NAMES:
            layer_id = f"{site_class}_{period}"
            try:
                result = evaluate_layer(presence_raster(sites, site_class, period), background, stack, land, effort)
            except InsufficientCells as too_few:
                skipped.append({"id": layer_id, "reason": f"too few cells: {too_few}"})
                print(layer_id, skipped[-1]["reason"], flush=True)
                continue
            reason = no_skill_reason(result)
            if reason:
                skipped.append({"id": layer_id, "reason": reason})
            else:
                write_decile_png(out / f"{layer_id}.png", decile_raster(result))
                layers.append(layer_entry(site_class, period, result))
            print(layer_id, reason or "shipped", metrics_report(result), sep=chr(10), flush=True)
    return layers, skipped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("data/world/sources"))
    parser.add_argument("--covariates", type=Path, default=Path("data/world/covariates"))
    parser.add_argument("--out", type=Path, default=Path("Anatolia/atlas/public/predict"))
    arguments = parser.parse_args(argv)
    sites = read_label_sites(arguments.sources)
    if not sites:
        parser.error(f"no label records under {arguments.sources}")
    layers, skipped = build_layers(sites, load_grids(arguments.covariates), arguments.out)
    write_index(arguments.out / "index.json", layers, skipped)
    print(f"{len(layers)} layers written, {len(skipped)} skipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
