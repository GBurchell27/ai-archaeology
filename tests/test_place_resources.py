"""Published place panels carry free, allowlisted resource links."""

import json
import subprocess
from pathlib import Path

from ai_archaeology.sites.resources import contains_precise_coordinate, stable_record

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
RESOURCES = ATLAS / "public" / "resources"


def test_resource_shards_and_allowlist():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(ATLAS / "scripts" / "check_place_resources.mts")],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")


def test_resource_shards_have_no_precise_coordinates_or_stray_brackets():
    coordinate_files = []
    stray = 0
    for path in RESOURCES.glob("*.json"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        if contains_precise_coordinate(text):
            coordinate_files.append(path.name)
        payload = json.loads(text)
        for record in payload.values():
            for reference in record.get("references") or []:
                if "<" in (reference.get("citation") or ""):
                    stray += 1
    assert coordinate_files == []
    assert stray == 0


def test_resource_records_sort_to_the_same_bytes():
    record = {
        "website": "https://www.catalhoyuk.com",
        "id": "catalhoyuk",
        "names": ["Çatal Höyük", "Çatalhöyük"],
        "wikipedia": [{"lang": "tr", "url": "https://tr.wikipedia.org/wiki/X"}, {"lang": "en", "url": "https://en.wikipedia.org/wiki/X"}],
    }
    first = json.dumps(stable_record(record), sort_keys=True, separators=(",", ":"))
    second = json.dumps(stable_record(dict(reversed(list(record.items())))), sort_keys=True, separators=(",", ":"))
    assert first == second
