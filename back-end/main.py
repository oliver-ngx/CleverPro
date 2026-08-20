from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
from functools import wraps
import json

from compiler_logic import Project, Role, Attachment, PermissionError_, PushInvalidError

app = FastAPI(title="Compiler API", version="0.1.0")


def handle_core_errors(fn):
    """Turns a compiler_core exception into the right HTTP status. One
    place, instead of repeating try/except in every route below."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except PermissionError_ as e:
            raise HTTPException(status_code=403, detail=str(e))
        except PushInvalidError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except (ValueError, KeyError) as e:
            raise HTTPException(status_code=400, detail=str(e))
    return wrapper


@app.get("/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------------------------
# In-memory demo store. Swap for a SQLAlchemy-backed repository later —
# compiler_core.py itself doesn't change either way.
# --------------------------------------------------------------------
_projects: dict[str, Project] = {}


def get_project(project_id: str) -> Project:
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="No such project")
    return _projects[project_id]


def _attachment_from(body) -> Attachment:
    """Every Commit/Push-shaped request builds an Attachment the same way — one place, not four."""
    return Attachment(
        folder_ref=body.folder_ref, loose_files=body.loose_files,
        file_contents=body.file_contents, tree_snapshot=body.tree_snapshot,
    )


# --------------------------------------------------------------------
# Request models
# --------------------------------------------------------------------

class CreateProjectRequest(BaseModel):
    owner_name: str = Field(..., description="Name of the project's initial Owner")
    name: Optional[str] = Field(None, description="Project display name, e.g. 'Orchid Lab'")


class CommitRequest(BaseModel):
    actor: str
    branch: str = "main"
    folder_ref: Optional[str] = None
    loose_files: list[str] = []
    file_contents: dict[str, str] = {}
    tree_snapshot: Optional[dict[str, str]] = None
    comment: str
    view_by: list[str] = []


class PushRequest(BaseModel):
    actor: str
    branch: str = "main"
    folder_ref: Optional[str] = None
    loose_files: list[str] = []
    file_contents: dict[str, str] = {}
    tree_snapshot: Optional[dict[str, str]] = None
    comment: str


class DeployRequest(BaseModel):
    actor: str
    version_label: Optional[str] = None


class MergeRequest(BaseModel):
    actor: str


class RetractRequest(BaseModel):
    actor: str


class PushCommitRequest(BaseModel):
    actor: str
    comment: Optional[str] = None


class InviteRequest(BaseModel):
    actor: str
    new_member: str
    role: str = "contributor"


class AddBranchRequest(BaseModel):
    actor: str
    name: Optional[str] = None
    team: Optional[list[str]] = None
    deploy_subdomain: Optional[str] = None


class ActorOnlyRequest(BaseModel):
    actor: str


class TargetMemberRequest(BaseModel):
    actor: str
    target: str


class RoleUpdateRequest(BaseModel):
    actor: str
    role: str


class BoolSettingRequest(BaseModel):
    actor: str
    enabled: bool


class StringSettingRequest(BaseModel):
    actor: str
    value: Optional[str] = None


class CommentRequest(BaseModel):
    actor: str
    text: str


class FlagRequest(BaseModel):
    actor: str
    flagged: bool = True


# --------------------------------------------------------------------
# Project / Team
# --------------------------------------------------------------------

@app.post("/projects")
def create_project(body: CreateProjectRequest):
    project_id = f"proj_{len(_projects) + 1}"
    _projects[project_id] = Project(owner_name=body.owner_name, name=body.name)
    return {"project_id": project_id, "owner": body.owner_name, "name": _projects[project_id].name}


@app.get("/projects/{project_id}/overview")
def project_overview(project_id: str):
    """Main screen's top card: Preview, Project name + version, Deploy URL, Branches."""
    proj = get_project(project_id)
    return proj.overview()


@app.post("/projects/{project_id}/rename")
@handle_core_errors
def rename_project(project_id: str, body: StringSettingRequest):
    proj = get_project(project_id)
    proj.rename_project(actor=body.actor, new_name=body.value)
    return proj.overview()


