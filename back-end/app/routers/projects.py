"""
The project itself: creating one, its Main-screen overview, and the JSON
export/import pair.
"""

from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..config import settings
from ..dependencies import ProjectDep, StoreDep
from ..schemas import CreateProjectRequest, StringSettingRequest

router = APIRouter(tags=["project"])


@router.post("/projects")
def create_project(body: CreateProjectRequest, store: StoreDep) -> dict[str, Any]:
    project_id, project = store.create(owner_name=body.owner_name, name=body.name)
    return {"project_id": project_id, "owner": body.owner_name, "name": project.name}


@router.get("/projects/{project_id}/overview")
def project_overview(project: ProjectDep) -> dict[str, Any]:
    """Main screen's top card: preview, project name and version, deploy URL, branches."""
    return project.overview()


@router.post("/projects/{project_id}/rename")
def rename_project(project: ProjectDep, body: StringSettingRequest) -> dict[str, Any]:
    project.rename_project(actor=body.actor, new_name=body.value)
    return project.overview()


@router.get("/projects/{project_id}/export")
def export_project(project: ProjectDep, project_id: str, actor: str) -> JSONResponse:
    """
    Download the project as JSON.

    Named `actor` in the query string because this is a read and reads in this
    API carry no body. Who may ask, and what they get back, is
    `Project.export_snapshot` — this route is the header and nothing else.
    """
    return JSONResponse(
        content=project.export_snapshot(actor),
        headers={"Content-Disposition": f'attachment; filename="{project_id}_export.json"'},
    )


@router.post("/import")
async def import_json_file(file: Annotated[UploadFile, File()]) -> dict[str, Any]:
    """
    Inspect an uploaded JSON file and report its top-level keys.

    Three things are checked before the body is parsed, and each was a real
    failure mode: a missing filename used to raise AttributeError and surface
    as a 500 rather than a 422; an unbounded `read()` on a public endpoint is
    a way to exhaust the process's memory with one request; and a JSON
    document that is not an object has no keys to list.
    """
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=422, detail="Expected a .json file")
    if file.size is not None and file.size > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File is larger than the {settings.max_upload_bytes}-byte limit.",
        )

    contents = await file.read(settings.max_upload_bytes + 1)
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File is larger than the {settings.max_upload_bytes}-byte limit.",
        )
    try:
        data = json.loads(contents)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail="Expected a JSON object at the top level.")
    return {"filename": file.filename, "top_level_keys": list(data)}
