"""Build ASF catalogue queries and screen Sentinel-1 Level-1 SLC metadata."""

import json
from datetime import date, datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ASF_SEARCH_URL = "https://api.daac.asf.alaska.edu/services/search/param"
DATASET = "SENTINEL-1"
PRODUCT = "SLC"
MODES = ("IW", "EW", "S1", "S2", "S3", "S4", "S5", "S6")
POLARIZATIONS = ("HH", "VV", "HH+HV", "VV+VH")
DIRECTIONS = ("ASCENDING", "DESCENDING")

# Coarse search footprint for the published Giza pyramid fields (UNESCO 86-002).
PUBLISHED_SITES = {
    "khufu": "POLYGON((31.1 29.9,31.2 29.9,31.2 30.0,31.1 30.0,31.1 29.9))",
}


def catalogue_plan(
    site_id: str,
    start: date,
    end: date,
    mode: str,
    polarization: str | None,
    direction: str | None,
    incidence_range_deg: tuple[float, float] | None,
    limit: int,
) -> dict:
    params = {
        "dataset": DATASET,
        "processingLevel": PRODUCT,
        "intersectsWith": PUBLISHED_SITES[site_id],
        "start": f"{start.isoformat()}T00:00:00Z",
        "end": f"{end.isoformat()}T23:59:59.999999Z",
        "beamMode": mode,
        "maxResults": limit,
        "output": "geojson",
    }
    if polarization:
        params["polarization"] = polarization
    if direction:
        params["flightDirection"] = direction
    return {
        "schema_version": 1,
        "site_id": site_id,
        "catalogue_endpoint": ASF_SEARCH_URL,
        "catalogue_parameters": params,
        "catalogue_incidence_range_deg": incidence_range_deg,
    }


def _acquisition_day(timestamp: object) -> date | None:
    if not isinstance(timestamp, str) or "T" not in timestamp:
        return None
    try:
        value = datetime.fromisoformat(timestamp)
    except ValueError:
        return None
    if value.tzinfo is None:
        return None
    return value.astimezone(timezone.utc).date()


def _incidence_deg(value: object) -> float | None:
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return None
    try:
        angle = float(value)
    except (ValueError, OverflowError):
        return None
    return angle if 0 < angle < 90 else None


def _screen_feature(feature: object, plan: dict) -> tuple[dict, str | None]:
    params = plan["catalogue_parameters"]
    if not isinstance(feature, dict) or feature.get("type") != "Feature":
        return {}, "invalid GeoJSON feature"
    properties = feature.get("properties")
    if not isinstance(properties, dict):
        return {}, "missing catalogue properties"

    scene_id = properties.get("fileID")
    if not isinstance(scene_id, str) or not scene_id.strip():
        return {}, "missing ASF product identifier (fileID)"
    scene = {"scene_id": scene_id}
    fields = {
        "platform": "platform",
        "product_type": "processingLevel",
        "start_time": "startTime",
        "mode": "beamModeType",
        "polarization": "polarization",
        "orbit_direction": "flightDirection",
    }
    for output_field, catalogue_field in fields.items():
        value = properties.get(catalogue_field)
        if not isinstance(value, str) or not value.strip():
            return scene, f"missing or invalid {catalogue_field}"
        scene[output_field] = value

    if scene["product_type"] != PRODUCT:
        return scene, "Level-1 SLC is required for complex phase analysis"
    if scene["platform"] not in ("Sentinel-1A", "Sentinel-1B", "Sentinel-1C", "Sentinel-1D"):
        return scene, "unsupported Sentinel-1 platform"
    day = _acquisition_day(scene["start_time"])
    if day is None:
        return scene, "invalid acquisition timestamp"
    if not params["start"][:10] <= day.isoformat() <= params["end"][:10]:
        return scene, "acquisition start is outside the requested UTC dates"
    if scene["mode"] != params["beamMode"]:
        return scene, "acquisition mode does not match the request"
    if scene["polarization"] not in POLARIZATIONS:
        return scene, "unsupported polarization"
    if scene["orbit_direction"] not in DIRECTIONS:
        return scene, "invalid orbit direction"
    for param, field in (("polarization", "polarization"), ("flightDirection", "orbit_direction")):
        if param in params and params[param] != scene[field]:
            return scene, f"{field} does not match the request"

    angle = _incidence_deg(properties.get("incidenceAngle"))
    scene["catalogue_incidence_deg"] = angle
    scene["processing_version"] = properties.get("pgeVersion")
    incidence_range = plan["catalogue_incidence_range_deg"]
    if incidence_range is not None:
        if angle is None:
            return scene, "catalogue incidence angle is unavailable or invalid"
        if not incidence_range[0] <= angle <= incidence_range[1]:
            return scene, "catalogue incidence angle is outside the requested range"
    return scene, None


def search_catalogue(plan: dict) -> dict:
    """Fetch GeoJSON from the fixed ASF endpoint and return selected metadata."""
    params = plan["catalogue_parameters"]
    request = Request(
        f"{ASF_SEARCH_URL}?{urlencode(params)}",
        headers={"Accept": "application/geo+json, application/json"},
    )
    with urlopen(request, timeout=30) as response:
        document = json.load(response)
    if (
        not isinstance(document, dict)
        or document.get("type") != "FeatureCollection"
        or not isinstance(document.get("features"), list)
    ):
        raise ValueError("expected an ASF GeoJSON FeatureCollection")

    features = document["features"]
    matches = []
    rejected = []
    for index, feature in enumerate(features):
        scene, reason = _screen_feature(feature, plan)
        if reason is None:
            matches.append(scene)
        else:
            rejected.append({"index": index, "scene_id": scene.get("scene_id"), "reason": reason})
    return {
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "records_received": len(features),
        "catalogue_limit_reached": len(features) >= params["maxResults"],
        "matches": matches,
        "rejected": rejected,
    }
