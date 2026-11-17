"""Cross-link Wikidata and Pleiades into one list of published sites.

Identifier first: a Wikidata item that names a Pleiades id is that place.
Then the same folded name within 3 km. Nearness alone never merges: in a dense
site the next monument is metres away, and a wrong merge is worse than a second
pin. An item absorbs one place at most.

OpenStreetMap records are ODbL share-alike and never enter this module.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np
from scipy.spatial import cKDTree

from ai_archaeology.sites.wikidata import NAME_MATCH_M, _fold, _haversine_m
from ai_archaeology.world.dating import adopt_dating, is_dated
from ai_archaeology.world.records import WorldSite

EARTH_RADIUS_M = 6371000.0


@dataclass(frozen=True)
class MergeOutcome:
    sites: list[WorldSite]
    linked_by_identifier: int
    linked_spatially: int


def merge_published(wikidata: list[WorldSite], pleiades: list[WorldSite]) -> MergeOutcome:
    for site in (*wikidata, *pleiades):
        if site.source == "osm":
            raise ValueError(f"{site.id}: OpenStreetMap records are never merged")
    merged = {site.id: site for site in wikidata}
    places = {place.id: place for place in pleiades}
    linked_ids: set[str] = set()
    for site in list(merged.values()):
        place = places.get(site.ids.get("pleiades") or "")
        if place is not None:
            merged[site.id] = _absorb(site, place)
            linked_ids.add(place.id)
    unlinked_places = [place for place in places.values() if place.id not in linked_ids]
    # An item that names another Pleiades id is by its own statement a different place.
    unlinked_items = [site for site in merged.values() if not site.ids.get("pleiades")]
    standalone = []
    for place, match in zip(unlinked_places, _spatial_matches(unlinked_places, unlinked_items)):
        if match is None:
            standalone.append(place)
        else:
            merged[match.id] = _absorb(merged[match.id], place)
    linked_spatially = len(unlinked_places) - len(standalone)
    return MergeOutcome([*merged.values(), *standalone], len(linked_ids), linked_spatially)


def _absorb(site: WorldSite, place: WorldSite) -> WorldSite:
    """Keep the Wikidata record; record the Pleiades id and borrow its dating if we have none."""
    linked = replace(site, ids={**site.ids, "pleiades": site.ids.get("pleiades") or place.id})
    if is_dated(linked) or not is_dated(place):
        return linked
    return adopt_dating(linked, place.startYear, place.endYear, place.datingSource, place.attribution, place.licence)


def _spatial_matches(places: list[WorldSite], candidates: list[WorldSite]) -> list[WorldSite | None]:
    if not places or not candidates:
        return [None] * len(places)
    tree = cKDTree(_sphere_points_m(candidates))
    # Chord length is never longer than the arc, so this ball misses nothing within 3 km.
    neighbours = tree.query_ball_point(_sphere_points_m(places), r=NAME_MATCH_M)
    folded_names = [_fold(candidate.name) for candidate in candidates]
    claims = [
        _best_claim(place, sorted(indexes), candidates, folded_names)
        for place, indexes in zip(places, neighbours)
    ]
    # Two Pleiades places are never the same item: the best claim takes it, the others stay standalone.
    winners: dict[int, int] = {}
    for place_index, claim in enumerate(claims):
        if claim is not None and (claim[1] not in winners or claim[0] < claims[winners[claim[1]]][0]):
            winners[claim[1]] = place_index
    return [
        candidates[claim[1]] if claim is not None and winners[claim[1]] == place_index else None
        for place_index, claim in enumerate(claims)
    ]


def _best_claim(
    place: WorldSite, indexes: list[int], candidates: list[WorldSite], folded_names: list[str],
) -> tuple[float, int] | None:
    """(distance, candidate index) of the nearest same-name item within 3 km."""
    folded = _fold(place.name)
    if not folded:
        return None
    claims = [
        (_haversine_m(place.lon, place.lat, candidates[index].lon, candidates[index].lat), index)
        for index in indexes if folded_names[index] == folded
    ]
    return min((claim for claim in claims if claim[0] <= NAME_MATCH_M), default=None)


def _sphere_points_m(sites: list[WorldSite]) -> np.ndarray:
    longitude = np.radians([site.lon for site in sites])
    latitude = np.radians([site.lat for site in sites])
    return EARTH_RADIUS_M * np.column_stack([
        np.cos(latitude) * np.cos(longitude),
        np.cos(latitude) * np.sin(longitude),
        np.sin(latitude),
    ])
