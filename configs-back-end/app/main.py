"""
The Configs API, assembled.

Deliberately one route long. Configs is a mockup at this point — the client
opens a blank window and asks nothing of any server — so this says what the
service *is* and refuses to guess at endpoints for behaviour that has not been
designed. A health check is the honest minimum: it makes the process runnable
and provable, and nothing more.

`create_app()` rather than a module-level application for the same reason the
Compiler API does it: a test should be able to build a clean one.
"""

from __future__ import annotations

from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(
        title="Cseudocode Configs API",
        version="0.0.0",
        summary="The server half of Configs. Not yet in use.",
    )

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
