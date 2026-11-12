"""Fill published-site timelines from the Pleiades gazetteer.

Pleiades is CC BY 3.0 and the bulk JSON is a free download with no account.
The raw dump stays out of git. A place is the same pin only when a name matches
within 3 km. A different name within 150 m is not given those dates, and it is
not added again. Detector candidates are never an input.
"""

from __future__ import annotations

import gzip
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from ai_archaeology.sites.wikidata import (
    NAME_MATCH_M,
    NEAR_M,
    CuratedPin,
    assign_periods,
    _fold,
    _haversine_m,
)

WINDOW = (25.5, 35.8, 45.0, 42.2)
SAME_NAME_SKIP_M = 8000.0
MIN_NAME = 3
LICENCE_URL = "https://creativecommons.org/licenses/by/3.0/us/"
CREDIT = (
    "Pleiades: A Gazetteer of Past Places. Copyright the contributors, "
    f"CC BY 3.0 US. {LICENCE_URL} https://pleiades.stoa.org/"
)
SOURCE_URL = "https://atlantides.org/downloads/pleiades/json/pleiades-places-latest.json.gz"
PERIODS_PATH = Path(__file__).with_name("pleiades_periods.json")


def published_periods() -> dict[str, tuple[int, int]]:
    """Each Pleiades time-period slug and the start/end years published for it."""
    raw = json.loads(PERIODS_PATH.read_text())
    return {key: (int(bounds[0]), int(bounds[1])) for key, bounds in raw.items()}

# Slugs whose whole span is modern. Their years are not occupation.
MODERN_PREFIXES = (
    "modern",
    "sixteenth-ce",
    "seventeenth-ce",
    "eighteenth-ce",
    "nineteenth-ce",
    "twentieth-ce",
    "twenty-first-ce",
)


@dataclass(frozen=True)
class GazetteerPlace:
    id: str
    title: str
    longitude: float
    latitude: float
    types: tuple[str, ...]
    names: tuple[str, ...]
    spans: tuple[tuple[int | None, int | None, str | None], ...]


def iter_places(path: Path):
    """Yield place objects from a Pleiades @graph dump without holding the file."""
    decoder = json.JSONDecoder()
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as handle:
        buffer = ""
        while '"@graph"' not in buffer:
            chunk = handle.read(1 << 20)
            if not chunk:
                return
            buffer += chunk
        buffer = buffer[buffer.find("[", buffer.find('"@graph"')) + 1:]
        while True:
            buffer = buffer.lstrip()
            if buffer.startswith("]"):
                return
            if buffer.startswith(","):
                buffer = buffer[1:]
                continue
            try:
                place, index = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                chunk = handle.read(1 << 20)
                if not chunk:
                    raise
                buffer += chunk
                continue
            yield place
            buffer = buffer[index:]


def place_from_dump(raw: dict) -> GazetteerPlace | None:
    if raw.get("review_state") not in (None, "published"):
        return None
    point = raw.get("reprPoint")
    if not point or len(point) < 2:
        return None
    longitude, latitude = float(point[0]), float(point[1])
    west, south, east, north = WINDOW
    if not (west <= longitude <= east and south <= latitude <= north):
        return None
    identifier = str(raw.get("id") or "")
    if identifier.startswith("http"):
        identifier = identifier.rstrip("/").rsplit("/", 1)[-1]
    if not identifier.isdigit():
        return None
    names = []
    spans = []
    title = raw.get("title") or identifier
    names.append(title)
    for name in raw.get("names") or []:
        if _uncertain(name.get("associationCertainty")):
            continue
        for part in (name.get("romanized"), name.get("attested")):
            if not part:
                continue
            names.extend(piece.strip() for piece in str(part).split(",") if piece.strip())
        spans.extend(_record_spans(name.get("start"), name.get("end"), name.get("attestations") or []))
    for location in raw.get("locations") or []:
        if _uncertain(location.get("associationCertainty")):
            continue
        spans.extend(_record_spans(location.get("start"), location.get("end"), location.get("attestations") or []))
    types = tuple(str(item) for item in (raw.get("placeTypes") or [])[:6])
    return GazetteerPlace(identifier, title, longitude, latitude, types, tuple(dict.fromkeys(names)), tuple(spans))


