"""Download the small registered windows, standardise them, train, and transfer.

Raw rasters and inventory points are written under data/cross_region/, which
is gitignored. The shareable metrics report goes to outputs/cross_region/.
A candidate is not a discovery.

    python scripts/run_cross_region_smoke.py
"""

from ai_archaeology.pipeline.smoke import main

if __name__ == "__main__":
    raise SystemExit(main())
