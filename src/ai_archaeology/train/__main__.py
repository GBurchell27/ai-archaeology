"""``python -m ai_archaeology.train`` runs the same small end-to-end check.

Training is refused on frozen blocks inside that run.
"""

from ai_archaeology.pipeline.smoke import main

raise SystemExit(main())
