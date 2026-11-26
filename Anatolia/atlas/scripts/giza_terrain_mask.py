"""Flatten the three pyramid mounds in a surface grid.

Pure numpy. Positions are rows and columns of that grid, never geographic
coordinates. The procedural model is the pyramid; the surface model must not
keep a second one under it.
"""

import math
from dataclasses import dataclass
from itertools import combinations, permutations

import numpy as np

# Past the casing corner, so a 15 m cell and a small mis-registration still sit inside.
FOOTPRINT_MARGIN_M = 45.0
# A shoulder of the mound that the corner radius did not cover.
SHOULDER_ABOVE_M = 8.0
SHOULDER_REACH_M = 75.0
# Blend back to the measured ground so the edge is not a step.
FEATHER_M = 60.0
ANNULUS_M = 90.0
# Sum of the three centre-to-centre errors. A surface peak is not the geometric centre.
WORST_DISTANCE_ERROR_M = 220.0
# Metres of spacing error charged per metre a candidate sits below the tallest peak.
HEIGHT_WEIGHT = 4.0
# The three mounds are near the middle of the fetched window. Hills further out are not them.
SEARCH_RADIUS_M = 1600.0


@dataclass(frozen=True)
class PyramidPlan:
    """One pyramid in walk metres: east, south, and the casing base."""

    id: str
    east_m: float
    south_m: float
    base_m: float


@dataclass(frozen=True)
class PlacedFootprint:
    """Where that pyramid sits on the grid, and how wide a disk to clear."""

    plan: PyramidPlan
    row: float
    col: float
    radius_m: float
    base_m: float


def corner_radius_m(base_m: float) -> float:
    """Half the diagonal of the square base: the casing corner."""
    return base_m / math.sqrt(2.0) + FOOTPRINT_MARGIN_M


def separate_peaks(elevation: np.ndarray, cell_m: float, count: int, apart_m: float) -> list[tuple[int, int]]:
    """The tallest cells, each at least `apart_m` from the others."""
    work = np.where(np.isfinite(elevation), elevation, -np.inf)
    found: list[tuple[int, int]] = []
    blank = max(1, int(round(apart_m / cell_m)))
    height, width = work.shape
    for _ in range(count):
        row, col = _argmax2(work)
        if not np.isfinite(elevation[row, col]):
            break
        found.append((row, col))
        work[_slice(row, blank, height), _slice(col, blank, width)] = -np.inf
    return found


def match_pyramids(
    elevation: np.ndarray,
    cell_m: float,
    pyramids: tuple[PyramidPlan, ...] | list[PyramidPlan],
) -> list[tuple[int, int]]:
    """Peak of each pyramid, in the same order as `pyramids`.

    The three mounds are the trio of separated peaks whose spacing matches the
    published centre-to-centre distances. Height alone is not the test: a
    smaller mound nearby can outrank a smoothed one.
    """
    candidates = separate_peaks(_near_centre(elevation, cell_m), cell_m, count=6, apart_m=120.0)
    if len(candidates) < len(pyramids):
        raise RuntimeError("the surface has fewer peaks than pyramids")
    chosen = _best_trio(candidates, pyramids, cell_m, elevation)
    return [(int(peak[0]), int(peak[1])) for peak in chosen]


def flatten_footprints(
    elevation: np.ndarray,
    footprints: list[PlacedFootprint],
    cell_m: float,
) -> np.ndarray:
    """A copy with each mound replaced by the ground in a ring beside it."""
    original = np.asarray(elevation, dtype=np.float32)
    cleared = original.copy()
    for foot in footprints:
        distance_m = _distance_m(original.shape, foot.row, foot.col, cell_m)
        base = _ring_base(original, distance_m, footprints, foot, cell_m)
        _write_footprint(cleared, original, distance_m, foot.radius_m, base)
    return cleared


def footprint_base_m(elevation: np.ndarray, foot: PlacedFootprint, others: list[PlacedFootprint], cell_m: float) -> float:
    """The ground the mound is brought down to: the median of the ring beside it."""
    distance_m = _distance_m(elevation.shape, foot.row, foot.col, cell_m)
    return _ring_base(elevation, distance_m, others, foot, cell_m)


