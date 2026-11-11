"""The explorer may pin only the published locations that were explicitly supplied."""

import json
from pathlib import Path

SITES = Path("Anatolia/explorer/public/sites.geojson")

PUBLISHED = {
    "gobekli-tepe": (38.922364, 37.223242),
    "karahan-tepe": (39.30361, 37.0925),
    "sayburc": (38.6206972, 37.1112389),
    "harbetsuvan-tepesi": (39.2524333, 37.048675),
    "nevali-cori": (38.60556, 37.51833),
    "harran": (39.025, 36.87083),
}


def test_explorer_sites_are_only_the_published_points():
    document = json.loads(SITES.read_text())
    features = document["features"]
    assert [feature["id"] for feature in features] == list(PUBLISHED)
    for feature in features:
        longitude, latitude = feature["geometry"]["coordinates"]
        expected_longitude, expected_latitude = PUBLISHED[feature["id"]]
        assert longitude == expected_longitude
        assert latitude == expected_latitude
        properties = feature["properties"]
        assert properties["sourceUrl"].startswith("https://")
        assert properties["name"]
        assert properties["notes"]
        assert "discovery" not in properties["description"].lower() or "not a discovery" in properties["description"].lower()