@app.get("/projects/{project_id}/team")
def get_team(project_id: str):
    proj = get_project(project_id)
    return [{"name": m.name, "role": m.role.value} for m in proj.team_view()]


@app.get("/projects/{project_id}/team/{member}/activity")
@handle_core_errors
def member_activity(project_id: str, member: str):
    """Team profile's per-person activity list (Dev Reference §5)."""
    proj = get_project(project_id)
    return proj.member_activity(member)


@app.post("/projects/{project_id}/team/invite")
@handle_core_errors
def invite(project_id: str, body: InviteRequest):
    proj = get_project(project_id)
    proj.invite_member(actor=body.actor, new_member=body.new_member, role=Role(body.role))
    return {"invited": body.new_member, "role": body.role}


@app.post("/projects/{project_id}/team/{member}/remove")
@handle_core_errors
def remove_member(project_id: str, member: str, body: ActorOnlyRequest):
    proj = get_project(project_id)
    proj.remove_contributor(actor=body.actor, target=member)
    return {"removed": member}


@app.post("/projects/{project_id}/team/{member}/grant-maintainer")
@handle_core_errors
def grant_maintainer(project_id: str, member: str, body: ActorOnlyRequest):
    proj = get_project(project_id)
    proj.grant_maintainer(actor=body.actor, target=member)
    return {"member": member, "role": "maintainer"}


@app.post("/projects/{project_id}/team/{member}/revoke-maintainer")
@handle_core_errors
def revoke_maintainer(project_id: str, member: str, body: ActorOnlyRequest):
    proj = get_project(project_id)
    proj.revoke_maintainer(actor=body.actor, target=member)
    return {"member": member, "role": "contributor"}


# --------------------------------------------------------------------
# Commit / Push / Merge / Retract
# --------------------------------------------------------------------

@app.post("/projects/{project_id}/commit")
@handle_core_errors
def commit(project_id: str, body: CommitRequest):
    proj = get_project(project_id)
    c = proj.commit(actor=body.actor, branch=body.branch, attachment=_attachment_from(body),
                     comment=body.comment, view_by=body.view_by)
    return {"commit_id": c.id, "branch": c.branch, "author": c.author}


@app.post("/projects/{project_id}/push")
@handle_core_errors
def push(project_id: str, body: PushRequest):
    proj = get_project(project_id)
    p = proj.push(actor=body.actor, branch=body.branch, attachment=_attachment_from(body),
                   comment=body.comment)
    return {"push_id": p.id, "version_label": p.version_label, "branch": p.branch}


@app.post("/projects/{project_id}/push_commit/{commit_id}")
@handle_core_errors
def push_commit(project_id: str, commit_id: str, body: PushCommitRequest):
    proj = get_project(project_id)
    p = proj.push_commit(actor=body.actor, commit_id=commit_id, comment=body.comment)
    return {"push_id": p.id, "version_label": p.version_label, "branch": p.branch}


@app.post("/projects/{project_id}/merge/{commit_id}")
@handle_core_errors
def merge(project_id: str, commit_id: str, body: MergeRequest):
    proj = get_project(project_id)
    result = proj.merge(actor=body.actor, commit_id=commit_id)
    return {"result": result}


@app.post("/projects/{project_id}/unmerge/{commit_id}")
@handle_core_errors
def unmerge(project_id: str, commit_id: str, body: MergeRequest):
    """The 'Undo' action shown on an already-merged commit in Activity."""
    proj = get_project(project_id)
    result = proj.unmerge(actor=body.actor, commit_id=commit_id)
    return {"result": result}


@app.post("/projects/{project_id}/retract/{commit_id}")
@handle_core_errors
def retract(project_id: str, commit_id: str, body: RetractRequest):
    proj = get_project(project_id)
    proj.retract_commit(actor=body.actor, commit_id=commit_id)
    return {"commit_id": commit_id, "status": "retracted"}


@app.post("/projects/{project_id}/commits/{commit_id}/comments")
@handle_core_errors
def add_comment(project_id: str, commit_id: str, body: CommentRequest):
    """File Detail toolbar's 'Comment' action."""
    proj = get_project(project_id)
    c = proj.add_comment(actor=body.actor, commit_id=commit_id, text=body.text)
    return {"comment_id": c.id, "author": c.author, "text": c.text}


