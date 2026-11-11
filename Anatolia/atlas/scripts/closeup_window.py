"""On-demand 10 km close-up. Writes under the directory the server passes, never into git.

Relief is Copernicus GLO-30. The colour image is Sentinel-2 cloudless 2020
from EOX (CC BY-NC-SA 4.0 for non-commercial use).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_atlas_terrain as terrain  # noqa: E402
import closeup_store  # noqa: E402

FILES = ("meta.json", "hillshade.jpg", "satellite.jpg", "height.u16")


def _complete(out_dir: Path) -> bool:
    return all(closeup_store.regular_file(out_dir / name) for name in FILES)


def write_closeup(longitude: float, latitude: float, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    closeup_store.assert_real_directory(out_dir)
    meta_path = out_dir / "meta.json"
    if _complete(out_dir):
        return json.loads(meta_path.read_text())
    window = terrain.read_site_window(longitude, latitude)
    if window is None:
        raise RuntimeError("no Copernicus window for this place")
    array, left, bottom, right, top = window
    elevation_box: dict = {}

    def write_height(path: Path) -> None:
        elevation_box.update(terrain.write_height(path, array))

    closeup_store.atomic_produce(out_dir / "height.u16", write_height)
    pixel = (right - left) / array.shape[1]
    shade = terrain.hillshade(array, (abs((top - bottom) / array.shape[0]), pixel), azimuth=315, altitude=45)
    image = terrain.Image.fromarray(terrain.gray(shade), "RGB")

    def write_shade(path: Path) -> None:
        image.save(path, quality=82, optimize=True)

    closeup_store.atomic_produce(out_dir / "hillshade.jpg", write_shade)

    def write_satellite(path: Path) -> None:
        terrain.satellite(left, bottom, right, top, array.shape[1], array.shape[0], path, zoom=12)

    closeup_store.atomic_produce(out_dir / "satellite.jpg", write_satellite)
    meta = {
        "bounds": [left, bottom, right, top],
        "width": int(array.shape[1]),
        "height": int(array.shape[0]),
        "pixelSizeM": pixel,
        "elevation": elevation_box,
        "attribution": {
            "relief": terrain.DEM_CREDIT,
            "satellite": terrain.SAT_CREDIT,
        },
    }
    payload = (json.dumps(meta) + "\n").encode()

    def write_meta(path: Path) -> None:
        path.write_bytes(payload)

    closeup_store.atomic_produce(meta_path, write_meta)
    return meta


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if not (25.5 <= args.lon <= 45 and 35.8 <= args.lat <= 42.2):
        raise SystemExit("outside the Turkey window")
    write_closeup(args.lon, args.lat, args.out)


if __name__ == "__main__":
    main()
