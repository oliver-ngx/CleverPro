"""
The one place that decides what each domain failure becomes over HTTP.

This used to be a decorator applied by hand to each route, which meant a new
route was unprotected until somebody remembered it — and the ones that were
forgotten answered a refused permission with a 500. Registering the mapping on
the application instead makes it exhaustive by construction: a domain
exception raised anywhere, including from inside a dependency, lands here.

The status codes are load-bearing rather than decorative. The frontend
distinguishes them: 403 is a role the actor does not have, 422 an attachment
that does not resolve, 404 something that is not there.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core import PermissionError_, PushInvalidError


def _detail(exc: Exception) -> str:
    """
    FastAPI puts a human-readable reason in `detail`, and the frontend shows
    it verbatim — the API's own wording about why an action was refused is
    more useful than anything the client could invent.
    """
    return str(exc)


async def _permission(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detail": _detail(exc)})


async def _push_invalid(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": _detail(exc)})


async def _not_found(_: Request, exc: Exception) -> JSONResponse:
    # KeyError stringifies with its own quotes ("'No such branch: x'"), which
    # would reach the screen; str(exc.args[0]) is the message as written.
    message = str(exc.args[0]) if exc.args else "Not found"
    return JSONResponse(status_code=404, content={"detail": message})


async def _bad_request(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": _detail(exc)})


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(PermissionError_, _permission)
    app.add_exception_handler(PushInvalidError, _push_invalid)
    # A KeyError out of the domain always means "no such record" — branches,
    # commits, pushes and versions are all looked up by name or id.
    app.add_exception_handler(KeyError, _not_found)
    app.add_exception_handler(ValueError, _bad_request)
