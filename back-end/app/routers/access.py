"""
Getting into a project: the link, and the queue behind it when the link does
not admit people outright.

Kept apart from `settings.py`, which is where the link is *configured*. This is
where it is *used*, and the difference matters at the door: everything here
except the request itself is Owner-only, and the request itself is the one
endpoint in the API that no member has to be signed in to make.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Path

from core import Role

from ..dependencies import ProjectDep
from ..schemas import ActorRequest, JoinDecisionRequest, JoinRequestBody

router = APIRouter(prefix="/projects/{project_id}/access", tags=["access"])

MemberPath = Annotated[str, Path(min_length=1, max_length=200)]


@router.post("/join")
def request_join(project: ProjectDep, body: JoinRequestBody) -> dict[str, Any]:
    """
    Ask to join, holding the project's link.

    Answers "joined" or "pending" according to the project's own setting, and
    the caller is told which — being let in and being put in a queue are
    different outcomes and it would be unkind to blur them.
    """
    return project.request_join(token=body.token, name=body.name)


@router.get("/requests")
def list_requests(project: ProjectDep, actor: str) -> list[dict[str, Any]]:
    """
    Who is waiting. Owner-only, so the actor is named as a query parameter —
    this is a read, and reads in this API carry no body.
    """
    return project.join_requests(actor=actor)


@router.post("/requests/approve")
def approve(project: ProjectDep, body: JoinDecisionRequest) -> dict[str, str]:
    role = Role(body.role) if body.role else None
    project.approve_join(actor=body.actor, name=body.name, role=role)
    return {"joined": body.name}


@router.post("/requests/reject")
def reject(project: ProjectDep, body: JoinDecisionRequest) -> dict[str, str]:
    project.reject_join(actor=body.actor, name=body.name)
    return {"rejected": body.name}


@router.post("/leave")
def leave(project: ProjectDep, body: ActorRequest) -> dict[str, str]:
    """Show yourself out. The Owner cannot — see `Project.leave_project`."""
    project.leave_project(actor=body.actor)
    return {"left": body.actor}
