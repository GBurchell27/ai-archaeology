"""Relief pictures of published tells. No other locations are marked."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from ai_archaeology.eval.tell import PeakTable, TellWeights, _features, context_rasters, hand_scores
from ai_archaeology.eval.detect import _elongation, prepare_surface
from ai_archaeology.relief import hillshade

FIGURES = (
    ("catalhoyuk", "Çatalhöyük"),
    ("arslantepe", "Arslantepe"),
    ("karahan-tepe", "Karahan Tepe"),
)


def write_tell_figures(catalog, prepared, recovered: dict[str, bool], out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    by_id = {site.id: site for site in catalog}
    written = []
    for site_id, title in FIGURES:
        site = by_id[site_id]
        region = prepared[site.region]
        path = out_dir / f"{site_id}.png"
        _one(region.dem, region.grid, site, title, recovered.get(site_id, False), path)
        written.append(path)
        print(f"figure {path}", flush=True)
    return written


def _one(dem, grid, site, title, recovered, path: Path) -> None:
    row, column = _cell(grid, site.longitude, site.latitude)
    half_m = 2500.0
    margin_m = 2800.0
    span = int(round((half_m + margin_m) / grid.pixel_m))
    row0, row1 = max(0, row - span), min(dem.shape[0], row + span)
    col0, col1 = max(0, column - span), min(dem.shape[1], column + span)
    crop = dem[row0:row1, col0:col1]
    shade = hillshade(crop, grid.pixel_m)
    score = _score_grid(crop, grid.pixel_m)
    view = int(round(half_m / grid.pixel_m))
    center_r, center_c = row - row0, column - col0
    sl = (
        slice(max(0, center_r - view), min(shade.shape[0], center_r + view)),
        slice(max(0, center_c - view), min(shade.shape[1], center_c + view)),
    )
    shade = shade[sl]
    score = score[sl]
    fig, axes = plt.subplots(1, 2, figsize=(9.2, 4.6), dpi=120)
    axes[0].imshow(shade, cmap="gray", vmin=0, vmax=1)
    axes[0].set_title("Hillshade")
    axes[1].imshow(shade, cmap="gray", vmin=0, vmax=1)
    overlay = np.ma.masked_where(score <= 0, score)
    axes[1].imshow(overlay, cmap="YlOrBr", alpha=0.72, vmin=0, vmax=max(float(np.nanmax(score)), 0.05))
    axes[1].set_title("Tell score")
    for axis in axes:
        axis.scatter([shade.shape[1] / 2], [shade.shape[0] / 2], s=36, c="white", marker="o", linewidths=0.6, edgecolors="black")
        axis.set_xticks([])
        axis.set_yticks([])
    state = "recovered within 250 m in the blind fold" if recovered else "not recovered within 250 m in the blind fold"
    fig.suptitle(f"{title}, published tell — {state}", fontsize=11)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def _score_grid(crop: np.ndarray, pixel_m: float) -> np.ndarray:
    shared = context_rasters(crop, pixel_m)
    surface = prepare_surface(crop, pixel_m, 1000.0)
    surface.update(shared)
    weights = TellWeights(1000.0, 3.0, 1.0, 1.0, 1.0)
    step = max(1, int(round(150.0 / pixel_m)))
    cells = [(row, column) for row in range(step, crop.shape[0] - step, step) for column in range(step, crop.shape[1] - step, step)]
    rows = []
    for row, column in cells:
        elongation = _elongation(surface["relief"], row, column)
        rows.append(_features(surface, row, column, pixel_m, max(elongation, 1.0)))
    score = np.zeros(crop.shape, dtype=np.float32)
    if not rows:
        return score
    table = PeakTable(np.zeros(len(rows)), np.zeros(len(rows)), np.asarray(rows, dtype=np.float32))
    values = hand_scores(table, weights)
    for (row, column), value in zip(cells, values, strict=True):
        score[row:row + step, column:column + step] = max(float(value), 0.0)
    return score


def _cell(grid, longitude: float, latitude: float) -> tuple[int, int]:
    height, width = grid.dem.shape
    column = int(round((longitude - grid.west) / (grid.east - grid.west) * width - 0.5))
    row = int(round((grid.north - latitude) / (grid.north - grid.south) * height - 0.5))
    return row, column