def apply_places(places: list[GazetteerPlace], features: list[dict], curated: list) -> dict:
    """Attach dates to existing pins and append new published places. Returns counts."""
    pins = _pins(features, curated)
    by_name: dict[str, list[dict]] = {}
    for pin in pins:
        for folded in pin["names"]:
            by_name.setdefault(folded, []).append(pin)
    vocabulary = published_periods()
    before = {
        str(feature["id"]): (
            feature["properties"].get("startYear"),
            feature["properties"].get("endYear"),
            tuple(feature["properties"].get("periods") or []),
        )
        for feature in features
    }
    dated_before = sum(bool(feature["properties"].get("periods")) for feature in features)
    matched = ambiguous = skipped_near = added = dropped_untitled = vocabulary_fills = 0
    seen = {str(feature["id"]) for feature in features}
    for place in places:
        spans, filled = _accepted_spans(place, vocabulary)
        vocabulary_fills += filled
        hit = _match(place, by_name)
        if hit == "ambiguous":
            ambiguous += 1
            continue
        if hit is not None:
            matched += 1
            feature = hit.get("feature")
            if feature is not None and spans:
                _merge_span(feature["properties"], spans, place.id, replace=hit.get("curated", False))
            continue
        if _unnamed(place.title) and not spans:
            dropped_untitled += 1
            continue
        if _blocked(place, pins):
            skipped_near += 1
            continue
        if place.id in seen or _same_new_name(place, pins):
            skipped_near += 1
            continue
        feature = _new_feature(place, spans)
        features.append(feature)
        seen.add(place.id)
        added += 1
        _register(pins, by_name, feature, new=True)
    features.sort(key=lambda feature: feature["properties"]["name"].lower())
    dated_after = sum(bool(feature["properties"].get("periods")) for feature in features)
    wikidata_pins = [feature for feature in features if feature["properties"].get("source") != "Pleiades"]
    return {
        "inWindow": len(places),
        "matched": matched,
        "ambiguous": ambiguous,
        "skippedNear": skipped_near,
        "added": added,
        "datedBefore": dated_before,
        "datedAfter": dated_after,
        "wikidataPins": len(wikidata_pins),
        "wikidataDatedAfter": sum(bool(feature["properties"].get("periods")) for feature in wikidata_pins),
        "publishedPins": len(features),
        "nameMatchMetres": NAME_MATCH_M,
        "sameNameSkipMetres": SAME_NAME_SKIP_M,
        "nearMetres": NEAR_M,
        "vocabularyFills": vocabulary_fills,
        "droppedUntitled": dropped_untitled,
        "datesChanged": sum(
            before.get(str(feature["id"])) != (
                feature["properties"].get("startYear"),
                feature["properties"].get("endYear"),
                tuple(feature["properties"].get("periods") or []),
            )
            for feature in features
            if str(feature["id"]) in before
        ),
    }


def write_catalog(features: list[dict], meta_path: Path, counts: dict, dump_sha256: str) -> None:
    collection = {"type": "FeatureCollection", "features": features}
    encoded = (json.dumps(collection) + "\n").encode()
    geojson_path = meta_path.parent / "sites.geojson"
    geojson_path.write_bytes(encoded)
    meta = json.loads(meta_path.read_text())
    meta["sitesGeojsonSha256"] = hashlib.sha256(encoded).hexdigest()
    meta["publishedPins"] = len(features)
    meta["undated"] = sum(not feature["properties"].get("periods") for feature in features)
    meta["pleiades"] = {
        "retrieved": "2026-11-12",
        "sourceUrl": SOURCE_URL,
        "licence": "CC BY 3.0 US",
        "licenceUrl": LICENCE_URL,
        "credit": CREDIT,
        "dumpSha256": dump_sha256,
        **counts,
    }
    meta_path.write_text(json.dumps(meta, indent=2) + "\n")


