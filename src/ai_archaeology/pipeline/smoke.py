"""End-to-end run on the registered small windows."""

from __future__ import annotations

import argparse
import json
import re
import time
import traceback
from pathlib import Path

from ai_archaeology.pipeline.prepare import PreparedRegion, prepare_region
from ai_archaeology.pipeline.report import rung_summaries, write_public_report
from ai_archaeology.train.config import RunConfig, load_run_config
from ai_archaeology.train.fit import fit_models, score_patches
from ai_archaeology.train.reviews import (
    default_review_db,
    ensure_schema,
    load_hard_negatives,
    record_eval_run,
    record_model_version,
)
from ai_archaeology.train.sample import collect_fold_patches, collect_training_patches, site_coordinates
from ai_archaeology.regions.load import load_registry
from ai_archaeology.transfer.recall import candidate_count, random_baseline_recall, recall_at_radii, top_density_indices
from ai_archaeology.transfer.scales import PHYSICS_NOTE, scale_rows
from ai_archaeology.transfer.score import score_lattice, stride_pixels, valid_area_km2
from ai_archaeology.ingest.schema import utc_now

_COORDINATE = re.compile(r"\d+\.\d{4,}")


def run_smoke(repo_root: Path, config_path: Path) -> dict:
    started = time.perf_counter()
    config = load_run_config(config_path)
    regions = load_registry(repo_root / "regions")
    work_dir = repo_root / config.work_dir
    review_db, review_note = _open_reviews(config)
    prepared, failures, prepare_seconds = _prepare_all(regions, repo_root, work_dir, config)
    training = _cross_validate(prepared, config, review_db)
    transfer = _transfer(prepared, config, review_db)
    payload = {
        "physics": PHYSICS_NOTE,
        "feature_classes_at_30m": scale_rows(regions, 30.0),
        "regions": [_region_row(item) for item in prepared],
        "prepare_failures": failures,
        "prepare_seconds": prepare_seconds,
        "review_store": review_note,
        "training_folds": training,
        "transfer": transfer,
        "runtime_seconds": round(time.perf_counter() - started, 2),
    }
    return write_public_report(repo_root / config.output_dir / "report.json", payload, repo_root)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Standardise the registered windows, train, and transfer.")
    parser.add_argument("--config", type=Path, default=Path("configs/cross_region.yaml"))
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    args = parser.parse_args(argv)
    report = run_smoke(args.repo_root.resolve(), args.config)
    print(f"runtime_seconds {report['runtime_seconds']}")
    print(f"regions {len(report['regions'])} failures {len(report['prepare_failures'])}")
    return 0


def _prepare_all(regions, repo_root, work_dir, config):
    prepared = []
    failures = []
    seconds = {}
    for region in regions:
        started = time.perf_counter()
        print(f"preparing {region.region_id}", flush=True)
        try:
            prepared.append(prepare_region(region, repo_root, work_dir, config))
        except Exception as exc:
            failures.append(
                {
                    "region_id": region.region_id,
                    "error": type(exc).__name__,
                    "message": _safe_message(exc),
                }
            )
            traceback.print_exc()
        seconds[region.region_id] = round(time.perf_counter() - started, 2)
    return prepared, failures, seconds


def _cross_validate(prepared: list[PreparedRegion], config: RunConfig, review_db: Path | None) -> list[dict]:
    rows = []
    for item in prepared:
        if item.region.role != "source":
            continue
        hard = _hard(review_db, item.region.region_id)
        for fold in range(item.region.validation.n_folds):
            rows.append(_one_fold(item, config, hard, fold))
    return rows


def _one_fold(item: PreparedRegion, config: RunConfig, hard, fold: int) -> dict:
    common = _patch_kwargs(item, config)
    training = collect_training_patches(**common, seed=config.seed + fold, held_out_fold=fold, hard_negatives=hard)
    evaluation = collect_fold_patches(**common, seed=config.seed, fold=fold)
    models, fit_note = fit_models(training, config.epochs, config.learning_rate, config.seed)
    return {
        "region_id": item.region.region_id,
        "fold": fold,
        "n_train": len(training),
        "n_train_positive": sum(patch.label == 1 for patch in training),
        "n_eval": len(evaluation),
        "fit": fit_note,
        "score": score_patches(models, evaluation),
    }


