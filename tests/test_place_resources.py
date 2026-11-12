"""Published place panels carry free, allowlisted resource links."""

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
RESOURCES = ATLAS / "public" / "resources"
COORDINATE_PAIR = re.compile(r"-?\d{1,3}\.\d{4,}\s*[, ]\s*-?\d{1,3}\.\d{4,}")


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


def test_resource_shards_have_no_coordinate_pairs():
    offenders = []
    for path in RESOURCES.glob("*.json"):
        if COORDINATE_PAIR.search(path.read_text(encoding="utf-8", errors="ignore")):
            offenders.append(path.name)
    assert offenders == []
