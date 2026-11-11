"""Standardise terrain rasters from different public sources.

The products are local elevation models and relief layers. They are not
detections, and a mound in a relief layer is not a site.
"""

from ai_archaeology.ingest.schema import TerrainMetadata

__all__ = ["TerrainMetadata"]
