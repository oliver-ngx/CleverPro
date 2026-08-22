"""
The roster, and the administration the product hangs off a person's own
profile rather than off a roster screen.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Path

from core import Role, build_file_tree

from ..dependencies import ProjectDep
from ..schemas import ActorRequest, InviteRequest

router = APIRouter(prefix="/projects/{project_id}/team", tags=["team"])

# Display names are the member key in this API, so they arrive URL-encoded and
# can contain spaces. Bounded so a path cannot be used to allocate.
MemberPath = Annotated[str, Path(min_length=1, max_length=200)]
BranchPath = Annotated[str, Path(min_length=1, max_length=200)]


@router.get("")
def get_team(project: ProjectDep) -> list[dict[str, str]]:
    return [{"name": m.name, "role": m.role.value} for m in project.team_view()]


@router.get("/{member}")
def get_member(project: ProjectDep, member: MemberPath) -> dict[str, Any]:
    """One person's profile: who they are and what authority they hold."""
    return project.member_view(member)


@router.get("/{member}/role-notice")
def role_notice(project: ProjectDep, member: MemberPath, actor: str) -> dict[str, Any] | None:
    """
    How a member finds out their authority changed.

    Read by that member or by the Owner and by nobody else, so the reader names
    themselves in `actor`. Null means their role has never been changed, which
    is a fact rather than a missing record — hence 200 and not 404.
    """
    return project.role_notice(actor=actor, member=member)


@router.get("/{member}/working/{branch_name}")
def working_files(
    project: ProjectDep, member: MemberPath, branch_name: BranchPath, actor: str
) -> list[dict[str, Any]]:
    """
    That member's own copy of a branch, as a tree. Readable by them alone.

    This is the point of the whole model: everybody authors in their own
    environment, and what they are working on stays theirs until they commit it.
    """
    return build_file_tree(project.working_files(actor=actor, member=member, branch=branch_name))


@router.get("/{member}/working/{branch_name}/history")
def working_history(
    project: ProjectDep, member: MemberPath, branch_name: BranchPath, actor: str
) -> list[dict[str, Any]]:
    """Every state they have been in on that branch, oldest first."""
    return project.working_history(actor=actor, member=member, branch=branch_name)


@router.get("/{member}/activity")
def member_activity(project: ProjectDep, member: MemberPath) -> list[dict[str, Any]]:
    """A team profile's per-person activity list, with the diff stats it prints."""
    return project.member_activity(member)


@router.post("/invite")
def invite(project: ProjectDep, body: InviteRequest) -> dict[str, str]:
    project.invite_member(actor=body.actor, new_member=body.new_member, role=Role(body.role))
    return {"invited": body.new_member, "role": body.role}


@router.post("/{member}/remove")
def remove_member(project: ProjectDep, member: MemberPath, body: ActorRequest) -> dict[str, str]:
    project.remove_contributor(actor=body.actor, target=member)
    return {"removed": member}


@router.post("/{member}/grant-maintainer")
def grant_maintainer(
    project: ProjectDep, member: MemberPath, body: ActorRequest
) -> dict[str, str]:
    project.grant_maintainer(actor=body.actor, target=member)
    return {"member": member, "role": "maintainer"}


@router.post("/{member}/revoke-maintainer")
def revoke_maintainer(
    project: ProjectDep, member: MemberPath, body: ActorRequest
) -> dict[str, str]:
    project.revoke_maintainer(actor=body.actor, target=member)
    return {"member": member, "role": "contributor"}
