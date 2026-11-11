"""Choose a local UTM zone from a longitude and latitude."""

from __future__ import annotations


def utm_epsg(longitude: float, latitude: float) -> int:
    if not -180.0 <= longitude <= 180.0 or not -90.0 <= latitude <= 90.0:
        raise ValueError("longitude and latitude are outside the geographic range")
    zone = int((longitude + 180.0) // 6.0) + 1
    zone = min(max(zone, 1), 60)
    hemisphere = 32600 if latitude >= 0.0 else 32700
    return hemisphere + zone


def epsg_code(epsg: int) -> str:
    return f"EPSG:{epsg}"
