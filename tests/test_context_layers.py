"""Every atlas context layer names its source, licence, and coverage."""

import json
from pathlib import Path

CONTEXT = Path("Anatolia/atlas/public/context")


def test_every_context_layer_has_source_licence_and_coverage():
    catalog = json.loads((CONTEXT / "layers.json").read_text())
    layers = catalog["layers"]
    ids = {layer["id"] for layer in layers}
    assert {"rivers", "lakes", "paleo-water", "roads", "clay", "soc", "climate"} <= ids
    for layer in layers:
        assert layer["source"]
        assert layer["sourceUrl"].startswith("https://")
        assert layer["licence"]
        assert layer["coverage"]
        assert layer["resolution"]
        assert (CONTEXT / layer["file"]).is_file()
    paleo = json.loads((CONTEXT / "paleo.geojson").read_text())
    for feature in paleo["features"]:
        assert feature["properties"]["approximate"] is True
        assert "not" in feature["properties"]["note"].lower()
    roads = json.loads((CONTEXT / "roads.geojson").read_text())
    assert roads["features"]
    assert "certainty" in roads["features"][0]["properties"]
    climate = json.loads((CONTEXT / "climate.json").read_text())
    assert {record["id"] for record in climate["records"]} >= {"sofular", "van", "acigol", "soreq", "jeita"}
    for record in climate["records"]:
        assert record["series"]
        assert record["citation"]
