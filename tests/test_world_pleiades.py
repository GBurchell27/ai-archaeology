"""Whole-gazetteer Pleiades places become world source records. Synthetic places only."""

from ai_archaeology.sites.pleiades import place_from_dump, published_periods
from ai_archaeology.world.pleiades_world import site_type_for, world_site_from_place


def _raw(place_types, point=(-1.5, 52.0), precision="precise", **overrides) -> dict:
    raw = {
        "id": "123456",
        "title": "Example Place",
        "review_state": "published",
        "reprPoint": list(point) if point else None,
        "placeTypes": list(place_types),
        "names": [{"romanized": "Exemplum", "attestations": [{"timePeriod": "archaic", "confidence": "confident"}]}],
        "locations": [],
        "features": [{"properties": {"location_precision": precision}}] if precision else [],
    }
    raw.update(overrides)
    return raw


def test_place_outside_the_turkey_window_becomes_a_dated_world_site():
    raw = _raw(["settlement"])
    assert place_from_dump(raw) is None  # the Turkey default is unchanged
    site = world_site_from_place(raw, published_periods())
    assert site.id == "123456" and site.source == "pleiades"
    assert site.licence == "CC BY 3.0" and site.attribution == "Pleiades contributors"
    assert site.sourceUrl == "https://pleiades.stoa.org/places/123456"
    assert site.ids["pleiades"] == "123456" and site.ids["wikidata"] is None
    assert (site.startYear, site.endYear, site.datingSource) == (-750, -550, "pleiades")
    assert site.siteType == "settlement" and site.locationPrecision == "exact" and site.importance == 0


def test_site_type_rules():
    assert site_type_for(("temple-2",)) == "ritual"
    assert site_type_for(("cemetery",)) == "necropolis"
    assert site_type_for(("fort",)) == "enclosure"
    assert site_type_for(("tumulus",)) == "tumulus"
    assert site_type_for(("settlement", "tell")) == "tell"
    assert site_type_for(("bridge",)) == "other"
    assert site_type_for(("unlocated", "villa")) == "settlement"


def test_natural_and_administrative_places_are_skipped():
    for kinds in (("river",), ("mountain",), ("region", "province"), ("people",), ("unknown",), ()):
        assert site_type_for(kinds) is None
        assert world_site_from_place(_raw(kinds), published_periods()) is None


def test_place_without_a_point_is_skipped():
    assert world_site_from_place(_raw(["settlement"], point=None), published_periods()) is None


def test_rough_or_unmarked_location_is_rough_and_undated_place_says_none():
    vocabulary = published_periods()
    assert world_site_from_place(_raw(["fort"], precision="rough"), vocabulary).locationPrecision == "rough"
    undated = world_site_from_place(_raw(["fort"], precision=None, names=[]), vocabulary)
    assert undated.locationPrecision == "rough"
    assert (undated.startYear, undated.endYear, undated.datingSource) == (None, None, "none")
