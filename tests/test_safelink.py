"""SafeLink is rendered, not only parsed."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "Anatolia" / "atlas"


def test_safelink_renders_only_allowlisted_https_urls():
    completed = subprocess.run(
        ["node", str(ATLAS / "scripts" / "check_safelink.mjs")],
        cwd=ATLAS,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
