"""The CORONA site layers are clipped frames with a licence, not raw downloads."""

import json
from pathlib import Path

METADATA = Path("Anatolia/atlas/public/terrain/metadata.json")
EXPECTED = {
    "gobekli-tepe": "1105-1009A009",
    "karahan-tepe": "1105-1025A059",
    "harran": "1105-1009A012",
}


def test_corona_windows_name_frame_licence_and_credit():
    metadata = json.loads(METADATA.read_text())
    for site_id, frame in EXPECTED.items():
        detail = metadata["details"][site_id]
        corona = detail["corona"]
        assert corona["frame"] == frame
        assert corona["licence"] == "CC BY-SA 4.0"
        assert "University of Arkansas" in corona["credit"]
        assert "not measured" in corona["note"]
        assert corona["sourceUrl"].startswith("https://corona.cast.uark.edu/")
        image = Path("Anatolia/atlas/public/terrain") / detail["rasters"]["corona"]
        assert image.is_file()
        assert image.suffix == ".jpg"
        assert image.stat().st_size < 2_000_000
    raw = list(Path("Anatolia").rglob("*.tif")) + list(Path("Anatolia").rglob("*.ntf"))
    assert raw == []
