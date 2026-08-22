"""
The wire format: what a request may contain, and what it may not.

Two things are worth reading closely here.

**`ActorRequest` is the authentication seam.** This API has no sessions and no
tokens: every mutating request names its own actor in the body, and the domain
trusts that name. That is fine for a local demo and is not fine anywhere else —
a caller can claim to be the Owner by typing "Oliver". Every mutating body in
this file inherits from `ActorRequest` precisely so that the day identity
becomes real, `actor` stops being a field and becomes a dependency, and the
change is made in one place rather than in thirty route signatures.

**The size caps are not validation theatre.** Attachments carry file content
inline, and the store keeps every version's full tree in memory forever, so an
unbounded `tree_snapshot` is an unbounded allocation on a public endpoint.
Rejecting an oversized bundle here means it is refused at the edge, before any
of it is copied into a project. The ceilings match the ones the browser
enforces in `front-end/src/lib/picker.ts`, so a selection the picker accepted is
a selection this will accept -- see `config.py` for why the pair has to move
together.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator, model_validator

from .config import settings

# Long enough for any comment somebody would actually write, short enough that
# a million of them is not a memory strategy.
_TEXT = Field(..., min_length=1, max_length=2000)
_NAME = Field(..., min_length=1, max_length=200)


def _check_tree(files: dict[str, str], label: str) -> dict[str, str]:
    """Enforce the per-file, per-tree and total ceilings on a path -> content map."""
    if len(files) > settings.max_tree_files:
        raise ValueError(
            f"{label} carries {len(files)} files; the limit is {settings.max_tree_files}."
        )
    total = 0
    for path, content in files.items():
        if len(path) > 1024:
            raise ValueError(f"{label} contains a path longer than 1024 characters.")
        if len(content) > settings.max_file_chars:
            raise ValueError(
                f"'{path}' is larger than the {settings.max_file_chars}-character "
                "per-file limit."
            )
        total += len(content)
        if total > settings.max_total_chars:
            raise ValueError(
                f"{label} exceeds the {settings.max_total_chars}-character total limit."
            )
    return files


class ActorRequest(BaseModel):
    """
    Who is making this request.

    See the module docstring: this is a stand-in for authentication, not a
    substitute for it. The domain matches members by display name, so the
    string here has to be a member's exact name.
    """

    actor: str = _NAME


class AttachmentBody(ActorRequest):
    """
    The half a Commit and a Push share: what is being sent, and onto which
    branch.

    The three kinds are deliberately not mutually exclusive at this layer. A
    commit may legitimately carry a version reference *and* loose files,
    because a proposal is read by a person; a push may not, and that rule
    lives in the domain where it applies rather than in the schema where it
    would apply to both.
    """

    branch: str = Field("main", min_length=1, max_length=200)
    folder_ref: str | None = Field(None, max_length=200)
    # One whole version of `branch`, resolved server-side — the client names a
    # label it can already see and the server assembles the bytes, which it is
    # the only side holding.
    version_ref: str | None = Field(None, max_length=200)
    loose_files: list[str] = Field(default_factory=list)
    file_contents: dict[str, str] = Field(default_factory=dict)
    tree_snapshot: dict[str, str] | None = None
    comment: str = Field(..., min_length=1, max_length=2000)
    # What the author calls this commit or push. Required: the composer makes
    # every sender name what they are sending rather than falling back to a
    # generated label, and a rule the client enforces alone is not a rule — an
    # endpoint that quietly accepts a nameless push would make the field
    # decorative. The domain keeps its automatic naming for the callers that
    # genuinely have no author typing: the demo seed, and promoting a commit
    # somebody else wrote.
    #
    # The two ends mean different things by a name — a push's becomes the
    # version's label, a commit's is only ever displayed — so what makes a
    # *usable* one is decided in the domain, next to the label index and the
    # routes those labels have to survive. All this layer decides is that there
    # has to be one.
    name: str = _NAME

    @field_validator("name", "comment")
    @classmethod
    def _not_only_spaces(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("loose_files")
    @classmethod
    def _cap_loose_files(cls, value: list[str]) -> list[str]:
        if len(value) > settings.max_tree_files:
            raise ValueError(
                f"An attachment may name at most {settings.max_tree_files} files."
            )
        return value

    @field_validator("file_contents")
    @classmethod
    def _cap_file_contents(cls, value: dict[str, str]) -> dict[str, str]:
        return _check_tree(value, "file_contents")

    @field_validator("tree_snapshot")
    @classmethod
    def _cap_tree_snapshot(cls, value: dict[str, str] | None) -> dict[str, str] | None:
        return None if value is None else _check_tree(value, "tree_snapshot")

    @model_validator(mode="after")
    def _cap_combined(self) -> AttachmentBody:
        total = sum(len(v) for v in self.file_contents.values())
        total += sum(len(v) for v in (self.tree_snapshot or {}).values())
        if total > settings.max_total_chars:
            raise ValueError(
                f"This attachment exceeds the {settings.max_total_chars}-character "
                "total limit."
            )
        return self


class CommitRequest(AttachmentBody):
    """A proposal, routed to `view_by` — empty meaning the whole team."""

    view_by: list[str] = Field(default_factory=list, max_length=500)


class PushRequest(AttachmentBody):
    """A promotion. Must resolve to one unambiguous next state of the branch."""


class CreateProjectRequest(BaseModel):
    owner_name: str = _NAME
    name: str | None = Field(None, max_length=200)


class DeployRequest(ActorRequest):
    """A release, or a rollback. No label means Main's head (deploy) or the
    previous deployment (undo)."""

    version_label: str | None = Field(None, max_length=200)


class PushCommitRequest(ActorRequest):
    comment: str | None = Field(None, max_length=2000)


class InviteRequest(ActorRequest):
    new_member: str = _NAME
    role: str = Field("contributor", max_length=32)


class AddBranchRequest(ActorRequest):
    """
    `name` may be blank: the sheet does not require one and the server
    generates "{project}-experiment-{date}" in its place. `team` omitted means
    every member — the "All from Main" default the sheet opens on.
    """

    name: str | None = Field(None, max_length=200)
    team: list[str] | None = Field(None, max_length=500)
    deploy_subdomain: str | None = Field(None, max_length=63)
    # Which version of Main to start from. None means wherever Main is now.
    from_version: str | None = Field(None, max_length=200)


class JoinRequestBody(BaseModel):
    """
    Arriving through the project's link.

    The only body in this file that is not an `ActorRequest`, and necessarily
    so: whoever sends it is not a member yet, so there is no actor to name. The
    token is what stands in for identity here, which is exactly as far as a link
    is allowed to go — it admits you to the project, and every authority
    question after that is answered by the role you were given.
    """

    token: str = Field(..., min_length=1, max_length=128)
    name: str = _NAME


class JoinDecisionRequest(ActorRequest):
    """Owner's answer to one pending request. No role means the project default."""

    name: str = _NAME
    role: str | None = Field(None, max_length=32)


class TargetMemberRequest(ActorRequest):
    target: str = _NAME


class RoleUpdateRequest(ActorRequest):
    role: str = Field(..., max_length=32)


class BoolSettingRequest(ActorRequest):
    enabled: bool


class StringSettingRequest(ActorRequest):
    """A settings row whose value is free text, or None to clear it."""

    value: str | None = Field(None, max_length=253)


class CommentRequest(ActorRequest):
    text: str = _TEXT


class FlagRequest(ActorRequest):
    flagged: bool = True

