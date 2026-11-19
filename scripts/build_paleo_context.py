"""Build the globe's ice and sea level layer from the grids fetch_paleo_context.py saved. No network.

Writes one 1440 x 720 class PNG per step (0 sea, 1 land where the sea is today, 2 ice, 20 other land) and
``index.json`` with each step's year and the source's credit. One step is in memory at a time.
No sea level figure is written: the source publishes none.

Run: .venv/Scripts/python scripts/build_paleo_context.py
"""

from __future__ import annotations

import argparse
import datetime
import json
from pathlib import Path

import numpy as np
from PIL import Image

from ai_archaeology.paleo_context import (
    PRESENT_TIME_ID,
    classify_step,
    index_payload,
    pad_to_global,
    step_entry,
    step_time_ids,
)


def load_grid(raw: Path, variable: str, time_id: int) -> np.ndarray:
    with np.load(raw / f"{variable}_{time_id}.npz") as archive:
        return archive["altitude"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--raw", type=Path, default=Path("data/world/paleo/raw"))
    parser.add_argument("--out", type=Path, default=Path("Anatolia/atlas/public/paleo"))
    parser.add_argument("--generated", default=datetime.date.today().isoformat())
    arguments = parser.parse_args(argv)
    arguments.out.mkdir(parents=True, exist_ok=True)
    present_orog = load_grid(arguments.raw, "orog", PRESENT_TIME_ID)
    steps = []
    for time_id in step_time_ids():
        orog = load_grid(arguments.raw, "orog", time_id)
        glz = load_grid(arguments.raw, "glz", time_id)
        entry = step_entry(time_id)
        classes = pad_to_global(classify_step(orog, glz, present_orog))
        Image.fromarray(classes).save(arguments.out / entry["file"], optimize=True)
        steps.append(entry)
    payload = index_payload(steps, arguments.generated)
    (arguments.out / "index.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"steps": len(steps)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
