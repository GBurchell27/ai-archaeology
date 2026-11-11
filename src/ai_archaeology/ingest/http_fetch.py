"""Small HTTP helpers for public terrain services."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

USER_AGENT = "ai-archaeology-hobby-research/0.1 (private learning project)"


def request_json(url: str, params: dict | None = None, timeout: float = 60) -> dict:
    target = url if not params else url + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(target, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def download_file(url: str, destination: Path, timeout: float = 180) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = response.read()
    if payload.startswith(b"{") or payload.startswith(b"<"):
        raise RuntimeError("terrain service returned an error document instead of a raster")
    destination.write_bytes(payload)
