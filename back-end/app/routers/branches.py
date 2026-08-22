"""
Lines of development, and the file trees hanging off them.

Every tree endpoint returns real content rather than labels: a version is a
snapshot, so any of them can be opened, and that is what makes the Archive
shelf inspectable rather than decorative.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Path, Query

from ..dependencies import ProjectDep
from ..schemas import AddBranchRequest

router = APIRouter(prefix="/projects/{project_id}", tags=["branches"])

BranchPath = Annotated[str, Path(min_length=1, max_length=200)]
VersionPath = Annotated[str, Path(min_length=1, max_length=200)]


@router.post("/branches")
def add_branch(project: ProjectDep, body: AddBranchRequest) -> dict[str, Any]:
    """
    Create a branch, seeded from Main's current snapshot.

    The name comes back in the response rather than being assumed by the
    caller, because a blank name is legal and the server is what names the
    branch in that case.
    """
    members = set(body.team) if body.team is not None else None
    branch = project.create_branch(
        actor=body.actor,
        name=body.name or "",
        members=members,
        deploy_subdomain=body.deploy_subdomain,
        from_version=body.from_version,
    )
    return {
        "branch": branch.name,
        "members": sorted(branch.members),
        "deploy_subdomain": branch.deploy_subdomain,
        "seeded_from_main": bool(branch.current_files),
    }


@router.get("/branches")
def list_branches(project: ProjectDep) -> list[dict[str, Any]]:
    return [
        {
            "name": b.name,
            "is_main": b.is_main,
            "deploy_subdomain": b.deploy_subdomain,
            "members": sorted(b.members),
            "latest_version": b.head.version_label if b.head else None,
        }
        for b in project.branches.values()
    ]


@router.get("/branches/{branch_name}")
def get_branch(project: ProjectDep, branch_name: BranchPath) -> dict[str, Any]:
    return project.branch_view(branch_name)


@router.get("/branches/{branch_name}/versions")
def list_versions(project: ProjectDep, branch_name: BranchPath) -> list[dict[str, Any]]:
    """Every version of one line, newest first."""
    return project.version_history(branch_name)


@router.get("/branches/{branch_name}/files")
def branch_file_tree(project: ProjectDep, branch_name: BranchPath) -> list[dict[str, Any]]:
    """The Main surface's file tree — real content, nested."""
    return project.file_tree(branch_name)


@router.get("/branches/{branch_name}/versions/{version_label}/files")
def file_tree_at_version(
    project: ProjectDep, branch_name: BranchPath, version_label: VersionPath
) -> list[dict[str, Any]]:
    """
    A historical version's file tree, which proves every version stays
    retrievable rather than only the latest.
    """
    return project.file_tree_at_version(branch_name, version_label)


@router.get("/branches/{branch_name}/versions/{version_label}/files/content")
def file_content_at_version(
    project: ProjectDep,
    branch_name: BranchPath,
    version_label: VersionPath,
    path: Annotated[str, Query(min_length=1, max_length=1024)],
) -> dict[str, str]:
    """
    Raw content of one file at one historical version.

    The path is a query parameter rather than part of the route because it
    contains slashes; making it a path parameter would need a wildcard that
    could not be told apart from the segments around it.
    """
    return {
        "path": path,
        "version_label": version_label,
        "content": project.file_content_at_version(branch_name, version_label, path),
    }


@router.get("/production/files")
def production_file_tree(project: ProjectDep) -> list[dict[str, Any]]:
    """What is actually live right now — not Main's head, which may be ahead of it."""
    return project.production_file_tree()
