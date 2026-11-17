"""Cross-link Wikidata and Pleiades into one list of published sites.

Identifier first: a Wikidata item that names a Pleiades id is that place.
Then the Turkey pipeline's spatial rule: within 150 m, or the same folded name
within 3 km. A different monument nearby stays.

OpenStreetMap records are ODbL share-alike and never enter this module.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np
from scipy.spatial import cKDTree

from ai_archaeology.sites.wikidata import NAME_MATCH_M, NEAR_M, _fold, _haversine_m
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
    return [
        _nearest_same_place(place, sorted(indexes), candidates, folded_names)
        for place, indexes in zip(places, neighbours)
    ]


def _nearest_same_place(
    place: WorldSite, indexes: list[int], candidates: list[WorldSite], folded_names: list[str],
) -> WorldSite | None:
    folded = _fold(place.name)
    nearest = None
    nearest_m = float("inf")
    for index in indexes:
        candidate = candidates[index]
        distance = _haversine_m(place.lon, place.lat, candidate.lon, candidate.lat)
        same_name = bool(folded) and folded == folded_names[index]
        if distance < nearest_m and (distance <= NEAR_M or (same_name and distance <= NAME_MATCH_M)):
            nearest, nearest_m = candidate, distance
    return nearest


def _sphere_points_m(sites: list[WorldSite]) -> np.ndarray:
    longitude = np.radians([site.lon for site in sites])
    latitude = np.radians([site.lat for site in sites])
    return EARTH_RADIUS_M * np.column_stack([
        np.cos(latitude) * np.cos(longitude),
        np.cos(latitude) * np.sin(longitude),
        np.sin(latitude),
    ])