def _transfer(prepared: list[PreparedRegion], config: RunConfig, review_db: Path | None) -> dict:
    sources = [item for item in prepared if item.region.role == "source"]
    targets = [item for item in prepared if item.region.is_transfer_target]
    if not sources or not targets:
        return {"status": "skipped", "reason": "need a source region and a transfer target"}
    pooled = []
    for item in sources:
        pooled.extend(
            collect_training_patches(
                **_patch_kwargs(item, config),
                seed=config.seed,
                held_out_fold=None,
                hard_negatives=_hard(review_db, item.region.region_id),
            )
        )
    models, fit_note = fit_models(pooled, config.epochs, config.learning_rate, config.seed)
    _record_models(review_db, fit_note, config)
    return {
        "fit": fit_note,
        "n_train": len(pooled),
        "n_train_positive": sum(patch.label == 1 for patch in pooled),
        "targets": [_one_target(target, models, config, review_db) for target in targets],
    }


def _one_target(item: PreparedRegion, models, config: RunConfig, review_db: Path | None) -> dict:
    stride = stride_pixels(item.rung.resolution_m)
    scores, coordinates = score_lattice(
        item.stack, item.elevation, item.transform, config.patch_size, stride, models
    )
    area_km2 = valid_area_km2(item.elevation, item.rung.resolution_m)
    count = candidate_count(area_km2, config.candidate_density_per_km2)
    site_xy = site_coordinates(item.sites, item.crs)
    fitted = models.boosting is not None or models.cnn is not None
    chosen = coordinates[top_density_indices(scores, count)] if fitted and scores.size else coordinates[:0]
    model_recall = (
        recall_at_radii(chosen, site_xy, config.recall_radii_m) if fitted and chosen.size else None
    )
    baseline = random_baseline_recall(
        coordinates, site_xy, count, config.recall_radii_m, config.random_draws, config.seed
    )
    summary = {
        "region_id": item.region.region_id,
        "resolution_m": item.rung.resolution_m,
        "area_km2": round(area_km2, 3),
        "candidate_density_per_km2": config.candidate_density_per_km2,
        "n_candidates": int(min(count, coordinates.shape[0] if coordinates.size else 0)),
        "n_published_sites": len(item.sites),
        "sites_by_class": item.class_counts,
        "model_recall": model_recall,
        "random_baseline": baseline,
    }
    if review_db is not None:
        record_eval_run(
            review_db,
            f"transfer-{item.region.region_id}",
            "pooled-source",
            item.region.region_id,
            "fixed_density_recall",
            json.dumps(summary),
            utc_now(),
        )
    return summary


def _patch_kwargs(item: PreparedRegion, config: RunConfig) -> dict:
    return {
        "stack": item.stack,
        "elevation": item.elevation,
        "transform": item.transform,
        "crs": item.crs,
        "sites": item.sites,
        "grid": item.grid,
        "patch_size": config.patch_size,
        "negatives_per_positive": config.negatives_per_positive,
        "buffer_m": config.negative_buffer_m,
    }


def _region_row(item: PreparedRegion) -> dict:
    return {
        "region_id": item.region.region_id,
        "role": item.region.role,
        "class_counts": item.class_counts,
        "train_resolution_m": item.rung.resolution_m,
        "crs": item.crs,
        "rungs": rung_summaries(item),
    }


def _hard(review_db: Path | None, region_id: str):
    if review_db is None:
        return []
    return load_hard_negatives(review_db, region_id)


def _open_reviews(config: RunConfig):
    path = Path(config.review_db) if config.review_db else default_review_db()
    try:
        ensure_schema(path)
    except OSError as exc:
        return None, f"unavailable: {type(exc).__name__}"
    return path, "schema ready outside the repository"


def _record_models(review_db: Path | None, fit_note: dict, config: RunConfig) -> None:
    if review_db is None:
        return
    record_model_version(
        review_db,
        "pooled-source",
        "cnn+gradient_boosting",
        "source-regions",
        config.train_resolution_m,
        json.dumps(fit_note),
        utc_now(),
    )


def _safe_message(exc: BaseException) -> str:
    text = str(exc).splitlines()[0][:300]
    if _COORDINATE.search(text):
        return type(exc).__name__
    return text


if __name__ == "__main__":
    raise SystemExit(main())
