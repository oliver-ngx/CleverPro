"""
What every route needs before it can do anything: the store, the project, and
an attachment assembled from a request body.

These are FastAPI dependencies rather than plain functions so that the store
is injected rather than imported. A test builds its own store, overrides
`get_store`, and gets an application with no demo data in it — without the
routes knowing that a different store exists.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Path

from core import Attachment, Project

from .schemas import AttachmentBody
from .store import ProjectStore

# One store per process. Replaced wholesale in tests via dependency_overrides,
# which is why nothing imports this name directly.
_store = ProjectStore()


def get_store() -> ProjectStore:
    return _store


def get_project(
    project_id: Annotated[str, Path(max_length=128)],
    store: Annotated[ProjectStore, Depends(get_store)],
) -> Project:
    """
    Resolve the project in the path, or 404.

    A deleted project is absent rather than forbidden — see `ProjectStore.get`
    for why the two cases are collapsed.
    """
    project = store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="No such project")
    return project


ProjectDep = Annotated[Project, Depends(get_project)]
StoreDep = Annotated[ProjectStore, Depends(get_store)]


def build_attachment(project: Project, body: AttachmentBody) -> Attachment:
    """
    Turn a Commit/Push body into an Attachment — one place, not four.

    `version_ref` names one whole version of the target branch, which is the
    other half of the attachment model: files, or a version reference. Only
    the server holds that version's bytes, so it is resolved into a real
    snapshot here rather than uploaded by a browser that cannot read them.

    Sending a `version_ref` *and* loose files is allowed, and is precisely the
    mixed bundle the Push-validity rule exists for: `commit()` accepts it and
    records both halves, `push()` refuses it. The composer disables Push
    before it gets that far, but the rule is enforced at both ends rather than
    trusted at one.
    """
    folder_ref = body.folder_ref
    snapshot = body.tree_snapshot
    if body.version_ref:
        # Raises KeyError -> 404 if the label names no version on this branch.
        snapshot = project.files_at_version(body.branch, body.version_ref)
        folder_ref = f"{body.branch}@{body.version_ref}"
    return Attachment(
        folder_ref=folder_ref,
        loose_files=body.loose_files,
        file_contents=body.file_contents,
        tree_snapshot=snapshot,
    )
