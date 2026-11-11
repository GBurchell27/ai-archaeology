"""Blind recall of published sites from terrain. Not a discovery tool."""

__all__ = ["load_catalog"]


def load_catalog():
    from ai_archaeology.eval.catalog import load_catalog as _load

    return _load()