def _best_trio(
    candidates: list[tuple[int, int]],
    pyramids: list[PyramidPlan],
    cell_m: float,
    elevation: np.ndarray,
) -> list[tuple[int, int]]:
    target = _pair_distances([(plan.east_m, plan.south_m) for plan in pyramids])
    tallest = max(float(elevation[row, col]) for row, col in candidates)
    best_score = math.inf
    best_error = math.inf
    best: list[tuple[int, int]] | None = None
    for combo in combinations(candidates, len(pyramids)):
        shortest = min(float(elevation[row, col]) for row, col in combo)
        penalty = HEIGHT_WEIGHT * (tallest - shortest)
        for perm in permutations(combo):
            points = [((col + 0.5) * cell_m, (row + 0.5) * cell_m) for row, col in perm]
            error = sum(abs(left - right) for left, right in zip(_pair_distances(points), target, strict=True))
            if error + penalty < best_score:
                best_score = error + penalty
                best_error = error
                best = list(perm)
    if best is None or best_error > WORST_DISTANCE_ERROR_M:
        raise RuntimeError(f"pyramid peaks do not match the published spacing (error {best_error:.0f} m)")
    return best


def _near_centre(elevation: np.ndarray, cell_m: float) -> np.ndarray:
    """Keep the middle of the window. A high hill several kilometres off is not a pyramid."""
    masked = np.array(elevation, copy=True)
    rows = np.arange(masked.shape[0], dtype=np.float32)[:, None]
    cols = np.arange(masked.shape[1], dtype=np.float32)[None, :]
    distance_m = np.hypot(rows - masked.shape[0] / 2.0, cols - masked.shape[1] / 2.0) * cell_m
    masked[distance_m > SEARCH_RADIUS_M] = np.nanmin(elevation)
    return masked


def _pair_distances(points: list[tuple[float, float]]) -> list[float]:
    return [
        math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1])
        for i in range(len(points))
        for j in range(i + 1, len(points))
    ]


def _distance_m(shape: tuple[int, int], row: float, col: float, cell_m: float) -> np.ndarray:
    rows = np.arange(shape[0], dtype=np.float32)[:, None]
    cols = np.arange(shape[1], dtype=np.float32)[None, :]
    return np.hypot(rows - np.float32(row), cols - np.float32(col)) * np.float32(cell_m)


def _ring_base(
    elevation: np.ndarray,
    distance_m: np.ndarray,
    footprints: list[PlacedFootprint],
    foot: PlacedFootprint,
    cell_m: float,
) -> float:
    ring = (distance_m > foot.radius_m + 15.0) & (distance_m <= foot.radius_m + ANNULUS_M)
    ring &= _outside_others(elevation.shape, footprints, foot, cell_m)
    samples = elevation[ring & np.isfinite(elevation)]
    if samples.size < 8:
        raise RuntimeError(f"no ground ring beside {foot.plan.id}")
    return float(np.median(samples))


def _outside_others(shape: tuple[int, int], footprints: list[PlacedFootprint], foot: PlacedFootprint, cell_m: float) -> np.ndarray:
    clear = np.ones(shape, dtype=bool)
    for other in footprints:
        if other.plan.id == foot.plan.id:
            continue
        clear &= _distance_m(shape, other.row, other.col, cell_m) > other.radius_m
    return clear


def _write_footprint(cleared: np.ndarray, original: np.ndarray, distance_m: np.ndarray, radius_m: float, base: float) -> None:
    hard = distance_m <= radius_m
    shoulder = (distance_m <= radius_m + SHOULDER_REACH_M) & (original > base + SHOULDER_ABOVE_M)
    cleared[hard | shoulder] = np.float32(base)
    outer = radius_m + FEATHER_M
    feather = (distance_m > radius_m) & (distance_m <= outer) & ~shoulder
    weight = (distance_m[feather] - np.float32(radius_m)) / np.float32(FEATHER_M)
    cleared[feather] = np.float32(base) + (original[feather] - np.float32(base)) * weight


def _argmax2(values: np.ndarray) -> tuple[int, int]:
    index = int(np.argmax(values))
    return divmod(index, values.shape[1])


def _slice(centre: int, reach: int, limit: int) -> slice:
    return slice(max(0, centre - reach), min(limit, centre + reach + 1))
