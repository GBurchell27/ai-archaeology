"""Year-range filter for published atlas pins."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
CHECK = ATLAS / "scripts" / "check_timeline.mts"


def test_timeline_range_filter():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(CHECK)],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
