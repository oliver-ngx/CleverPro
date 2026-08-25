"""
The application, assembled.

This file says what the API *is* — its middleware, its error translation, its
routers and its seed — and nothing about what any individual endpoint does.
Everything is behind `create_app()` rather than executed at import, so a test
can build a clean application with its own store instead of inheriting the
demo data that a module-level app would already have loaded.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .dependencies import get_store
from .errors import register_error_handlers
from .routers import routers


def create_app(seed: bool | None = None) -> FastAPI:
    app = FastAPI(
        title="Cseudocode Compiler API",
        version="1.0.0",
        summary="Commits, versions and releases for the Cseudocode client.",
    )

    # The dev setup proxies /api through Vite (see front-end/vite.config.ts),
    # which keeps the browser on one origin and avoids CORS entirely. This is
    # the belt to that pair of braces, so hitting the API directly — from a
    # second dev host, or from a deployed client on another origin — works too.
    #
    # Credentials are off because this API has none: identity travels in the
    # request body, not in a cookie. Leaving them on would be asking browsers
    # to attach ambient authority to requests nothing here reads.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Accept"],
    )

    register_error_handlers(app)

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    for router in routers:
        app.include_router(router)

    if seed if seed is not None else settings.seed_demo_project:
        _seed(app)

    return app


def _seed(app: FastAPI) -> None:
    """
    Install the demo project the Figma frames were drawn against.

    The frontend has no create-project flow — the design assumes a project is
    already open — so without this every screen renders a 404 on a cold start.
    Imported inside the function so that an application built with
    `seed=False` never pays for building it.
    """
    from seed import build_demo_project

    get_store().put(settings.demo_project_id, build_demo_project())


app = create_app()
