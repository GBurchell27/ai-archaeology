"""The curated featured list is valid and carries no coordinates."""

import pytest

from ai_archaeology.world.featured import (
    CATEGORIES,
    EARTH_GLOBE,
    FEATURED_PATH,
    MAX_WHY_WORDS,
    STATUSES,
    coordinates_from_entities,
    featured_problems,
    featured_sites,
    load_featured,
)


def test_curated_list_is_valid():
    monuments = load_featured()
    qids = [monument["qid"] for monument in monuments]
    assert len(qids) == len(set(qids)) == 399
    for monument in monuments:
        assert monument["category"] in CATEGORIES
        assert monument["status"] in STATUSES
        if monument["startYear"] is not None and monument["endYear"] is not None:
            assert monument["startYear"] <= monument["endYear"]
        assert len(monument["why"].split()) <= MAX_WHY_WORDS


def test_curated_file_has_no_coordinate_keys():
    text = FEATURED_PATH.read_text(encoding="utf-8").lower()
    for key in ('"lat"', '"lon"', '"lng"', '"latitude"', '"longitude"', '"coordinates"'):
        assert key not in text


def _monument(**overrides) -> dict:
    monument = {
        "qid": "Q1", "name": "Example Henge", "country": "Nowhere", "category": "megalith",
        "period": "Neolithic", "startYear": -3000, "endYear": -2500, "datingConfidence": "high",
        "status": "accepted", "why": "A ring of stones.", "source": "https://example.org/henge",
    }
    monument.update(overrides)
    return monument


def test_validation_names_each_broken_rule():
    assert featured_problems([_monument()]) == []
    broken = [
        _monument(), _monument(),  # repeated QID
        _monument(qid="Q2", category="castle"),
        _monument(qid="Q3", status="proven"),
        _monument(qid="Q4", startYear=-100, endYear=-200),
        _monument(qid="Q5", why="word " * 41),
        _monument(qid="Q6", latitude=1.0),
    ]
    assert len(featured_problems(broken)) == 6


def _entity(lon, lat, rank="normal", globe=EARTH_GLOBE) -> dict:
    value = {"longitude": lon, "latitude": lat, "globe": globe}
    return {"mainsnak": {"snaktype": "value", "datavalue": {"value": value}}, "rank": rank}


def test_coordinates_prefer_the_preferred_earth_statement_and_follow_redirects():
    entities = {
        "Q1": {"claims": {"P625": [_entity(1.0, 2.0), _entity(3.0, 4.0, rank="preferred")]}},
        "Q9": {"redirects": {"from": "Q2", "to": "Q9"}, "claims": {"P625": [_entity(5.0, 6.0)]}},
        "Q3": {"claims": {"P625": [_entity(7.0, 8.0, rank="deprecated")]}},
        "Q4": {"claims": {}},
    }
    assert coordinates_from_entities(entities) == {"Q1": (3.0, 4.0), "Q2": (5.0, 6.0)}


def test_featured_sites_join_points_by_qid_and_refuse_a_missing_one():
    monuments = [_monument(), _monument(qid="Q2", startYear=None, endYear=None)]
    sites = featured_sites({"Q1": (10.123456, 20.0), "Q2": (-5.0, 6.0)}, monuments)
    assert list(sites[0])[:4] == ["id", "name", "lon", "lat"]
    assert sites[0]["id"] == "Q1" and sites[0]["lon"] == 10.12346 and "qid" not in sites[0]
    assert sites[1]["startYear"] is None and sites[1]["status"] == "accepted"
    with pytest.raises(ValueError, match="Q2"):
        featured_sites({"Q1": (10.0, 20.0)}, monuments)
