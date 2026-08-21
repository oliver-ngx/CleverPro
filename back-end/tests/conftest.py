"""
Shared fixtures.

The API tests build an application with ``seed=False`` and their own store, so
each one starts from a project it built itself rather than from the demo
fixture. Tests that assert on counts are then reading their own history
instead of the seed's, which means changing the seed cannot break them.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# The package under test lives one directory up, which is also where uvicorn is
# run from. Added explicitly so `pytest` works from the repo root too.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.dependencies import get_store
from app.main import create_app
from app.store import ProjectStore
from core import Attachment, Project, Role

OWNER = "Ada"
MAINTAINER = "Bo"
CONTRIBUTOR = "Cy"


def snapshot(files: dict[str, str]) -> Attachment:
    """A whole-tree attachment — the kind a folder pick or a version ref produces."""
    return Attachment(folder_ref="tree", tree_snapshot=dict(files))


def loose(**files: str) -> Attachment:
    """
    A loose-file attachment. Keyword names cannot contain slashes, so this is
    for flat paths; nested ones build an Attachment directly.
    """
    return Attachment(loose_files=list(files), file_contents=dict(files))


@pytest.fixture
def project() -> Project:
    """A three-member project with nothing pushed to it yet."""
    p = Project(owner_name=OWNER, name="Orchid Lab")
    p.invite_member(actor=OWNER, new_member=MAINTAINER, role=Role.MAINTAINER)
    p.invite_member(actor=OWNER, new_member=CONTRIBUTOR, role=Role.CONTRIBUTOR)
    return p


@pytest.fixture
def tree() -> dict[str, str]:
    return {
        "README.md": "# Orchid Lab\n",
        "src/app.py": "print(1)\n",
    }


@pytest.fixture
def store() -> ProjectStore:
    return ProjectStore()


@pytest.fixture
def client(store: ProjectStore, project: Project) -> TestClient:
    """An unseeded application holding exactly one project, at "proj_test"."""
    store.put("proj_test", project)
    app = create_app(seed=False)
    app.dependency_overrides[get_store] = lambda: store
    return TestClient(app)