def _pins(features: list[dict], curated: list) -> list[dict]:
    pins = []
    for pin in curated:
        if isinstance(pin, CuratedPin):
            pins.append({
                "id": pin.id,
                "names": {_fold(pin.name)},
                "longitude": pin.longitude,
                "latitude": pin.latitude,
                "feature": None,
                "curated": True,
                "new": False,
            })
            continue
        longitude, latitude = pin["geometry"]["coordinates"]
        names = {_fold(name) for name in pin["properties"].get("names") or []}
        names.add(_fold(pin["properties"]["name"]))
        pins.append({
            "id": str(pin["id"]),
            "names": {name for name in names if len(name) >= MIN_NAME},
            "longitude": float(longitude),
            "latitude": float(latitude),
            "feature": pin,
            "curated": True,
            "new": False,
        })
    for feature in features:
        longitude, latitude = feature["geometry"]["coordinates"]
        pins.append({
            "id": str(feature["id"]),
            "names": {_fold(feature["properties"]["name"])},
            "longitude": float(longitude),
            "latitude": float(latitude),
            "feature": feature,
            "curated": False,
            "new": False,
        })
    return pins


def _register(pins: list[dict], by_name: dict[str, list[dict]], feature: dict, new: bool) -> None:
    longitude, latitude = feature["geometry"]["coordinates"]
    pin = {
        "id": str(feature["id"]),
        "names": {_fold(feature["properties"]["name"])},
        "longitude": float(longitude),
        "latitude": float(latitude),
        "feature": feature,
        "curated": False,
        "new": new,
    }
    pins.append(pin)
    for folded in pin["names"]:
        if len(folded) >= MIN_NAME:
            by_name.setdefault(folded, []).append(pin)


def _same_new_name(place: GazetteerPlace, pins: list[dict]) -> bool:
    folded_names = {_fold(name) for name in place.names if len(_fold(name)) >= MIN_NAME and not _unnamed(name)}
    for pin in pins:
        if not pin.get("new"):
            continue
        if not folded_names & pin["names"]:
            continue
        if _haversine_m(place.longitude, place.latitude, pin["longitude"], pin["latitude"]) <= NAME_MATCH_M:
            return True
    return False


def _unnamed(title: str) -> bool:
    return _fold(title) in {"", "untitled"}


def _match(place: GazetteerPlace, by_name: dict[str, list[dict]]):
    found: dict[str, tuple[float, dict]] = {}
    for name in place.names:
        folded = _fold(name)
        if len(folded) < MIN_NAME or _unnamed(name):
            continue
        for pin in by_name.get(folded, []):
            distance = _haversine_m(place.longitude, place.latitude, pin["longitude"], pin["latitude"])
            if distance > NAME_MATCH_M:
                continue
            previous = found.get(pin["id"])
            if previous is None or distance < previous[0]:
                found[pin["id"]] = (distance, pin)
    if len(found) > 1:
        return "ambiguous"
    if len(found) == 1:
        return next(iter(found.values()))[1]
    return None


def _blocked(place: GazetteerPlace, pins: list[dict]) -> bool:
    folded_names = {_fold(name) for name in place.names if len(_fold(name)) >= MIN_NAME and not _unnamed(name)}
    for pin in pins:
        distance = _haversine_m(place.longitude, place.latitude, pin["longitude"], pin["latitude"])
        if distance <= NEAR_M:
            return True
        if distance <= SAME_NAME_SKIP_M and folded_names & pin["names"]:
            return True
    return False


def _merge_span(props: dict, spans: list[tuple[int, int, str | None]], pleiades_id: str, replace: bool = False) -> None:
    start = min(span[0] for span in spans)
    end = max(span[1] for span in spans)
    if not replace:
        if props.get("startYear") is not None:
            start = min(start, props["startYear"])
        if props.get("endYear") is not None:
            end = max(end, props["endYear"])
    props["startYear"] = start
    props["endYear"] = end
    props["periods"] = assign_periods(list(props.get("periodLabels") or []), start, end)
    props["pleiadesId"] = pleiades_id
    props["pleiadesUrl"] = f"https://pleiades.stoa.org/places/{pleiades_id}"
    if props.get("confidence") == "low" and props["periods"]:
        props["confidence"] = "medium"


