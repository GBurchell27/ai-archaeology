"""On-demand 10 km close-up. Writes under /tmp, never into git.

Relief is Copernicus GLO-30. The colour image is Sentinel-2 cloudless 2020
from EOX (CC BY 4.0).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_atlas_terrain as terrain  # noqa: E402


def write_closeup(longitude: float, latitude: float, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta_path = out_dir / "meta.json"
    if meta_path.exists() and (out_dir / "hillshade.jpg").exists() and (out_dir / "satellite.jpg").exists() and (out_dir / "height.u16").exists():
        return json.loads(meta_path.read_text())
    window = terrain.read_site_window(longitude, latitude)
    if window is None:
        raise RuntimeError("no Copernicus window for this place")
    array, left, bottom, right, top = window
    elevation = terrain.write_height(out_dir / "height.u16", array)
    pixel = (right - left) / array.shape[1]
    shade = terrain.hillshade(array, (abs((top - bottom) / array.shape[0]), pixel), azimuth=315, altitude=45)
    terrain.Image.fromarray(terrain.gray(shade), "RGB").save(out_dir / "hillshade.jpg", quality=82, optimize=True)
    terrain.satellite(left, bottom, right, top, array.shape[1], array.shape[0], out_dir / "satellite.jpg", zoom=12)
    meta = {
        "bounds": [left, bottom, right, top],
        "width": int(array.shape[1]),
        "height": int(array.shape[0]),
        "pixelSizeM": pixel,
        "elevation": elevation,
        "attribution": {
            "relief": terrain.DEM_CREDIT,
            "satellite": terrain.SAT_CREDIT,
        },
    }
    meta_path.write_text(json.dumps(meta) + "\n")
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
