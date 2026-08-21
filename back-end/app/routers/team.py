"""
The roster, and the administration the product hangs off a person's own
profile rather than off a roster screen.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Path

from core import Role

from ..dependencies import ProjectDep
from ..schemas import ActorRequest, InviteRequest

router = APIRouter(prefix="/projects/{project_id}/team", tags=["team"])

# Display names are the member key in this API, so they arrive URL-encoded and
# can contain spaces. Bounded so a path cannot be used to allocate.
MemberPath = Annotated[str, Path(min_length=1, max_length=200)]


@router.get("")
def get_team(project: ProjectDep) -> list[dict[str, str]]:
    return [{"name": m.name, "role": m.role.value} for m in project.team_view()]


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