def _new_feature(place: GazetteerPlace, spans: list[tuple[int, int, str | None]]) -> dict:
    start = min(span[0] for span in spans) if spans else None
    end = max(span[1] for span in spans) if spans else None
    periods = assign_periods([], start, end)
    url = f"https://pleiades.stoa.org/places/{place.id}"
    return {
        "type": "Feature",
        "id": place.id,
        "geometry": {"type": "Point", "coordinates": [round(place.longitude, 5), round(place.latitude, 5)]},
        "properties": {
            "name": place.title,
            "qid": place.id,
            "source": "Pleiades",
            "sourceUrl": url,
            "wikipedia": None,
            "types": list(place.types),
            "periodLabels": [],
            "periods": periods,
            "startYear": start,
            "endYear": end,
            "heritage": [],
            "confidence": "medium" if periods else "low",
            "licence": "CC BY 3.0 US",
            "pleiadesId": place.id,
            "pleiadesUrl": url,
        },
    }


def _record_spans(start, end, attestations: list[dict]) -> list[tuple[int | None, int | None, str | None]]:
    periods = [attestation.get("timePeriod") for attestation in attestations if not _uncertain(attestation.get("confidence")) and attestation.get("timePeriod")]
    if not periods:
        return [(start, end, None)]
    return [(start, end, period) for period in periods]


def _accepted_spans(place: GazetteerPlace, vocabulary: dict[str, tuple[int, int]]) -> tuple[list[tuple[int, int, str | None]], int]:
    """Clip every dated attestation to that period's published years.

    A year-less attestation uses the vocabulary bounds themselves. It is not
    filled from the median of other places' numeric spans.
    """
    accepted = []
    filled = 0
    for start, end, period in place.spans:
        if _modern(period):
            continue
        published = vocabulary.get(period) if period else None
        from_vocabulary = False
        if start is None and end is None:
            if published is None:
                continue
            start, end = published
            from_vocabulary = True
        else:
            if start is None:
                start = end
            elif end is None:
                end = start
            if start is None or end is None:
                continue
            if start > end:
                start, end = end, start
            if published is not None:
                start = max(int(start), published[0])
                end = min(int(end), published[1])
                if start > end:
                    continue
        if int(start) >= 1600:
            continue
        if published is None:
            end = min(int(end), 1600)
        accepted.append((int(start), int(end), period))
        if from_vocabulary:
            filled += 1
    return accepted, filled


def _modern(period: str | None) -> bool:
    if not period:
        return False
    slug = period.removeprefix("copy_of_")
    return slug.startswith(MODERN_PREFIXES)


def _uncertain(value: str | None) -> bool:
    return value in {"uncertain", "doubtful", "false"}


def _period(attestations: list[dict]) -> str | None:
    for attestation in attestations:
        if not _uncertain(attestation.get("confidence")) and attestation.get("timePeriod"):
            return attestation["timePeriod"]
    return None


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dump", type=Path, required=True)
    parser.add_argument("--geojson", type=Path, required=True)
    parser.add_argument("--curated", type=Path, required=True)
    parser.add_argument("--meta", type=Path, required=True)
    args = parser.parse_args()
    counts = build(args.dump, args.geojson, args.curated, args.meta)
    print(json.dumps(counts, indent=2))


def build(dump: Path, geojson_path: Path, curated_path: Path, meta_path: Path) -> dict:
    places = []
    for raw in iter_places(dump):
        place = place_from_dump(raw)
        if place is not None:
            places.append(place)
    features = json.loads(geojson_path.read_text())["features"]
    curated_payload = json.loads(curated_path.read_text())
    counts = apply_places(places, features, curated_payload["features"])
    digest = hashlib.sha256(dump.read_bytes()).hexdigest()
    write_catalog(features, meta_path, counts, digest)
    curated_path.write_text(json.dumps(curated_payload, indent=2) + "\n")
    return counts


if __name__ == "__main__":
    main()
