"""Refuse to write rasters or inventories into a tracked path."""

from __future__ import annotations

from pathlib import Path


def assert_untracked_product(path: Path, repo_root: Path) -> None:
    resolved = path.resolve()
    allowed_roots = (
        (repo_root / "data").resolve(),
        (repo_root / "outputs").resolve(),
        (Path.home() / ".ai-archaeology").resolve(),
    )
    if any(_is_relative_to(resolved, root) for root in allowed_roots):
        return
    raise ValueError(
        f"{resolved} is outside data/, outputs/, and ~/.ai-archaeology"
    )


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True
