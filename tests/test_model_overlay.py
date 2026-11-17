"""The recording-pattern overlay: ramp order, index.json shape, the effort-baseline badge, raster orientation."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"
CHECK = ATLAS / "scripts" / "check_model_overlay.mts"


def test_model_overlay_ramp_index_badge_and_orientation():
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(CHECK)],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok":true' in completed.stdout.replace(" ", "")
