"""A failed place-relief fetch stays on the panel instead of hanging."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / "Anatolia" / "atlas" / "scripts" / "check_relief_load.mts"


def test_relief_load_failure_reopens_the_panel():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(CHECK)],
        cwd=ROOT / "Anatolia" / "atlas",
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
