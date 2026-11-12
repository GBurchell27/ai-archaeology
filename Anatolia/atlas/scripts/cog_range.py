"""Read one window from a tiled GeoTIFF by HTTP Range, not the whole file.

Copernicus GLO-30 COGs are little-endian, deflate-compressed, float32, with the
floating-point predictor. A 10 km window is a few 1024 px tiles, not the 1° file.
"""

from __future__ import annotations

import math
import struct
import zlib

import numpy as np

MAX_COG_BYTES = 12 * 1024 * 1024


def read_window(fetch, west: float, south: float, east: float, north: float, max_bytes: int = MAX_COG_BYTES):
    """Return (array, affine tuple) covering the lon/lat box.

    `fetch(start, end)` returns those inclusive file bytes. The total returned
    by fetch is kept under `max_bytes`.
    `affine` is (scale_x, origin_x, scale_y, origin_y) for the upper-left
    corner of the returned array. Row scale is positive degrees, southward.
    """
    used = 0

    def take(start: int, end: int) -> bytes:
        nonlocal used
        size = end - start + 1
        if size <= 0 or used + size > max_bytes:
            raise RuntimeError("download exceeded the byte cap")
        body = fetch(start, end)
        if len(body) != size:
            raise RuntimeError("download exceeded the byte cap")
        used += size
        return body

    header = take(0, 7)
    if header[:2] != b"II" or header[2:4] != b"*\x00":
        raise RuntimeError("unsupported GeoTIFF layout")
    ifd_at = struct.unpack_from("<I", header, 4)[0]
    count = struct.unpack_from("<H", take(ifd_at, ifd_at + 1), 0)[0]
    if count < 1 or count > 64:
        raise RuntimeError("unsupported GeoTIFF layout")
    entries = take(ifd_at + 2, ifd_at + 2 + count * 12 - 1)
    tags: dict[int, tuple[int, int, int]] = {}
    for index in range(count):
        tag, kind, number, inline = struct.unpack_from("<HHII", entries, index * 12)
        tags[tag] = (kind, number, inline)

    def values(tag: int):
        kind, number, inline = tags[tag]
        size = {3: 2, 4: 4, 12: 8}[kind]
        fmt = {3: "H", 4: "I", 12: "d"}[kind]
        total = size * number
        if total <= 4:
            raw = struct.pack("<I", inline)[:total]
        else:
            raw = take(inline, inline + total - 1)
        return struct.unpack("<" + fmt * number, raw)

    width = int(values(256)[0])
    height = int(values(257)[0])
    if int(values(258)[0]) != 32 or int(values(259)[0]) not in {1, 8}:
        raise RuntimeError("unsupported GeoTIFF layout")
    if int(values(339)[0]) != 3:
        raise RuntimeError("unsupported GeoTIFF layout")
    compression = int(values(259)[0])
    predictor = int(values(317)[0]) if 317 in tags else 1
    tile_width = int(values(322)[0])
    tile_height = int(values(323)[0])
    offsets = [int(item) for item in values(324)]
    counts = [int(item) for item in values(325)]
    scale_x, scale_y, _scale_z = values(33550)
    _i, _j, _k, tie_x, tie_y, _z = values(33922)
    origin_x = float(tie_x)
    origin_y = float(tie_y)
    scale_x = float(scale_x)
    scale_y = abs(float(scale_y))
    if scale_x <= 0 or scale_y <= 0:
        raise RuntimeError("unsupported GeoTIFF layout")

    col0 = max(0, math.floor((west - origin_x) / scale_x))
    col1 = min(width, math.ceil((east - origin_x) / scale_x))
    row0 = max(0, math.floor((origin_y - north) / scale_y))
    row1 = min(height, math.ceil((origin_y - south) / scale_y))
    if col1 <= col0 or row1 <= row0:
        return None
    across = math.ceil(width / tile_width)
    output = np.full((row1 - row0, col1 - col0), np.nan, dtype=np.float32)
    for tile_row in range(row0 // tile_height, (row1 - 1) // tile_height + 1):
        for tile_col in range(col0 // tile_width, (col1 - 1) // tile_width + 1):
            index = tile_row * across + tile_col
            start = offsets[index]
            size = counts[index]
            tile = _decode_tile(take(start, start + size - 1), tile_width, tile_height, compression, predictor)
            image_left = tile_col * tile_width
            image_top = tile_row * tile_height
            src_c0 = max(col0, image_left) - image_left
            src_r0 = max(row0, image_top) - image_top
            src_c1 = min(col1, image_left + tile_width, width) - image_left
            src_r1 = min(row1, image_top + tile_height, height) - image_top
            dst_c0 = image_left + src_c0 - col0
            dst_r0 = image_top + src_r0 - row0
            output[dst_r0:dst_r0 + (src_r1 - src_r0), dst_c0:dst_c0 + (src_c1 - src_c0)] = tile[src_r0:src_r1, src_c0:src_c1]
    return output, (scale_x, origin_x + col0 * scale_x, scale_y, origin_y - row0 * scale_y)


def _decode_tile(payload: bytes, width: int, height: int, compression: int, predictor: int) -> np.ndarray:
    raw = payload if compression == 1 else zlib.decompress(payload)
    expected = width * height * 4
    if len(raw) != expected or predictor not in {1, 3}:
        raise RuntimeError("unsupported GeoTIFF layout")
    if predictor == 1:
        return np.frombuffer(raw, dtype="<f4").reshape(height, width).copy()
    rows = np.frombuffer(raw, dtype=np.uint8).copy().reshape(height, width * 4)
    accumulated = np.cumsum(rows, axis=1, dtype=np.uint8).reshape(height, 4, width)
    ordered = np.empty((height, width, 4), dtype=np.uint8)
    ordered[:, :, 0] = accumulated[:, 3, :]
    ordered[:, :, 1] = accumulated[:, 2, :]
    ordered[:, :, 2] = accumulated[:, 1, :]
    ordered[:, :, 3] = accumulated[:, 0, :]
    return ordered.view("<f4").reshape(height, width)
