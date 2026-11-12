"""Close-up files stay in a real directory and are replaced atomically."""

from __future__ import annotations

import os
import stat
import tempfile
from pathlib import Path


def assert_real_directory(directory: Path) -> None:
    info = directory.lstat()
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
        raise RuntimeError("close-up directory is not a real directory")


def regular_file(path: Path) -> bool:
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    return stat.S_ISREG(info.st_mode) and not stat.S_ISLNK(info.st_mode)


def atomic_produce(path: Path, produce) -> None:
    """Write via a temp file in the same directory, then rename into place.

    A symlink at `path` is left untouched. The parent must be a real directory,
    so the temp file cannot be created through a linked folder.
    """
    assert_real_directory(path.parent)
    if path.is_symlink():
        raise RuntimeError("refusing to write through a symlink")
    descriptor, name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=path.suffix or ".tmp")
    os.close(descriptor)
    temporary = Path(name)
    try:
        os.chmod(temporary, 0o600)
        produce(temporary)
        os.replace(temporary, path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
