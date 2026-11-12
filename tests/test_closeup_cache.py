"""Close-up cache paths, redirects, and published ids."""

import importlib.util
import json
import math
import re
import subprocess
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
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


def _tiled_dem(path: Path, *, point: bool):
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin

    grid = np.arange(64 * 64, dtype=np.float32).reshape(64, 64)
    with rasterio.open(
        path, "w", driver="GTiff", height=64, width=64, count=1, dtype="float32",
        crs="EPSG:4326", transform=from_origin(30.0, 40.0, 0.001, 0.001),
        tiled=True, blockxsize=32, blockysize=32, compress="deflate", predictor=3,
    ) as dataset:
        dataset.write(grid, 1)
        if point:
            dataset.update_tags(AREA_OR_POINT="Point")
    return grid


def test_point_tiepoint_uses_the_gdal_half_pixel(tmp_path: Path):
    import rasterio

    path = tmp_path / "point.tif"
    grid = _tiled_dem(path, point=True)
    with rasterio.open(path) as dataset:
        assert dataset.tags().get("AREA_OR_POINT") == "Point"
        gdal_x, gdal_y = dataset.transform.c, dataset.transform.f
    blob = path.read_bytes()
    cog = _load("cog_range", ATLAS / "scripts" / "cog_range.py")
    window = cog.read_window(lambda start, end: blob[start:end + 1], 30.0, 39.9, 30.02, 40.001, max_bytes=len(blob))
    assert window is not None
    array, (_sx, origin_x, _sy, origin_y) = window
    assert abs(origin_x - gdal_x) < 1e-9
    assert abs(origin_y - gdal_y) < 1e-9
    assert array[0, 0] == grid[0, 0]


def test_pixel_edge_epsilon_does_not_grow_the_window(tmp_path: Path):
    path = tmp_path / "area.tif"
    _tiled_dem(path, point=False)
    blob = path.read_bytes()
    cog = _load("cog_range", ATLAS / "scripts" / "cog_range.py")
    scale = 0.001
    west = math.nextafter(30.0 + 20 * scale, 0.0)
    east = 30.0 + 22 * scale
    north = math.nextafter(40.0 - 10 * scale, 0.0)
    south = 40.0 - 12 * scale
    window = cog.read_window(lambda start, end: blob[start:end + 1], west, south, east, north, max_bytes=len(blob))
    assert window is not None
    _array, (_sx, origin_x, _sy, origin_y) = window
    assert round((origin_x - 30.0) / scale) == 20
    assert round((40.0 - origin_y) / scale) == 10
    assert cog._snap_pixel(20.4) == 20.4


def test_content_range_total_must_extend_past_the_last_byte():
    terrain = _load("build_atlas_terrain", ATLAS / "scripts" / "build_atlas_terrain.py")
    terrain.validate_content_range("bytes 0-3/4", 0, 3)
    terrain.validate_content_range("bytes 0-3/*", 0, 3)
    with pytest.raises(RuntimeError, match="content range"):
        terrain.validate_content_range("bytes 0-3/3", 0, 3)


def test_content_range_must_match_the_request():
    payload = b"abcdefghijklmnopqrstuvwxyz"

    class Handler(BaseHTTPRequestHandler):
        mismatch = False

        def do_GET(self):
            header = self.headers.get("Range", "")
            start_s, end_s = header.removeprefix("bytes=").split("-")
            start, end = int(start_s), int(end_s)
            if self.server.mismatch:  # type: ignore[attr-defined]
                start, end = start + 4, end + 4
            body = payload[start:end + 1]
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{len(payload)}")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, _format, *_args):
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.mismatch = False  # type: ignore[attr-defined]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    terrain = _load("build_atlas_terrain", ATLAS / "scripts" / "build_atlas_terrain.py")
    url = f"http://127.0.0.1:{server.server_address[1]}/tile"
    try:
        body = terrain.read_pinned(url, extra_headers={"Range": "bytes=0-3"}, require_range=True, max_bytes=4)
        assert body == payload[:4]
        server.mismatch = True  # type: ignore[attr-defined]
        with pytest.raises(RuntimeError, match="content range"):
            terrain.read_pinned(url, extra_headers={"Range": "bytes=0-3"}, require_range=True, max_bytes=8)
    finally:
        server.shutdown()


def test_bad_deflate_is_a_layout_error():
    cog = _load("cog_range", ATLAS / "scripts" / "cog_range.py")
    with pytest.raises(RuntimeError, match="layout") as caught:
        cog._decode_tile(b"\x00\x01not-zlib", 4, 4, compression=8, predictor=1)
    assert isinstance(caught.value.__cause__, cog.zlib.error)


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