@app.get("/projects/{project_id}/commits/{commit_id}/comments")
@handle_core_errors
def list_comments(project_id: str, commit_id: str):
    proj = get_project(project_id)
    _, c = proj._find_commit(commit_id)
    return [{"comment_id": cm.id, "author": cm.author, "text": cm.text, "timestamp": cm.timestamp}
            for cm in c.comments]


@app.post("/projects/{project_id}/commits/{commit_id}/flag")
@handle_core_errors
def flag_commit(project_id: str, commit_id: str, body: FlagRequest):
    """File Detail toolbar's 'Flag' toggle."""
    proj = get_project(project_id)
    proj.set_flag(actor=body.actor, commit_id=commit_id, flagged=body.flagged)
    return {"commit_id": commit_id, "flagged": body.flagged}


# --------------------------------------------------------------------
# Deploy / Undo
# --------------------------------------------------------------------

@app.post("/projects/{project_id}/deploy")
@handle_core_errors
def deploy(project_id: str, body: DeployRequest):
    proj = get_project(project_id)
    d = proj.deploy(actor=body.actor, version_label=body.version_label)
    return {"deploy_id": d.id, "version_label": d.version_label}


@app.post("/projects/{project_id}/undo")
@handle_core_errors
def undo(project_id: str, body: DeployRequest):
    """Archive's 'Undo' row action — roll production back to a specific Main version."""
    proj = get_project(project_id)
    d = proj.undo(actor=body.actor, target_version_label=body.version_label)
    return {"deploy_id": d.id, "version_label": d.version_label}


# --------------------------------------------------------------------
# Activity / Archive
# --------------------------------------------------------------------

@app.get("/projects/{project_id}/activity/{viewer}")
@handle_core_errors
def activity_for_viewer(project_id: str, viewer: str):
    proj = get_project(project_id)
    return proj.activity_feed_for_viewer(viewer)


@app.get("/projects/{project_id}/archive")
def archive_surface(project_id: str):
    """
    Matches the Figma Archive screen: every version ever pushed to Main,
    newest first, 'Applied' on the live one, 'Undo' on every other row.
    """
    proj = get_project(project_id)
    return proj.archive_surface()


@app.get("/projects/{project_id}/archive/deploy-log")
def deploy_log(project_id: str):
    """The underlying deploy/undo audit trail (Invariant 5) — every actual
    deploy() or undo() call, distinct from archive_surface()'s per-version view."""
    proj = get_project(project_id)
    return proj.archive_history()


# --------------------------------------------------------------------
# Branches / File tree
# --------------------------------------------------------------------

@app.post("/projects/{project_id}/branches")
@handle_core_errors
def add_branch(project_id: str, body: AddBranchRequest):
    proj = get_project(project_id)
    members = set(body.team) if body.team is not None else None
    b = proj.create_branch(actor=body.actor, name=body.name or "", members=members,
                            deploy_subdomain=body.deploy_subdomain)
    return {
        "branch": b.name, "members": sorted(b.members),
        "deploy_subdomain": b.deploy_subdomain,
        "seeded_from_main": bool(b.current_files),
    }


@app.get("/projects/{project_id}/branches")
def list_branches(project_id: str):
    proj = get_project(project_id)
    return [
        {
            "name": b.name, "is_main": b.is_main,
            "deploy_subdomain": b.deploy_subdomain,
            "members": sorted(b.members),
            "latest_version": b.head.version_label if b.head else None,
        }
        for b in proj.branches.values()
    ]


@app.get("/projects/{project_id}/branches/{branch_name}/files")
@handle_core_errors
def branch_file_tree(project_id: str, branch_name: str):
    """Main surface's file tree (Dev Reference §1) — real content, nested."""
    proj = get_project(project_id)
    return proj.file_tree(branch_name)


@app.get("/projects/{project_id}/production/files")
def production_file_tree(project_id: str):
    """What's actually live right now — Archive surface's real content."""
    proj = get_project(project_id)
    return proj.production_file_tree()


