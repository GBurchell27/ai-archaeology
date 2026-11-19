"""Export where a splat's training photographs were taken, in walk metres, for the walk view.

No network. Reads the COLMAP `images.bin` of the model the splat was trained on and the site's alignment in
`Anatolia/atlas/lib/walk/walkSites.ts`, and writes a small TypeScript table. The positions are metres from the
walker's start in the walk's own frame, not geographic coordinates.

    python scripts/splat/export_viewpoints.py gobekli-tepe data/splat/gobekli-tepe/modern_hd/sparse/0/images.bin \
        Anatolia/atlas/lib/walk/gobekliTepeViewpoints.ts
    python scripts/splat/export_viewpoints.py --self-check

Cameras closer than 1.5 m that look within 30 degrees of each other collapse to one viewpoint. The list is ordered
as a walk from the start, each viewpoint the nearest one not yet visited.
"""

from __future__ import annotations

import re
import struct
import sys
from pathlib import Path

import numpy as np

REPOSITORY = Path(__file__).resolve().parents[2]
WALK_SITES = REPOSITORY / "Anatolia" / "atlas" / "lib" / "walk" / "walkSites.ts"
# drei's splat loader turns y-down capture data upright before the alignment is applied.
LOADER_FLIP = np.diag([1.0, -1.0, -1.0])
SAME_PLACE_M = 1.5
SAME_HEADING_COS = np.cos(np.radians(30))
LOOK_AHEAD_M = 10.0
NUMBERS = r"\[([^\]]+)\]"


def read_camera_poses(images_bin: Path) -> list[tuple[np.ndarray, np.ndarray]]:
    """(centre, forward) of every registered photograph, in the COLMAP model's own frame."""
    raw = images_bin.read_bytes()
    (count,) = struct.unpack_from("<Q", raw, 0)
    offset, poses = 8, []
    for _ in range(count):
        qw, qx, qy, qz, tx, ty, tz = struct.unpack_from("<7d", raw, offset + 4)
        offset = raw.index(b"\0", offset + 64) + 1  # past the id, pose, camera id and file name
        (point_count,) = struct.unpack_from("<Q", raw, offset)
        offset += 8 + 24 * point_count
        rotation = np.array([
            [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qw * qz), 2 * (qx * qz + qw * qy)],
            [2 * (qx * qy + qw * qz), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qw * qx)],
            [2 * (qx * qz - qw * qy), 2 * (qy * qz + qw * qx), 1 - 2 * (qx * qx + qy * qy)],
        ])
        poses.append((-rotation.T @ np.array([tx, ty, tz]), rotation[2]))
    if offset != len(raw):
        raise ValueError(f"{images_bin} is not a COLMAP images.bin this reader understands")
    return poses


def read_alignment(site_id: str, walk_sites_source: str) -> tuple[np.ndarray, np.ndarray, float]:
    """The site's position, rotation matrix (Euler XYZ, as three.js applies it) and scale from walkSites.ts."""
    found = re.search(rf'walkSite\("{re.escape(site_id)}".*?position: {NUMBERS}, rotation: {NUMBERS}, scale: ([\d.]+)', walk_sites_source)
    if not found:
        raise ValueError(f"no alignment for {site_id} in walkSites.ts")
    position, (x, y, z) = (np.array([float(v) for v in group.split(",")]) for group in found.groups()[:2])
    about_x = np.array([[1, 0, 0], [0, np.cos(x), -np.sin(x)], [0, np.sin(x), np.cos(x)]])
    about_y = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    about_z = np.array([[np.cos(z), -np.sin(z), 0], [np.sin(z), np.cos(z), 0], [0, 0, 1]])
    return position, about_x @ about_y @ about_z, float(found.group(3))


def thinned(poses: list[tuple[np.ndarray, np.ndarray]]) -> list[tuple[np.ndarray, np.ndarray]]:
    """Drops a camera that stands beside one already kept and looks nearly the same way."""
    kept: list[tuple[np.ndarray, np.ndarray]] = []
    for centre, forward in poses:
        if not any(np.linalg.norm(centre - other) < SAME_PLACE_M and forward @ ahead > SAME_HEADING_COS for other, ahead in kept):
            kept.append((centre, forward))
    return kept


