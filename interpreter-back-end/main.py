"""
Entry point: `uvicorn main:app --reload --port 8200` from the `interpreter-back-end`
directory.

The same shape as `back-end/main.py`, and a separate process from both it and
the Configs API. Interpreter's server is a different animal from either: an
append-only change log, a graph rebuilt from it, and three producers writing
into it. None of that belongs beside commits and releases.

Nothing calls this yet. It answers /health and that is all it claims to do.
"""

from app.main import app

__all__ = ["app"]
