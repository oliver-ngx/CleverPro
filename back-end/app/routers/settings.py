"""
The Settings screen, one route per row.

Each write returns the whole settings object rather than an acknowledgement,
so the client re-renders from what the server now holds instead of from what
it assumed the write would do. Two rows are exceptions and say why inline.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from core import Role

from ..dependencies import ProjectDep
from ..schemas import (
    ActorRequest,
    BoolSettingRequest,
    RoleUpdateRequest,
    StringSettingRequest,
    TargetMemberRequest,
)

router = APIRouter(prefix="/projects/{project_id}/settings", tags=["settings"])


@router.get("")
def get_settings(project: ProjectDep) -> dict[str, Any]:
    return project.get_settings()


@router.post("/link")
def set_link_access(project: ProjectDep, body: BoolSettingRequest) -> dict[str, Any]:
    project.set_anyone_with_link(actor=body.actor, enabled=body.enabled)
    return project.get_settings()


@router.post("/regenerate-invite")
def regenerate_invite(project: ProjectDep, body: ActorRequest) -> dict[str, str]:
    # Returns the token alone: it is the one field a caller needs immediately,
    # and echoing the whole settings object would put a fresh credential into
    # any log that records response bodies.
    return {"invite_token": project.regenerate_invite_link(actor=body.actor)}


@router.post("/default-invite-role")
def set_default_invite_role(project: ProjectDep, body: RoleUpdateRequest) -> dict[str, Any]:
    project.set_default_invite_role(actor=body.actor, role=Role(body.role))
    return project.get_settings()


@router.post("/branches")
def set_branches_setting(project: ProjectDep, body: BoolSettingRequest) -> dict[str, Any]:
    """The feature-level Branches toggle. Turning it off refuses new branches;
    it does not delete existing ones."""
    project.set_branches_enabled(actor=body.actor, enabled=body.enabled)
    return project.get_settings()


@router.post("/branch-creation-authority")
def set_branch_creation_authority(
    project: ProjectDep, body: BoolSettingRequest
) -> dict[str, Any]:
    """Who may create a branch — the one capability an Owner can move between tiers."""
    project.set_branch_creation_authority(
        actor=body.actor, open_to_contributors=body.enabled
    )
    return project.get_settings()


@router.post("/visibility")
def set_visibility(project: ProjectDep, body: StringSettingRequest) -> dict[str, Any]:
    project.set_production_visibility(actor=body.actor, visibility=body.value)
    return project.get_settings()


@router.post("/custom-domain")
def set_custom_domain(project: ProjectDep, body: StringSettingRequest) -> dict[str, Any]:
    project.set_custom_domain(actor=body.actor, domain=body.value)
    return project.get_settings()


@router.post("/transfer-owner")
def transfer_owner(project: ProjectDep, body: TargetMemberRequest) -> dict[str, Any]:
    project.transfer_ownership(actor=body.actor, new_owner=body.target)
    return project.get_settings()


@router.post("/delete")
def delete_project(project: ProjectDep, body: ActorRequest) -> dict[str, bool]:
    # Every route on this project answers 404 from here on, so there is no
    # settings object left to return.
    project.delete_project(actor=body.actor)
    return {"deleted": True}