def as_a_walk(poses: list[tuple[np.ndarray, np.ndarray]]) -> list[tuple[np.ndarray, np.ndarray]]:
    """From the camera nearest the walker's start, each time to the nearest camera not yet visited."""
    waiting, here, walk = list(poses), np.zeros(3), []
    while waiting:
        nearest = min(range(len(waiting)), key=lambda index: np.linalg.norm(waiting[index][0] - here))
        walk.append(waiting.pop(nearest))
        here = walk[-1][0]
    return walk


def walk_viewpoints(poses, position: np.ndarray, rotation: np.ndarray, scale: float):
    """Camera poses of the COLMAP model as (centre, forward) in walk metres, thinned and ordered."""
    to_walk = rotation @ LOADER_FLIP
    in_walk = [(position + scale * to_walk @ centre, to_walk @ forward) for centre, forward in poses]
    return as_a_walk(thinned(sorted(in_walk, key=lambda pose: tuple(pose[0]))))


def typescript(site_id: str, viewpoints, camera_count: int) -> str:
    def triple(values: np.ndarray) -> str:
        return "[" + ", ".join(f"{value + 0.0:.2f}" for value in np.round(values, 2)) + "]"

    rows = [f"  {{ positionM: {triple(centre)}, lookAtM: {triple(centre + LOOK_AHEAD_M * forward)} }}," for centre, forward in viewpoints]
    name = site_id.upper().replace("-", "_") + "_VIEWPOINTS"
    return "\n".join([
        "/**",
        f" * Where the {camera_count} photographs that trained this site's splat were taken, thinned to {len(viewpoints)} viewpoints.",
        " * Walk metres from the walker's start, after the splat alignment: camera positions, not finds and not map coordinates.",
        " * Written by scripts/splat/export_viewpoints.py. Do not edit by hand: run it again after a retrain or a new alignment.",
        " */",
        "",
        'import type { PhotoViewpoint } from "./photoViewpoints";',
        "",
        f"export const {name}: readonly PhotoViewpoint[] = [",
        *rows,
        "];",
        "",
    ])


def self_check() -> None:
    def image(centre: list[float]) -> bytes:  # identity rotation, so t = -centre
        return struct.pack("<I7dI", 1, 1, 0, 0, 0, *[-v for v in centre], 1) + b"a.jpg\0" + struct.pack("<Q2dQ", 1, 0, 0, 7)

    scratch = Path(__file__).with_name("_self_check_images.bin")
    scratch.write_bytes(struct.pack("<Q", 3) + image([0, 0, 0]) + image([0.1, 0, 0]) + image([4, 0, 0]))
    try:
        poses = read_camera_poses(scratch)
    finally:
        scratch.unlink()
    assert len(poses) == 3 and np.allclose(poses[2][0], [4, 0, 0]) and np.allclose(poses[0][1], [0, 0, 1])
    position, rotation, scale = read_alignment("x", 'walkSite("x", "X", 9, { position: [1, 2, 3], rotation: [0, 0, 0], scale: 2 })')
    viewpoints = walk_viewpoints(poses, position, rotation, scale)
    # Two of the three share a place and a heading; a COLMAP camera looks along +z, which the loader turns to -z.
    assert len(viewpoints) == 2 and np.allclose(viewpoints[0][0], [1, 2, 3]) and np.allclose(viewpoints[1][0], [9, 2, 3])
    assert np.allclose(viewpoints[0][1], [0, 0, -1])
    assert "positionM: [9.00, 2.00, 3.00], lookAtM: [9.00, 2.00, -7.00]" in typescript("x", viewpoints, 3)
    print("ok")


def main(arguments: list[str]) -> None:
    if arguments == ["--self-check"]:
        return self_check()
    if len(arguments) != 3:
        sys.exit(__doc__)
    site_id, images_bin, output = arguments
    poses = read_camera_poses(Path(images_bin))
    viewpoints = walk_viewpoints(poses, *read_alignment(site_id, WALK_SITES.read_text(encoding="utf-8")))
    Path(output).write_text(typescript(site_id, viewpoints, len(poses)), encoding="utf-8", newline="\n")
    print(f"{len(poses)} cameras, {len(viewpoints)} viewpoints -> {output}")


if __name__ == "__main__":
    main(sys.argv[1:])