@app.get("/projects/{project_id}/branches/{branch_name}/versions/{version_label}/files")
@handle_core_errors
def file_tree_at_version(project_id: str, branch_name: str, version_label: str):
    """Historical version's file tree — proves every version stays retrievable, not just the latest."""
    proj = get_project(project_id)
    return proj.file_tree_at_version(branch_name, version_label)


@app.get("/projects/{project_id}/branches/{branch_name}/versions/{version_label}/files/content")
@handle_core_errors
def file_content_at_version(project_id: str, branch_name: str, version_label: str, path: str):
    """Raw content of one file at one historical version (path as a query param)."""
    proj = get_project(project_id)
    content = proj.file_content_at_version(branch_name, version_label, path)
    return {"path": path, "version_label": version_label, "content": content}


# --------------------------------------------------------------------
# Settings (Dev Reference §4)
# --------------------------------------------------------------------

@app.get("/projects/{project_id}/settings")
def get_settings(project_id: str):
    proj = get_project(project_id)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/link")
@handle_core_errors
def set_link_access(project_id: str, body: BoolSettingRequest):
    proj = get_project(project_id)
    proj.set_anyone_with_link(actor=body.actor, enabled=body.enabled)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/regenerate-invite")
@handle_core_errors
def regenerate_invite(project_id: str, body: ActorOnlyRequest):
    proj = get_project(project_id)
    token = proj.regenerate_invite_link(actor=body.actor)
    return {"invite_token": token}


@app.post("/projects/{project_id}/settings/default-invite-role")
@handle_core_errors
def set_default_invite_role(project_id: str, body: RoleUpdateRequest):
    proj = get_project(project_id)
    proj.set_default_invite_role(actor=body.actor, role=Role(body.role))
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/branches")
@handle_core_errors
def set_branches_setting(project_id: str, body: BoolSettingRequest):
    """The Settings 'Branches: On/Off' feature-level toggle."""
    proj = get_project(project_id)
    proj.set_branches_enabled(actor=body.actor, enabled=body.enabled)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/branch-creation-authority")
@handle_core_errors
def set_branch_creation_authority(project_id: str, body: BoolSettingRequest):
    """Who's allowed to create a branch — the disclosure under Branches."""
    proj = get_project(project_id)
    proj.set_branch_creation_authority(actor=body.actor, open_to_contributors=body.enabled)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/visibility")
@handle_core_errors
def set_visibility(project_id: str, body: StringSettingRequest):
    proj = get_project(project_id)
    proj.set_production_visibility(actor=body.actor, visibility=body.value)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/custom-domain")
@handle_core_errors
def set_custom_domain(project_id: str, body: StringSettingRequest):
    proj = get_project(project_id)
    proj.set_custom_domain(actor=body.actor, domain=body.value)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/transfer-owner")
@handle_core_errors
def transfer_owner(project_id: str, body: TargetMemberRequest):
    proj = get_project(project_id)
    proj.transfer_ownership(actor=body.actor, new_owner=body.target)
    return proj.get_settings()


@app.post("/projects/{project_id}/settings/delete")
@handle_core_errors
def delete_project(project_id: str, body: ActorOnlyRequest):
    proj = get_project(project_id)
    proj.delete_project(actor=body.actor)
    return {"deleted": True}


# --------------------------------------------------------------------
# Export / Import
# --------------------------------------------------------------------

@app.get("/projects/{project_id}/export")
def export_project(project_id: str):
    proj = get_project(project_id)
    data = {
        "team": [{"name": m.name, "role": m.role.value} for m in proj.team_view()],
        "activity": proj.activity_feed_for_viewer(proj.team_view()[0].name) if proj.team_view() else [],
        "deployed_version": proj.deployed_version,
    }
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{project_id}_export.json"'},
    )


@app.post("/import")
async def import_json_file(file: UploadFile):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=422, detail="Expected a .json file")
    contents = await file.read()
    try:
        data = json.loads(contents)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {e}")
    return {"filename": file.filename, "top_level_keys": list(data.keys())}