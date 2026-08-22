"""
Proposals and promotions: the composer's two buttons, the Activity feed's
action word, and the File Detail toolbar.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Path

from ..dependencies import ProjectDep, build_attachment
from ..schemas import (
    ActorRequest,
    CommentRequest,
    CommitRequest,
    FlagRequest,
    PushCommitRequest,
    PushRequest,
)

router = APIRouter(prefix="/projects/{project_id}", tags=["commits"])

CommitPath = Annotated[str, Path(min_length=1, max_length=128)]
ViewerPath = Annotated[str, Path(min_length=1, max_length=200)]


@router.post("/commit")
def commit(project: ProjectDep, body: CommitRequest) -> dict[str, str]:
    record = project.commit(
        actor=body.actor,
        branch=body.branch,
        attachment=build_attachment(project, body),
        comment=body.comment,
        view_by=body.view_by,
        name=body.name,
    )
    return {"commit_id": record.id, "branch": record.branch, "author": record.author}


@router.post("/push")
def push(project: ProjectDep, body: PushRequest) -> dict[str, str]:
    record = project.push(
        actor=body.actor,
        branch=body.branch,
        attachment=build_attachment(project, body),
        comment=body.comment,
        version_label=body.name,
    )
    return {
        "push_id": record.id,
        "version_label": record.version_label,
        "branch": record.branch,
    }


@router.post("/push_commit/{commit_id}")
def push_commit(
    project: ProjectDep, commit_id: CommitPath, body: PushCommitRequest
) -> dict[str, str]:
    """Promote one commit's attachment straight onto its branch."""
    record = project.push_commit(actor=body.actor, commit_id=commit_id, comment=body.comment)
    return {
        "push_id": record.id,
        "version_label": record.version_label,
        "branch": record.branch,
    }


@router.get("/commits/{commit_id}")
def get_commit(project: ProjectDep, commit_id: CommitPath) -> dict[str, Any]:
    """One proposal in full, for a screen opened on it directly."""
    return project.commit_view(commit_id)


@router.post("/merge/{commit_id}")
def merge(project: ProjectDep, commit_id: CommitPath, body: ActorRequest) -> dict[str, str]:
    """Adopt a commit addressed to you. Flips its Activity row to "Undo"."""
    return {"result": project.merge(actor=body.actor, commit_id=commit_id)}


@router.post("/unmerge/{commit_id}")
def unmerge(project: ProjectDep, commit_id: CommitPath, body: ActorRequest) -> dict[str, str]:
    """Reverse your own merge. Flips the same row back to "Merge"."""
    return {"result": project.unmerge(actor=body.actor, commit_id=commit_id)}


@router.post("/retract/{commit_id}")
def retract(project: ProjectDep, commit_id: CommitPath, body: ActorRequest) -> dict[str, str]:
    """Withdraw your own proposal — valid only while it is still pending."""
    project.retract_commit(actor=body.actor, commit_id=commit_id)
    return {"commit_id": commit_id, "status": "retracted"}


@router.post("/commits/{commit_id}/comments")
def add_comment(
    project: ProjectDep, commit_id: CommitPath, body: CommentRequest
) -> dict[str, str]:
    note = project.add_comment(actor=body.actor, commit_id=commit_id, text=body.text)
    return {"comment_id": note.id, "author": note.author, "text": note.text}


@router.get("/commits/{commit_id}/comments")
def list_comments(project: ProjectDep, commit_id: CommitPath) -> list[dict[str, Any]]:
    commit_record = project.find_commit(commit_id)
    return [
        {
            "comment_id": note.id,
            "author": note.author,
            "text": note.text,
            "timestamp": note.timestamp,
        }
        for note in commit_record.comments
    ]


@router.post("/commits/{commit_id}/flag")
def flag_commit(
    project: ProjectDep, commit_id: CommitPath, body: FlagRequest
) -> dict[str, Any]:
    project.set_flag(actor=body.actor, commit_id=commit_id, flagged=body.flagged)
    return {"commit_id": commit_id, "flagged": body.flagged}


@router.get("/activity/{viewer}")
def activity_for_viewer(project: ProjectDep, viewer: ViewerPath) -> list[dict[str, Any]]:
    """
    The Activity feed is viewer-specific: the same commit reads "Merge" to a
    recipient who has not taken it, "Undo" to one who has, and "View" to its
    author. That is why the viewer is in the path rather than implied.
    """
    return project.activity_feed_for_viewer(viewer)
