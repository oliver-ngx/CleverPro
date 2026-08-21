"""
Entry point: `uvicorn main:app --reload` from the `back-end` directory.

The application itself is assembled in `app/main.py`; this module exists so
that the command above keeps working and so that there is one obvious file to
open first. Everything below it splits two ways — `app/` is the HTTP layer and
`core/` is the domain, and the dependency only ever points from the first to
the second.
"""

from app.main import app

__all__ = ["app"]
