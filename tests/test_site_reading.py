"""Reading lists and follow links: full citations, known kinds, allowlisted addresses, found under every id."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
CHECK = ATLAS / "scripts" / "check_site_reading.mts"


def test_reading_lists_and_follow_links():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(CHECK)],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
