"""Terrain-source adapters.

Three adapters download a small window. The others describe an open dataset
and refuse to fetch until that dataset is part of a registered run.
"""

from ai_archaeology.ingest.adapters.copernicus_glo30 import CopernicusGlo30Adapter
from ai_archaeology.ingest.adapters.documented import DOCUMENTED_ADAPTERS
from ai_archaeology.ingest.adapters.ireland_gsi import IrelandGsiAdapter
from ai_archaeology.ingest.adapters.usgs_3dep import Usgs3depAdapter

ADAPTERS = {
    "usgs_3dep": Usgs3depAdapter(),
    "ireland_gsi": IrelandGsiAdapter(),
    "copernicus_glo30": CopernicusGlo30Adapter(),
    **DOCUMENTED_ADAPTERS,
}


def get_adapter(adapter_id: str):
    try:
        return ADAPTERS[adapter_id]
    except KeyError as exc:
        known = ", ".join(sorted(ADAPTERS))
        raise KeyError(f"unknown terrain adapter {adapter_id!r}; known: {known}") from exc
