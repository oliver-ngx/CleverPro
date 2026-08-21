"""
Release, rollback, and the shelf they act on.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ..dependencies import ProjectDep
from ..schemas import DeployRequest

router = APIRouter(prefix="/projects/{project_id}", tags=["deploy"])


@router.post("/deploy")
def deploy(project: ProjectDep, body: DeployRequest) -> dict[str, str]:
    """Release a Main version to production. Defaults to Main's head."""
    record = project.deploy(actor=body.actor, version_label=body.version_label)
    return {"deploy_id": record.id, "version_label": record.version_label}


@router.post("/undo")
def undo(project: ProjectDep, body: DeployRequest) -> dict[str, str]:
    """
    The Archive row's action: make a published version the live one,
    immediately. Any version on Main's shelf qualifies, whether or not it has
    been live before — "Undo" is named for the direction it is usually
    travelled, not for a restriction.
    """
    record = project.undo(actor=body.actor, target_version_label=body.version_label)
    return {"deploy_id": record.id, "version_label": record.version_label}


@router.get("/archive")
def archive_surface(project: ProjectDep) -> list[dict[str, Any]]:
    """
    Every version ever pushed to Main, newest first, with "Applied" on the
    live one and "Undo" on every other row.
    """
    return project.archive_surface()


@router.get("/archive/deploy-log")
def deploy_log(project: ProjectDep) -> list[dict[str, Any]]:
    """
    The underlying deploy/undo audit trail — every actual release, distinct
    from the per-version view the Archive screen renders.
    """
    return project.archive_history()
