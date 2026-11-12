"""Panel flights can be retargeted, dismissed, and cancelled.

The browser check needs the atlas dependencies (`npm install` in
Anatolia/atlas, which provides puppeteer-core) and a dev server on
http://127.0.0.1:43127/. It skips when puppeteer-core is not installed.
"""

import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / "Anatolia" / "atlas" / "scripts" / "check_panel_flight.mjs"
PUPPETEER = ROOT / "Anatolia" / "atlas" / "node_modules" / "puppeteer-core"


def test_external_hrefs_are_https_allowlist():
    completed = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--input-type=module",
            "--eval",
            """
import { safeExternalHref } from "./lib/externalHref.ts";
const cases = [
  ["https://en.wikipedia.org/wiki/Patara_(Lycia)", true],
  ["https://tr.wikipedia.org/wiki/Patara", true],
  ["https://www.wikidata.org/wiki/Q233121", true],
  ["https://whc.unesco.org/en/list/849", true],
  ["https://www.ncei.noaa.gov/pub/data/paleo/x.txt", true],
  ["https://corona.cast.uark.edu/", true],
  ["https://creativecommons.org/licenses/by-nc-sa/4.0/", true],
  ["http://en.wikipedia.org/wiki/X", false],
  ["javascript:alert(1)", false],
  ["data:text/html,hello", false],
  ["https://evil.example/phish", false],
  ["https://wikipedia.org.evil.com/", false],
];
for (const [value, ok] of cases) {
  const got = safeExternalHref(value);
  if (Boolean(got) !== ok) {
    console.log("FAIL", value, got);
    process.exit(1);
  }
}
""",
        ],
        cwd=ROOT / "Anatolia" / "atlas",
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr


def test_rapid_clicks_escape_and_midflight_close():
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
