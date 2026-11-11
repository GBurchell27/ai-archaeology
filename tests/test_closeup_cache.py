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


def test_redirects_stay_on_the_same_host():
    terrain = _load("build_atlas_terrain", ATLAS / "scripts" / "build_atlas_terrain.py")
    handler = terrain.SameHostRedirectHandler()
    request = urllib.request.Request("https://copernicus-dem-30m.s3.amazonaws.com/tile.tif")
    same = handler.redirect_request(
        request, None, 302, "Found", {}, "https://copernicus-dem-30m.s3.amazonaws.com/other.tif",
    )
    assert same is not None
    assert same.get_full_url().startswith("https://copernicus-dem-30m.s3.amazonaws.com/")
    with pytest.raises(urllib.error.URLError):
        handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/tile.tif")


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
