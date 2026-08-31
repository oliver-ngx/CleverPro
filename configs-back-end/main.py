"""
Entry point: `uvicorn main:app --reload --port 8100` from the `configs-back-end`
directory.

The same shape as `back-end/main.py`, and a separate process from it. Configs
needs a server of its own eventually — the bridge that opens a file, resolves a
node at a source location and writes the change back — and that server has
nothing to do with commits, versions or releases. Keeping them apart from the
first line is cheaper than separating them later.

Nothing calls this yet. It answers /health and that is all it claims to do.
"""

from app.main import app

__all__ = ["app"]
