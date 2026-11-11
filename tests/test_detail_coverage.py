"""A close-up must show the detail tile, not the coarse national plane cutting through it."""

import os
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / "Anatolia" / "atlas" / "scripts" / "check_detail_coverage.mjs"
OUT = Path("/tmp/atlas-detail-check")


def test_detail_tile_covers_the_close_up():
    env = os.environ.copy()
    env["CHECK_DIR"] = str(OUT)
    completed = subprocess.run(
        ["node", str(CHECK)],
        cwd=ROOT / "Anatolia" / "atlas",
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    for name in ("antioch.png", "rumkale.png", "bodrum.png"):
        tan, grey, terrain = _terrain_fractions(OUT / name)
        assert terrain > 0.45, f"{name} has too little readable terrain ({terrain:.2f})"
        assert grey / terrain > 0.72, f"{name} detail grey {grey / terrain:.2f} of terrain"
        assert tan < 0.22, f"{name} still shows a national tan plane ({tan:.2f})"


def _terrain_fractions(path: Path) -> tuple[float, float, float]:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    crop = image.crop((int(width * 0.06), int(height * 0.16), int(width * 0.56), int(height * 0.86)))
    tan = grey = other = 0
    for red, green, blue in crop.get_flattened_data():
        chroma = max(red, green, blue) - min(red, green, blue)
        warmth = (red + green) / 2
        if chroma >= 20 and warmth > blue + 14 and warmth > 80:
            tan += 1
        elif chroma < 18 and 55 < (red + green + blue) / 3 < 250:
            grey += 1
        else:
            other += 1
    total = tan + grey + other
    terrain = tan + grey
    return tan / total, grey / total, terrain / total
