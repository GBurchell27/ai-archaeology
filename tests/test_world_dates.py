"""Globe year maths: no year 0, BCE/CE wording, open-ended and one-sided ranges."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
CHECK = ATLAS / "scripts" / "check_world_dates.mts"


def test_world_year_formatting_and_slider_maths():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(CHECK)],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok":true' in completed.stdout.replace(" ", "")
