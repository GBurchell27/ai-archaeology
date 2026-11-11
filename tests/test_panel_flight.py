"""Panel flights can be retargeted, dismissed, and cancelled."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / "Anatolia" / "atlas" / "scripts" / "check_panel_flight.mjs"


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
  ["http://en.wikipedia.org/wiki/X", false],
  ["javascript:alert(1)", false],
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
    completed = subprocess.run(
        ["node", str(CHECK)],
        cwd=ROOT / "Anatolia" / "atlas",
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert '"ok": true' in completed.stdout or '"ok":true' in completed.stdout.replace(" ", "")
