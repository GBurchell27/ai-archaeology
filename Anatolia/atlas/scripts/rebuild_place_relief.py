"""Replace place-relief tiles with GEM-15, and keep Copernicus as a fallback.

Run from the repository root:

    .venv/bin/python Anatolia/atlas/scripts/rebuild_place_relief.py

The first run copies the existing Copernicus height and terrain JPEGs into
``copernicus/`` under each place. Later runs leave that copy alone. Raw
GeoTIFFs are not written. Hillshade and other derivatives are 15 m. The
height mesh is 15 m when that stays within 480 cells on the long side, and
30 m otherwise, so the committed grids stay small.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import place_relief  # noqa: E402
import terrain_preview  # noqa: E402
from terrain_credits import GEM15_FOOTER  # noqa: E402

TERRAIN = REPO / "Anatolia" / "atlas" / "public" / "terrain"
FINE_M = 15.0
COARSE_M = 30.0
HEIGHT_CAP_PX = 480
TERRAIN_KEYS = (
    "hillshade",
    "hypsometric",
    "slope",
    "local-relief",
    "multidirectional-hillshade",
    "sky-view-factor",
)


def main() -> None:
    only = set(sys.argv[1:])
    metadata = json.loads((TERRAIN / "metadata.json").read_text())
    for site_id, detail in metadata["details"].items():
        if only and site_id not in only:
            continue
        print(f"relief {site_id}", flush=True)
        refresh_site(site_id, detail)
    metadata["attribution"]["gem15"] = GEM15_FOOTER
    metadata["honestNote"] = honest_note(metadata["pixelSizeM"])
    (TERRAIN / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    total = sum(path.stat().st_size for path in TERRAIN.rglob("*") if path.is_file())
    print(f"terrain {total / 1_048_576:.1f} MB", flush=True)


def refresh_site(site_id: str, detail: dict) -> None:
    site_dir = TERRAIN / "details" / site_id
    fallback = ensure_fallback(site_id, detail, site_dir)
    bounds = tuple(detail["bounds"])
    fine, fine_transform, note = place_relief.continuous_surface(*bounds, FINE_M)
    height_m = mesh_pixel_m(bounds)
    mesh = fine if height_m == FINE_M else place_relief.resample_grid(
        fine, fine_transform, *_mesh_size(bounds, height_m), bounds,
    )
    elevation = write_height(site_dir / "height.u16", mesh)
    terrain_preview.write_hillshade(site_dir / "hillshade.jpg", fine, _pixel(fine_transform))
    keys = set(detail["rasters"]) & set(TERRAIN_KEYS)
    if "hypsometric" in keys:
        terrain_preview.write_hypsometric(site_dir / "hypsometric.jpg", fine)
    terrain_preview.write_derivatives(
        lambda key: site_dir / f"{key}.jpg",
        fine,
        _pixel(fine_transform),
        keys - {"hillshade", "hypsometric"},
    )
    _store_gem(detail, site_id, mesh, elevation, height_m, note, fallback)


def ensure_fallback(site_id: str, detail: dict, site_dir: Path) -> dict:
    record_path = site_dir / "copernicus" / "source.json"
    if record_path.exists():
        return json.loads(record_path.read_text())
    backup = site_dir / "copernicus"
    backup.mkdir(parents=True, exist_ok=True)
    rasters = _copy_rasters(detail, backup, site_id)
    height = site_dir / "height.u16"
    if height.exists():
        shutil.copy2(height, backup / "height.u16")
    record = {
        "bounds": detail["bounds"],
        "width": detail["width"],
        "height": detail["height"],
        "pixelSizeM": detail["pixelSizeM"],
        "elevation": detail["elevation"],
        "heightFile": f"details/{site_id}/copernicus/height.u16",
        "rasters": rasters,
    }
    record_path.write_text(json.dumps(record, indent=2) + "\n")
    return record


def _copy_rasters(detail: dict, backup: Path, site_id: str) -> dict:
    copied = {}
    for key in TERRAIN_KEYS:
        relative = detail["rasters"].get(key)
        if not relative:
            continue
        source = TERRAIN / relative
        if not source.is_file():
            continue
        shutil.copy2(source, backup / source.name)
        copied[key] = f"details/{site_id}/copernicus/{source.name}"
    return copied


def _store_gem(detail: dict, site_id: str, mesh, elevation: dict, height_m: float, note: dict, fallback: dict) -> None:
    detail["width"] = int(mesh.shape[1])
    detail["height"] = int(mesh.shape[0])
    detail["pixelSizeM"] = (detail["bounds"][2] - detail["bounds"][0]) / detail["width"]
    detail["elevation"] = elevation
    detail["heightFile"] = f"details/{site_id}/height.u16"
    detail["terrain"] = {
        "default": "gem15",
        "gem15": {
            "pixelSizeM": detail["pixelSizeM"],
            "meshPixelM": height_m,
            "reliefPixelM": FINE_M,
            "elevation": elevation,
            "heightFile": detail["heightFile"],
            "voidFraction": note.get("voidFraction"),
            "datumOffsetM": note.get("datumOffsetM"),
            "source": note.get("source"),
        },
        "copernicus": fallback,
    }


def mesh_pixel_m(bounds: tuple) -> float:
    span = max(bounds[2] - bounds[0], bounds[3] - bounds[1])
    if span / FINE_M <= HEIGHT_CAP_PX:
        return FINE_M
    return COARSE_M


def _mesh_size(bounds: tuple, pixel_m: float) -> tuple[int, int]:
    width = max(2, int(round((bounds[2] - bounds[0]) / pixel_m)))
    height = max(2, int(round((bounds[3] - bounds[1]) / pixel_m)))
    return width, height


def _pixel(grid_transform) -> float:
    return abs(float(grid_transform.a))


def write_height(path: Path, grid) -> dict[str, float]:
    import numpy as np

    lowest = float(np.min(grid))
    highest = float(np.max(grid))
    span = max(highest - lowest, 1.0)
    scaled = np.clip(np.round((grid - lowest) / span * 65535.0), 0, 65535).astype("<u2")
    path.write_bytes(scaled.tobytes())
    return {"min": lowest, "max": highest}


def honest_note(national_pixel_m: float) -> str:
    return (
        f"National terrain cells are about {national_pixel_m:.0f} m, from Copernicus DEM GLO-90. "
        "They show ranges and plains, not buildings. Place relief defaults to the GEM-15 surface "
        "model at 15 m (DSM). The height mesh matches that where the window stays within 480 cells "
        "on a side, and is 30 m otherwise. 15 m still cannot resolve individual enclosures. "
        "Copernicus GLO-30 is the selectable fallback. GEM-15 voids are filled from GLO-30."
    )


if __name__ == "__main__":
    main()
