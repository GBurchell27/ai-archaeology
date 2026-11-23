"""Why a 3D view stopped, and what counts as a splat file."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
CHECK = ATLAS / "scripts" / "check_scene_failure.mts"


def test_scene_failure_and_splat_records():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(CHECK)],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok":true' in completed.stdout.replace(" ", "")
