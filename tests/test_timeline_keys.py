"""Keyboard checks for the timeline slider thumbs.

Needs the atlas dependencies (`npm install` in Anatolia/atlas, which provides
puppeteer-core) and a dev server on http://127.0.0.1:43127/. It skips when
puppeteer-core is not installed.
"""

import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / "Anatolia" / "atlas" / "scripts" / "check_timeline_keys.mjs"
PUPPETEER = ROOT / "Anatolia" / "atlas" / "node_modules" / "puppeteer-core"


def test_timeline_thumbs_answer_the_keyboard():
    if not PUPPETEER.exists():
        pytest.skip("puppeteer-core is missing. Run npm install in Anatolia/atlas, then start the dev server.")
    completed = subprocess.run(
        ["node", str(CHECK)],
        cwd=ROOT / "Anatolia" / "atlas",
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
