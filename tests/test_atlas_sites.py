"""Every atlas pin is a published place with a source and a confidence."""

import json
from pathlib import Path

ATLAS = Path("Anatolia/atlas/public/sites.geojson")
EXPLORER = Path("Anatolia/explorer/public/sites.geojson")

NEOLITHIC = {
    "gobekli-tepe": (38.922364, 37.223242),
    "karahan-tepe": (39.30361, 37.0925),
    "sayburc": (38.6206972, 37.1112389),
    "harbetsuvan-tepesi": (39.2524333, 37.048675),
    "nevali-cori": (38.60556, 37.51833),
    "harran": (39.025, 36.87083),
}


def test_every_atlas_site_has_source_and_confidence():
    features = json.loads(ATLAS.read_text())["features"]
    assert features
    seen = set()
    for feature in features:
        properties = feature["properties"]
        assert feature["id"] not in seen
        seen.add(feature["id"])
        assert properties["sourceUrl"].startswith("https://")
        assert properties["source"]
        assert properties["confidence"] in {"high", "approximate"}
        assert isinstance(properties["startYear"], int)
        assert isinstance(properties["endYear"], int)
        assert properties["startYear"] <= properties["endYear"]
        assert properties["layer"] in {"neolithic", "crusader"}
        assert properties["category"] in {"site", "city", "castle", "battle", "event"}
        assert properties["name"]
        assert properties["description"]
        if properties["confidence"] == "approximate":
            assert properties["category"] in {"battle", "event", "castle", "city"}


def test_neolithic_coordinates_match_the_explorer():
    atlas = {feature["id"]: feature for feature in json.loads(ATLAS.read_text())["features"]}
    explorer = {feature["id"]: feature for feature in json.loads(EXPLORER.read_text())["features"]}
    assert set(NEOLITHIC) <= set(atlas)
    for site_id, (longitude, latitude) in NEOLITHIC.items():
        assert atlas[site_id]["geometry"]["coordinates"] == [longitude, latitude]
        assert explorer[site_id]["geometry"]["coordinates"] == [longitude, latitude]
        assert atlas[site_id]["properties"]["layer"] == "neolithic"


def test_approximate_pins_are_the_uncertain_ones():
    features = json.loads(ATLAS.read_text())["features"]
    approximate = {feature["id"] for feature in features if feature["properties"]["confidence"] == "approximate"}
    assert approximate == {"dorylaeum", "ravendel", "saleph", "smyrna-hospitaller"}
