from ai_archaeology.world.osm_megaliths import (
    element_to_site,
    elements_to_sites,
    overpass_megalith_query,
)

NAMED_NODE = {
    "type": "node", "id": 11, "lat": 51.5, "lon": -1.8,
    "tags": {
        "historic": "archaeological_site", "megalith_type": "stone_circle", "name": "Cercle",
        "name:en": "Ring of Stones", "wikidata": "Q42", "wikipedia": "en:Ring of Stones", "start_date": "-2500",
    },
}
BARE_WAY = {
    "type": "way", "id": 22, "center": {"lat": 47.6, "lon": -3.1},
    "tags": {"megalith_type": "dolmen", "wikidata": "not-an-id", "start_date": "C18"},
}


def test_named_node_maps_every_field():
    site = element_to_site(NAMED_NODE)
    assert (site.id, site.name, site.lon, site.lat) == ("osm-n11", "Ring of Stones", -1.8, 51.5)
    assert (site.source, site.licence, site.siteType) == ("osm", "ODbL 1.0", "megalith")
    assert site.sourceUrl == "https://www.openstreetmap.org/node/11"
    assert site.types == ["stone circle"]
    assert site.ids["wikidata"] == "Q42" and site.ids["osm"] == "node/11"
    assert site.wikipedia == "https://en.wikipedia.org/wiki/Ring_of_Stones"
    assert (site.startYear, site.datingSource, site.importance) == (-2500, "label", 0)


def test_unnamed_way_uses_its_centre_and_a_readable_name():
    site = element_to_site(BARE_WAY)
    assert (site.id, site.name, site.lon) == ("osm-w22", "Dolmen", -3.1)
    assert site.ids["wikidata"] is None and site.wikipedia is None
    assert (site.startYear, site.datingSource) == (None, "none")


def test_untyped_or_unplaced_elements():
    untyped = {"type": "node", "id": 3, "lat": 1.0, "lon": 2.0, "tags": {"archaeological_site": "megalith"}}
    assert element_to_site(untyped).name == "Megalith"
    assert element_to_site({"type": "way", "id": 4, "tags": {}}) is None
    assert element_to_site({"type": "relation", "id": 5, "center": {"lat": 1, "lon": 2}}) is None
    assert [site.id for site in elements_to_sites([NAMED_NODE, NAMED_NODE, BARE_WAY])] == ["osm-n11", "osm-w22"]


def test_query_covers_nodes_and_ways_in_the_band():
    query = overpass_megalith_query(-30, 5)
    assert query.count("(-90,-30,90,5)") == 4
    assert 'way["megalith_type"]' in query and 'node["historic"="archaeological_site"]' in query
    assert query.rstrip().endswith("out center tags;")
