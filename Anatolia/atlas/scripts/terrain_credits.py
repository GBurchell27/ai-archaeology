"""Attribution strings for the atlas terrain layers.

The national overview stays on Copernicus. Place relief defaults to GEM-15.
"""

from __future__ import annotations

GEM15_ATTRIBUTION = "This dataset is produced by Google"

GEM15_CREDIT = (
    "GEM-15 surface model (DSM), 15 m. This dataset is produced by Google. "
    "CC BY 4.0. Batchu, Neumann, Li, Allen, Zhang, and Van Arsdale (2026), "
    "GEM-15: Global surface and terrain elevation models (15 meters) from "
    "sub-meter optical stereo imagery, EarthArXiv preprint "
    "https://doi.org/10.31223/X55N75. Experimental and under review, not lidar. "
    "The bare-earth DTM is a neural network trained on US elevation data and is "
    "not this layer: it lowers some occupied mounds. Masked cells, including "
    "water, are filled from Copernicus DEM GLO-30."
)

GEM15_FOOTER = (
    "Place relief: GEM-15 DSM, 15 m. This dataset is produced by Google. "
    "CC BY 4.0. Batchu et al. 2026, EarthArXiv https://doi.org/10.31223/X55N75 "
    "(experimental preprint). Voids filled from Copernicus GLO-30."
)
