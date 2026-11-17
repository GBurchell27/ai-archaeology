"""Convert a trained Gaussian-splat .ply into the 32-byte-per-splat .splat file the walk view reads.

No network. Reads the standard 3D Gaussian Splatting vertex layout (x y z, f_dc_0..2, opacity,
scale_0..2, rot_0..3; higher spherical-harmonic bands are dropped, so colour is view-independent).

    python scripts/splat/ply_to_splat.py data/splat/gobekli-tepe/export.ply \
        Anatolia/atlas/public/splats/gobekli-tepe.splat
    python scripts/splat/ply_to_splat.py --self-check
"""

from __future__ import annotations

import io
import sys
from pathlib import Path
from typing import BinaryIO

import numpy as np

PLY_SCALAR_TYPES = {
    "float": "f4", "float32": "f4", "double": "f8", "float64": "f8",
    "uchar": "u1", "uint8": "u1", "char": "i1", "int8": "i1",
    "short": "i2", "int16": "i2", "ushort": "u2", "uint16": "u2",
    "int": "i4", "int32": "i4", "uint": "u4", "uint32": "u4",
}
REQUIRED_FIELDS = (
    "x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity",
    "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3",
)
SPLAT_RECORD = np.dtype([("position", "<f4", 3), ("scale", "<f4", 3), ("rgba", "u1", 4), ("rotation", "u1", 4)])
# Zeroth spherical-harmonic basis constant: colour = 0.5 + SH_C0 * f_dc.
SH_C0 = 0.28209479177387814


def read_ply_vertices(stream: BinaryIO) -> np.ndarray:
    """Parse a binary little-endian PLY whose first element is the splat vertices."""
    if stream.readline().strip() != b"ply":
        raise ValueError("not a PLY file")
    vertex_count: int | None = None
    fields: list[tuple[str, str]] = []
    in_vertex_element = False
    for raw_line in iter(stream.readline, b""):
        words = raw_line.decode("ascii").split()
        if words == ["end_header"]:
            break
        if words[:1] == ["format"] and words[1] != "binary_little_endian":
            raise ValueError(f"unsupported PLY format {words[1]}")
        if words[:1] == ["element"]:
            in_vertex_element = words[1] == "vertex"
            if in_vertex_element:
                vertex_count = int(words[2])
        elif words[:1] == ["property"] and in_vertex_element:
            if words[1] == "list":
                raise ValueError("list properties on vertices are not supported")
            fields.append((words[2], "<" + PLY_SCALAR_TYPES[words[1]]))
    else:
        raise ValueError("PLY header never ended")
    if vertex_count is None:
        raise ValueError("PLY has no vertex element")
    missing = [name for name in REQUIRED_FIELDS if name not in dict(fields)]
    if missing:
        raise ValueError(f"PLY is not a Gaussian splat, missing {missing}")
    vertex_type = np.dtype(fields)
    vertices = np.frombuffer(stream.read(vertex_count * vertex_type.itemsize), dtype=vertex_type)
    if len(vertices) != vertex_count:
        raise ValueError(f"PLY is truncated: {len(vertices)} of {vertex_count} splats")
    return vertices


def columns(vertices: np.ndarray, names: tuple[str, ...]) -> np.ndarray:
    return np.stack([vertices[name].astype(np.float64) for name in names], axis=1)


def splat_records(vertices: np.ndarray) -> np.ndarray:
    """Activate the trained parameters and order the splats biggest and most opaque first."""
    scales = np.exp(columns(vertices, ("scale_0", "scale_1", "scale_2")))
    alpha = 1.0 / (1.0 + np.exp(-vertices["opacity"].astype(np.float64)))
    colour = 0.5 + SH_C0 * columns(vertices, ("f_dc_0", "f_dc_1", "f_dc_2"))
    rotation = columns(vertices, ("rot_0", "rot_1", "rot_2", "rot_3"))
    rotation /= np.linalg.norm(rotation, axis=1, keepdims=True)

    records = np.empty(len(vertices), dtype=SPLAT_RECORD)
    records["position"] = columns(vertices, ("x", "y", "z"))
    records["scale"] = scales
    records["rgba"] = np.clip(np.column_stack([colour, alpha]) * 255.0, 0, 255).round()
    records["rotation"] = np.clip(rotation * 128.0 + 128.0, 0, 255).round()
    # The viewer streams the file, so the splats that matter most arrive first.
    importance = scales.prod(axis=1) * alpha
    return records[np.argsort(-importance, kind="stable")]


def convert(ply_path: Path, splat_path: Path) -> int:
    with ply_path.open("rb") as stream:
        records = splat_records(read_ply_vertices(stream))
    splat_path.parent.mkdir(parents=True, exist_ok=True)
    splat_path.write_bytes(records.tobytes())
    return len(records)


def self_check() -> None:
    vertex_type = np.dtype([(name, "<f4") for name in (*REQUIRED_FIELDS, "f_rest_0")])
    vertices = np.zeros(2, dtype=vertex_type)
    vertices["x"] = [1.0, 2.0]
    vertices["rot_0"] = 2.0  # unnormalised identity quaternion
    vertices["f_dc_0"] = [0.0, 10.0]
    vertices["scale_0"] = [0.0, 3.0]  # the second splat is larger, so it must come first
    header = "ply\nformat binary_little_endian 1.0\nelement vertex 2\n"
    header += "".join(f"property float {name}\n" for name in vertex_type.names) + "end_header\n"
    records = splat_records(read_ply_vertices(io.BytesIO(header.encode("ascii") + vertices.tobytes())))

    assert records.itemsize == 32 and len(records.tobytes()) == 64
    assert records["position"][:, 0].tolist() == [2.0, 1.0], "largest splat first"
    assert np.allclose(records["scale"][0], [np.exp(3.0), 1.0, 1.0])
    assert records["rgba"][1].tolist() == [128, 128, 128, 128], "zero colour is mid grey, zero opacity is half"
    assert records["rgba"][0, 0] == 255, "colour is clamped"
    assert records["rotation"][0].tolist() == [255, 128, 128, 128], "quaternion is normalised, w first"
    print('{"ok": true}')


def main(arguments: list[str]) -> int:
    if arguments == ["--self-check"]:
        self_check()
        return 0
    if len(arguments) != 2:
        print(__doc__)
        return 2
    count = convert(Path(arguments[0]), Path(arguments[1]))
    print(f"wrote {count:,} splats ({count * SPLAT_RECORD.itemsize / 1e6:.1f} MB) to {arguments[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
