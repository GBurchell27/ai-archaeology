"""Close-up cache paths, redirects, and published ids."""

import importlib.util
import json
import re
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
ID_RE = re.compile(r"^(?:Q\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$")


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_published_site_ids_match_the_closeup_route():
    for relative in ("public/sites.geojson", "public/wikidata/sites.geojson"):
        data = json.loads((ATLAS / relative).read_text())
        assert data["features"]
        for feature in data["features"]:
            assert ID_RE.fullmatch(feature["id"]), feature["id"]


def test_redirects_stay_on_the_same_host_and_port():
    terrain = _load("build_atlas_terrain", ATLAS / "scripts" / "build_atlas_terrain.py")
    handler = terrain.SameHostRedirectHandler()
    request = urllib.request.Request("https://copernicus-dem-30m.s3.amazonaws.com/tile.tif")
    same = handler.redirect_request(
        request, None, 302, "Found", {}, "https://copernicus-dem-30m.s3.amazonaws.com/other.tif",
    )
    assert same is not None
    assert same.get_full_url().startswith("https://copernicus-dem-30m.s3.amazonaws.com/")
    explicit = handler.redirect_request(
        request, None, 302, "Found", {}, "https://copernicus-dem-30m.s3.amazonaws.com:443/other.tif",
    )
    assert explicit is not None
    with pytest.raises(urllib.error.URLError):
        handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/tile.tif")
    with pytest.raises(urllib.error.URLError):
        handler.redirect_request(request, None, 302, "Found", {}, "https://copernicus-dem-30m.s3.amazonaws.com:8443/other.tif")
    with pytest.raises(urllib.error.URLError):
        handler.redirect_request(request, None, 302, "Found", {}, "http://copernicus-dem-30m.s3.amazonaws.com/other.tif")


def test_eox_credit_names_the_licence():
    terrain = _load("build_atlas_terrain", ATLAS / "scripts" / "build_atlas_terrain.py")
    assert terrain.SAT_CREDIT.endswith(" — CC BY-NC-SA 4.0")
    footer = json.loads((ATLAS / "public" / "terrain" / "metadata.json").read_text())
    assert footer["attribution"]["satellite"] == terrain.SAT_CREDIT


def test_cog_window_uses_ranges_and_a_byte_cap(tmp_path: Path):
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin

    path = tmp_path / "dem.tif"
    grid = np.arange(256 * 256, dtype=np.float32).reshape(256, 256)
    transform = from_origin(30.0, 40.0, 0.001, 0.001)
    with rasterio.open(
        path, "w", driver="GTiff", height=256, width=256, count=1, dtype="float32",
        crs="EPSG:4326", transform=transform, tiled=True, blockxsize=64, blockysize=64,
        compress="deflate", predictor=3,
    ) as dataset:
        dataset.write(grid, 1)
    blob = path.read_bytes()
    fetched: list[int] = []

    def fetch(start: int, end: int) -> bytes:
        fetched.append(end - start + 1)
        return blob[start:end + 1]

    cog = _load("cog_range", ATLAS / "scripts" / "cog_range.py")
    west, south, east, north = 30.02, 39.90, 30.05, 39.95
    window = cog.read_window(fetch, west, south, east, north, max_bytes=len(blob))
    assert window is not None
    array, (_scale_x, origin_x, _scale_y, origin_y) = window
    assert sum(fetched) < len(blob)
    assert array.shape[0] < 256 and array.shape[1] < 256
    col = int(round((origin_x - 30.0) / 0.001))
    row = int(round((40.0 - origin_y) / 0.001))
    assert np.allclose(array[0, 0], grid[row, col])
    with pytest.raises(RuntimeError, match="byte cap"):
        cog.read_window(fetch, west, south, east, north, max_bytes=32)


def test_closeup_write_refuses_a_symlink(tmp_path: Path):
    store = _load("closeup_store", ATLAS / "scripts" / "closeup_store.py")
    directory = tmp_path / "site"
    directory.mkdir()
    target = directory / "height.u16"
    store.atomic_produce(target, lambda path: path.write_bytes(b"abc"))
    assert target.read_bytes() == b"abc"
    assert not target.is_symlink()

    outside = tmp_path / "outside"
    outside.mkdir()
    secret = outside / "secret.txt"
    secret.write_text("leave-me")
    linked_dir = tmp_path / "linked"
    linked_dir.symlink_to(outside, target_is_directory=True)
    with pytest.raises(RuntimeError):
        store.assert_real_directory(linked_dir)
    with pytest.raises(RuntimeError):
        store.atomic_produce(linked_dir / "height.u16", lambda path: path.write_bytes(b"pwned"))
    assert secret.read_text() == "leave-me"
    assert not (outside / "height.u16").exists()

    file_link = directory / "meta.json"
    file_link.symlink_to(secret)
    with pytest.raises(RuntimeError):
        store.atomic_produce(file_link, lambda path: path.write_bytes(b"pwned"))
    assert secret.read_text() == "leave-me"


def test_cache_resolver_rejects_symlinks():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(ATLAS / "scripts" / "check_closeup_cache.mjs")],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
