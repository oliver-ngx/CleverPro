"""
The things that happen, as records.

A Commit is a proposal, a PushRecord is a promotion, a DeployRecord is a
release, and an ActivityEvent is the ledger line announcing any of them. None
of these are ever mutated destructively or removed: retracting sets a flag,
rolling production back appends a new deploy record pointing at an old
version, and the ledger only grows. That is what makes every surface in the
product a filter over history rather than a separate store that can disagree
with it.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .attachments import Attachment


@dataclass
class Comment:
    """A threaded note on a commit — the File Detail toolbar's "Comment"."""

    id: str
    author: str
    text: str
    timestamp: float


@dataclass
class Commit:
    """
    A proposal. Does not change Main. Does not change production.

    Status is derived rather than stored, so it cannot drift from the flags it
    is derived from: pending -> merged (by anyone) -> pushed, or pending ->
    retracted. A pushed or merged commit can never be retracted — by then it
    is history rather than a pending proposal.
    """

    id: str
    author: str
    branch: str
    attachment: Attachment
    comment: str
    # Empty means the whole team. Routing controls signal, not access: a
    # recipient list decides whose Activity feed shows the row, not who is
    # permitted to see the branch.
    view_by: list[str]
    timestamp: float
    # What its author called it. The API requires one of every commit it
    # accepts; the default is here for the callers that build history without
    # an author to ask, which is the demo seed. Those commits fall back to
    # being named by the files they changed. Unlike a push's name this one is
    # only ever displayed, so nothing about its shape is constrained.
    name: str = ""
    retracted: bool = False
    merged_by: set[str] = field(default_factory=set)
    pushed: bool = False
    diff_stats: dict[str, dict[str, int]] = field(default_factory=dict)
    total_added: int = 0
    total_removed: int = 0
    comments: list[Comment] = field(default_factory=list)
    flagged: bool = False

    @property
    def status(self) -> str:
        if self.retracted:
            return "retracted"
        if self.pushed:
            return "pushed"
        if self.merged_by:
            return "merged"
        return "pending"

    def visible_to_member(self, member: str) -> bool:
        """An empty recipient list means the whole team; an author always sees their own."""
        return not self.view_by or member == self.author or member in self.view_by


@dataclass
class PushRecord:
    """
    Promotion of a version onto a line — Main or a branch.

    ``files`` is a complete snapshot rather than a delta, which is the reason
    every historical version stays retrievable byte for byte and why
    ``undo`` can restore real content rather than repoint a label. The cost is
    that memory grows with versions times tree size; a real deployment would
    put content-addressed blobs behind this field, which is a change to this
    one attribute and to nothing that reads it.
    """

    id: str
    author: str
    branch: str
    attachment: Attachment
    comment: str
    timestamp: float
    version_label: str
    files: dict[str, str] = field(default_factory=dict)
    diff_stats: dict[str, dict[str, int]] = field(default_factory=dict)
    total_added: int = 0
    total_removed: int = 0


@dataclass
class DeployRecord:
    """Release of a Main version to production. Explicit, authorized, reversible."""

    id: str
    author: str
    version_label: str
    timestamp: float


@dataclass
class ActivityEvent:
    """
    One shared ledger entry.

    Every state-changing action appends exactly one of these. Activity,
    Archive and a team member's profile all read from this single source,
    filtered differently — instead of each surface re-deriving "what happened"
    from raw Commit and PushRecord objects and arriving at three subtly
    different answers.
    """

    id: str
    actor: str
    # "commit" | "merge" | "unmerge" | "retract" | "push" | "deploy" | "undo"
    # | "branch_created" | "member_invited" | "member_removed" | "role_changed"
    type: str
    description: str
    branch: str | None
    timestamp: float
    # Empty means the whole team; a populated list is a row addressed to
    # somebody in particular and shown to nobody else.
    visible_to: list[str] = field(default_factory=list)
    commit_id: str | None = None
    push_id: str | None = None
