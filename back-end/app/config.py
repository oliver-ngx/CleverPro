"""
Everything that differs between a laptop and a deployment, read once at import.

The old code hardcoded the CORS origins and the demo project's id in the
middle of the route file, which meant that running the API anywhere other than
one developer's machine required editing source. These are the same defaults,
moved somewhere they can be overridden by the environment without a diff.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _origins() -> list[str]:
    raw = os.getenv("CLEVERPRO_CORS_ORIGINS", "")
    if not raw.strip():
        # The Vite dev server, on both spellings of loopback. Windows resolves
        # `localhost` to ::1 while a default uvicorn binds IPv4 only, so a
        # single spelling is not enough to cover one machine.
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    """
    Read from the environment, with the development defaults inline.

    The limits are not tuning knobs so much as the line between a project and
    a disk image. This store keeps every version's full content in memory, so
    an unbounded push is an unbounded allocation: without a ceiling, one
    request can exhaust the process. They are enforced in `schemas.py`, where
    a violation becomes a 422 before any of it is copied anywhere.
    """

    # The project the frontend opens into. The design has no project picker
    # and no create flow, so without a seeded project under a known id every
    # screen renders a 404 on a cold start. Mirrored in front-end/src/config.ts.
    demo_project_id: str = os.getenv("CLEVERPRO_DEMO_PROJECT_ID", "proj_1")
    seed_demo_project: bool = os.getenv("CLEVERPRO_SEED", "1") != "0"

    cors_origins: list[str] = field(default_factory=_origins)

    # Attachment ceilings, matching front-end/src/lib/folder.ts so the browser
    # refuses the same folder the server would.
    max_tree_files: int = int(os.getenv("CLEVERPRO_MAX_TREE_FILES", "2000"))
    max_file_chars: int = int(os.getenv("CLEVERPRO_MAX_FILE_CHARS", str(256 * 1024)))
    max_total_chars: int = int(os.getenv("CLEVERPRO_MAX_TOTAL_CHARS", str(8 * 1024 * 1024)))

    # The import endpoint reads its whole body into memory before parsing, so
    # it needs a ceiling of its own.
    max_upload_bytes: int = int(os.getenv("CLEVERPRO_MAX_UPLOAD_BYTES", str(2 * 1024 * 1024)))


settings = Settings()
