from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import itertools
import time
import difflib
import threading
import functools


# --------------------------------------------------------------------------
# Roles & authority (Section 5)
# --------------------------------------------------------------------------

class Role(Enum):
    CONTRIBUTOR = "contributor"
    MAINTAINER = "maintainer"
    OWNER = "owner"


_ROLE_RANK = {Role.CONTRIBUTOR: 0, Role.MAINTAINER: 1, Role.OWNER: 2}


def _at_least(role: Role, floor: Role) -> bool:
    return _ROLE_RANK[role] >= _ROLE_RANK[floor]


class PermissionError_(Exception):
    """Raised when a member attempts an action their role doesn't grant."""


class PushInvalidError(Exception):
    """Raised when a Push's attachment bundle doesn't resolve unambiguously."""


def _synchronized(method):
    """
    Wraps a Project method so its entire body runs under Project._lock.

    Why this matters concretely: push() reads a branch's current file
    state, merges in the new changes, then appends a new snapshot. Without
    this, two developers pushing to different files at nearly the same
    moment can each read a stale snapshot and one push ends up silently
    reverting the OTHER'S already-completed change in the branch's current
    head — proven by an actual concurrency stress test, not assumed. This
    decorator makes that read-merge-append sequence atomic per project, so
    every push always builds on the true latest state.
    """
    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        with self._lock:
            return method(self, *args, **kwargs)
    return wrapper


@dataclass
class Member:
    name: str
    role: Role


# --------------------------------------------------------------------------
# Attachments — what a Commit or Push carries (Section 8)
# --------------------------------------------------------------------------

@dataclass
class Attachment:
    """
    A bundle of what's being sent. Either a single folder/version reference,
    or a set of individual loose files — never validated as "mixed" until
    Push time, per the Push-validity rule.

    file_contents carries the ACTUAL content for entries in loose_files
    (path -> text). tree_snapshot carries a full replacement tree when
    folder_ref is used (path -> text for every file in that "whole
    version"). This is what makes Push/Undo operate on real content
    instead of just labels.
    """
    folder_ref: Optional[str] = None          # e.g. "V4" or "folder:/src"
    loose_files: list[str] = field(default_factory=list)  # e.g. ["src/app.py"]
    file_contents: dict[str, str] = field(default_factory=dict)   # path -> content, for loose_files
    tree_snapshot: Optional[dict[str, str]] = None                # path -> content, for folder_ref (whole tree)

    def is_mixed(self) -> bool:
        return bool(self.folder_ref) and bool(self.loose_files)

    def describe(self) -> str:
        parts = []
        if self.folder_ref:
            parts.append(f"folder-ref={self.folder_ref}")
        if self.loose_files:
            parts.append(f"loose_files={self.loose_files}")
        return ", ".join(parts) or "empty"


def build_file_tree(files: dict[str, str]) -> list[dict]:
    """
    Turns a flat {path: content} dict into the nested checkbox-tree shape
    the Main surface renders (folders with children, files as leaves).
    'checked' defaults to True — it represents "included in this version",
    not a permanent flag; a frontend attachment-builder can let the user
    toggle it when composing a new Commit/Push.
    """
    root: dict = {}
    for path in sorted(files.keys()):
        parts = path.split("/")
        node = root
        for i, part in enumerate(parts):
            is_file = i == len(parts) - 1
            if part not in node:
                node[part] = {"__is_file__": is_file, "__children__": {}}
            node = node[part]["__children__"]

    def to_list(children: dict, prefix: str) -> list[dict]:
        out = []
        for name, meta in children.items():
            path = f"{prefix}{name}"
            if meta["__is_file__"]:
                out.append({"name": name, "type": "file", "path": path, "checked": True})
            else:
                out.append({
                    "name": name, "type": "folder", "path": path, "checked": True,
                    "children": to_list(meta["__children__"], path + "/"),
                })
        return out

    return to_list(root, "")


def compute_diff(old_content: str, new_content: str) -> dict:
    """
    Line-based +added/-removed count (the '+45 -0' stat on Team's per-
    person activity list, Dev Reference §5). Uses stdlib difflib — no new
    dependency, and it's the same algorithm 'git diff --stat' is built on.
    """
    old_lines = old_content.splitlines()
    new_lines = new_content.splitlines()
    matcher = difflib.SequenceMatcher(a=old_lines, b=new_lines)
    added = removed = 0
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "replace":
            removed += (i2 - i1)
            added += (j2 - j1)
        elif tag == "delete":
            removed += (i2 - i1)
        elif tag == "insert":
            added += (j2 - j1)
    return {"added": added, "removed": removed}


def diff_stats_for_change(previous_files: dict[str, str], new_files: dict[str, str],
                           changed_paths: list[str]) -> tuple[dict[str, dict], int, int]:
    """Per-file diff stats for a set of changed paths, plus the totals shown
    as the headline '+45 -0' figure."""
    per_file: dict[str, dict] = {}
    total_added = total_removed = 0
    for path in changed_paths:
        d = compute_diff(previous_files.get(path, ""), new_files.get(path, ""))
        per_file[path] = d
        total_added += d["added"]
        total_removed += d["removed"]
    return per_file, total_added, total_removed


# --------------------------------------------------------------------------
# Events: Commit, Push, Deploy
# --------------------------------------------------------------------------

_id_counter = itertools.count(1)


def _next_id(prefix: str) -> str:
    return f"{prefix}-{next(_id_counter)}"


@dataclass
class Comment:
    """A threaded note on a commit (File Detail toolbar's 'Comment', Dev Reference §6)."""
    id: str
    author: str
    text: str
    timestamp: float


@dataclass
class Commit:
    """
    A proposal. Does not change Main. Does not change production.

    Per the Dev Reference (§0), status is derived: pending -> merged (by
    anyone) -> pushed, or pending -> retracted. Pushed/merged commits can
    never be retracted (§6 — "must be blocked once a commit has been
    merged or pushed... it's history").
    """
    id: str
    author: str
    branch: str
    attachment: Attachment
    comment: str
    view_by: list[str]           # empty list = visible to whole team (§2 visible_to nullable)
    timestamp: float
    retracted: bool = False
    merged_by: set[str] = field(default_factory=set)
    pushed: bool = False
    diff_stats: dict[str, dict] = field(default_factory=dict)  # path -> {"added": n, "removed": n}
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
        """visible_to nullable == whole team (Dev Reference §0 / §2)."""
        return not self.view_by or member == self.author or member in self.view_by


@dataclass
class PushRecord:
    """Promotion of a version onto a line (Main or a branch)."""
    id: str
    author: str
    branch: str
    attachment: Attachment
    comment: str
    timestamp: float
    version_label: str           # V1, V2... on main; date-stamp on branches
    files: dict[str, str] = field(default_factory=dict)  # REAL content snapshot at this version
    diff_stats: dict[str, dict] = field(default_factory=dict)
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
    One shared ledger entry for the Activity surface (Dev Reference §2).
    Every state-changing action (commit, merge, unmerge, retract, push,
    deploy, undo) appends exactly one of these through Project._log_event.
    Activity, Archive, and Team's per-person activity list all read from
    THIS one source, filtered differently — instead of each surface
    re-deriving "what happened" from raw Commit/PushRecord objects.
    """
    id: str
    actor: str
    type: str                 # "commit" | "merge" | "unmerge" | "retract" | "push" | "deploy" | "undo"
    description: str          # human-readable, e.g. "Pushed Orchid Lab V3 to main"
    branch: Optional[str]
    timestamp: float
    visible_to: list[str] = field(default_factory=list)  # empty = whole team
    commit_id: Optional[str] = None   # set for commit/merge/unmerge/retract events
    push_id: Optional[str] = None     # set for push events


# --------------------------------------------------------------------------
# Branch — Section 9 & 10
# --------------------------------------------------------------------------

@dataclass
class Branch:
    name: str
    is_main: bool = False
    deploy_subdomain: Optional[str] = None    # e.g. "orchid-lab-exp1" -> {subdomain}.cleverpro.com
    members: set[str] = field(default_factory=set)   # who has visibility (Sec 12: project-wide default)
    commits: list[Commit] = field(default_factory=list)
    pushes: list[PushRecord] = field(default_factory=list)
    version_counter: int = 0

    @property
    def head(self) -> Optional[PushRecord]:
        """Latest pushed state of this line — its 'current' version."""
        return self.pushes[-1] if self.pushes else None

    @property
    def current_files(self) -> dict[str, str]:
        """The REAL file content this branch currently holds, path -> content."""
        return self.head.files if self.head else {}

    def file_tree(self) -> list[dict]:
        """Nested checkbox-tree shape for the Main surface's file view."""
        return build_file_tree(self.current_files)

    @property
    def preview_state(self) -> Optional[PushRecord]:
        """
        Invariant 7: a branch preview always reflects the branch's latest
        pushed state (auto-updates, no separate deploy step). Main's
        preview/production instead reflects the latest *deployed* state,
        tracked separately on Project.
        """
        if self.is_main:
            raise ValueError("Main's live state is production, tracked on Project.deployed_version — not preview_state.")
        return self.head

    def next_version_label(self) -> str:
        self.version_counter += 1
        if self.is_main:
            return f"V{self.version_counter}"
        # branches use date stamps per the doc's open item on naming convention
        return time.strftime("%b%d", time.localtime()) + (
            f"-{self.version_counter}" if self.version_counter > 1 else ""
        )


# --------------------------------------------------------------------------
# Project — ties it all together
# --------------------------------------------------------------------------

class Project:
    def __init__(self, owner_name: str, name: Optional[str] = None,
                 branch_creation_open_to_contributors: bool = False):
        self.members: dict[str, Member] = {owner_name: Member(owner_name, Role.OWNER)}
        self.branch_creation_open_to_contributors = branch_creation_open_to_contributors

        main = Branch(name="main", is_main=True)
        main.members = set(self.members.keys())
        self.branches: dict[str, Branch] = {"main": main}

        # Production state — deliberately decoupled from Main's push history (Invariant 1, Section 10)
        self.deployed_version: Optional[str] = None
        self.deployed_files: dict[str, str] = {}       # REAL content currently live
        self.deploy_history: list[DeployRecord] = []   # never truncated (Invariant 5)

        # Shared Activity ledger — every state-changing action logs exactly
        # one event here (Project._log_event). Activity, Archive, and Team
        # profile activity lists all read from this one source.
        self.events: list[ActivityEvent] = []

        # Identity + Deploy URL (Dev Reference §0: "domain, custom_domain" as
        # separate fields — the Main screen's Project/Deploy rows). `domain`
        # is the auto-provisioned default; `custom_domain` (below, Settings)
        # is optional and overrides it once verified.
        self.name: str = name or f"{owner_name}'s project"
        self.domain: str = self._slugify(self.name) + ".cleverpro.com"
        self.preview_image: Optional[str] = None  # Main screen's Preview thumbnail — set via set_preview_image()

        # Settings surface (Dev Reference §4)
        self.anyone_with_link: bool = True
        self.invite_token: str = _next_id("invite").replace("invite-", "tok-")
        self.default_invite_role: Role = Role.CONTRIBUTOR
        self.branches_feature_enabled: bool = True
        self.production_visibility: str = "private"   # "public" | "private"
        self.custom_domain: Optional[str] = None

        self.deleted = False
        self._lock = threading.RLock()  # RLock: push_commit()/create_branch() call push() re-entrantly

    @staticmethod
    def _slugify(text: str) -> str:
        return "-".join(text.lower().split()) or "project"

    def live_domain(self) -> str:
        """What the Main screen's Deploy row actually links to — custom domain if verified, else the default."""
        return self.custom_domain or self.domain

    @_synchronized
    def overview(self) -> dict:
        """
        Main screen's top card (Dev Reference §1): Preview, Project name +
        current version, Deploy URL, and the branch list for the switcher —
        four separate pieces of data the frontend needs in one call.
        """
        main = self.branches["main"]
        return {
            "preview_image": self.preview_image,
            "project_name": self.name,
            "current_version": main.head.version_label if main.head else None,
            "deploy_url": self.live_domain() if self.deployed_version else None,
            "branches": [
                {"name": b.name, "is_main": b.is_main, "latest_version": b.head.version_label if b.head else None}
                for b in self.branches.values()
            ],
        }

    @_synchronized
    def rename_project(self, actor: str, new_name: str):
        self._require_role(actor, Role.MAINTAINER, "rename the project")
        self.name = new_name

    @_synchronized
    def set_preview_image(self, actor: str, image_ref: str):
        self._require_role(actor, Role.MAINTAINER, "set the preview image")
        self.preview_image = image_ref

    # ---- shared activity ledger ---------------------------------------

    def _log_event(self, actor: str, type: str, description: str,
                    branch: Optional[str] = None, visible_to: Optional[list[str]] = None,
                    commit_id: Optional[str] = None, push_id: Optional[str] = None) -> ActivityEvent:
        e = ActivityEvent(
            id=_next_id("event"), actor=actor, type=type, description=description,
            branch=branch, timestamp=time.time(),
            visible_to=visible_to or [], commit_id=commit_id, push_id=push_id,
        )
        self.events.append(e)
        return e

    # ---- helpers -----------------------------------------------------

    def _member(self, name: str) -> Member:
        if name not in self.members:
            raise PermissionError_(f"{name} is not a member of this project.")
        return self.members[name]

    def _require_role(self, name: str, floor: Role, action: str):
        m = self._member(name)
        if not _at_least(m.role, floor):
            raise PermissionError_(
                f"{name} ({m.role.value}) cannot {action} — requires {floor.value}+."
            )

    def _require_branch(self, branch_name: str) -> Branch:
        if branch_name not in self.branches:
            raise KeyError(f"No such branch: {branch_name}")
        return self.branches[branch_name]

    # ---- membership & roles (Section 5) -------------------------------

    @_synchronized
    def invite_member(self, actor: str, new_member: str, role: Role = Role.CONTRIBUTOR):
        self._require_role(actor, Role.MAINTAINER, "invite members")
        self.members[new_member] = Member(new_member, role)
        self.branches["main"].members.add(new_member)
        self._log_event(actor, "member_invited", f"Invited {new_member} as {role.value}")

    @_synchronized
    def remove_contributor(self, actor: str, target: str):
        self._require_role(actor, Role.MAINTAINER, "remove a contributor")
        target_member = self._member(target)
        if target_member.role != Role.CONTRIBUTOR:
            raise PermissionError_("Can only remove members with Contributor role via this action.")
        del self.members[target]
        for b in self.branches.values():
            b.members.discard(target)
        self._log_event(actor, "member_removed", f"Removed {target} from the project")

    @_synchronized
    def grant_maintainer(self, actor: str, target: str):
        self._require_role(actor, Role.OWNER, "grant Maintainer")
        self._member(target).role = Role.MAINTAINER
        self._log_event(actor, "role_changed", f"Made {target} a Maintainer", visible_to=[target])

    @_synchronized
    def revoke_maintainer(self, actor: str, target: str):
        self._require_role(actor, Role.OWNER, "revoke Maintainer")
        m = self._member(target)
        if m.role == Role.MAINTAINER:
            m.role = Role.CONTRIBUTOR
            self._log_event(actor, "role_changed", f"{target} is now a Contributor", visible_to=[target])

    @_synchronized
    def transfer_ownership(self, actor: str, new_owner: str):
        self._require_role(actor, Role.OWNER, "transfer ownership")
        self._member(new_owner)  # must already be a member
        self.members[actor].role = Role.MAINTAINER
        self.members[new_owner].role = Role.OWNER
        self._log_event(actor, "role_changed", f"Transferred ownership to {new_owner}", visible_to=[new_owner])

    @_synchronized
    def delete_project(self, actor: str):
        self._require_role(actor, Role.OWNER, "delete the project")
        self.deleted = True

    # ---- branches (Section 9) -----------------------------------------

    @_synchronized
    def create_branch(self, actor: str, name: str, members: Optional[set[str]] = None,
                       deploy_subdomain: Optional[str] = None):
        if not self.branches_feature_enabled:
            raise PermissionError_("Branches are turned off for this project (Settings -> Accessibility -> Branches).")
        role = self._member(actor).role
        allowed = (
            _at_least(role, Role.MAINTAINER)
            or (role == Role.CONTRIBUTOR and self.branch_creation_open_to_contributors)
        )
        if not allowed:
            raise PermissionError_(f"{actor} is not permitted to create branches.")
        if not name:
            name = self._default_branch_name()   # auto-fill default, naming is optional
        if name in self.branches:
            raise ValueError(f"Branch '{name}' already exists.")
        if deploy_subdomain:
            taken = {b.deploy_subdomain for b in self.branches.values() if b.deploy_subdomain}
            if deploy_subdomain in taken:
                raise ValueError(f"Subdomain '{deploy_subdomain}' is already in use on this project.")
        b = Branch(name=name, deploy_subdomain=deploy_subdomain)
        b.members = members if members is not None else set(self.members.keys())  # defaults to "All from Main"
        self.branches[name] = b
        # Add Branch's default Attachment is Main's current snapshot (Dev
        # Reference §8: "seeds the branch's starting file tree") — seed it
        # by reusing push() itself rather than duplicating the file-merge logic.
        main_files = self.branches["main"].current_files
        if main_files:
            self.push(actor=actor, branch=name,
                       attachment=Attachment(folder_ref="seed-from-main", tree_snapshot=main_files),
                       comment=f"Branch created from Main")
        self._log_event(actor, "branch_created", f"Created branch {name}", branch=name)
        return b

    def _default_branch_name(self) -> str:
        """
        Dev Reference §8: the Name field is optional, and a blank one
        auto-generates rather than blocking the submit -- "{project}-experiment-
        {date}". A second branch made on the same day takes a numeric suffix, so
        the generated name is never itself a collision the user has to resolve.
        """
        slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in self.name)
        while "--" in slug:
            slug = slug.replace("--", "-")
        base = f"{slug.strip('-') or 'project'}-experiment-{time.strftime('%b%d').lower()}"
        if base not in self.branches:
            return base
        n = 2
        while f"{base}-{n}" in self.branches:
            n += 1
        return f"{base}-{n}"

    @_synchronized
    def delete_branch(self, actor: str, name: str):
        if name == "main":
            raise ValueError("Cannot delete Main.")
        self._require_branch(name)
        # "No forced cleanup... can be deleted anytime by whoever has authority."
        # The doc doesn't pin an exact floor for branch deletion the way it does
        # for Deploy/Invite/etc., so this is gated at Contributor+ (i.e. any
        # project member) — revisit if a stricter floor is decided later.
        self._require_role(actor, Role.CONTRIBUTOR, "delete a branch")
        del self.branches[name]

    # ---- commit / push / merge (Section 7 & 8) -------------------------

    @_synchronized
    def commit(self, actor: str, branch: str, attachment: Attachment, comment: str,
               view_by: list[str]) -> Commit:
        self._member(actor)
        self._require_role(actor, Role.CONTRIBUTOR, "commit")  # all roles can commit
        b = self._require_branch(branch)
        for recipient in view_by:
            self._member(recipient)  # must be real members; routing controls signal not access (Sec 7)
        # A proposal is allowed to be heterogeneous -- only Push has to resolve
        # to one unambiguous next state (Section 8) -- so a bundle carrying both
        # a version reference and loose files records BOTH halves here instead of
        # letting the folder silently swallow the files beside it.
        snapshot = attachment.tree_snapshot or {}
        proposed_files = ({**snapshot, **attachment.file_contents}
                          if attachment.folder_ref else dict(attachment.file_contents))
        changed_paths = list(snapshot) if attachment.folder_ref else []
        changed_paths += [p for p in attachment.loose_files if p not in changed_paths]
        diff_stats, total_added, total_removed = diff_stats_for_change(
            b.current_files, {**b.current_files, **proposed_files}, changed_paths
        )
        c = Commit(
            id=_next_id("commit"),
            author=actor,
            branch=branch,
            attachment=attachment,
            comment=comment,
            view_by=view_by,
            timestamp=time.time(),
            diff_stats=diff_stats,
            total_added=total_added,
            total_removed=total_removed,
        )
        b.commits.append(c)
        self._log_event(actor, "commit", f"Committed {comment}", branch=branch,
                         visible_to=view_by, commit_id=c.id)
        return c

    def _find_commit(self, commit_id: str) -> tuple[Branch, Commit]:
        for b in self.branches.values():
            for c in b.commits:
                if c.id == commit_id:
                    return b, c
        raise KeyError(f"No such commit: {commit_id}")

    def _find_push(self, push_id: str) -> PushRecord:
        for b in self.branches.values():
            for p in b.pushes:
                if p.id == push_id:
                    return p
        raise KeyError(f"No such push: {push_id}")

    @_synchronized
    def add_comment(self, actor: str, commit_id: str, text: str) -> Comment:
        """File Detail toolbar's 'Comment' — a threaded note on a commit (Dev Reference §6)."""
        self._member(actor)
        _, c = self._find_commit(commit_id)
        cm = Comment(id=_next_id("comment"), author=actor, text=text, timestamp=time.time())
        c.comments.append(cm)
        return cm

    @_synchronized
    def set_flag(self, actor: str, commit_id: str, flagged: bool) -> None:
        """File Detail toolbar's 'Flag' toggle (Dev Reference §6)."""
        self._member(actor)
        _, c = self._find_commit(commit_id)
        c.flagged = flagged

    @_synchronized
    def retract_commit(self, actor: str, commit_id: str):
        """
        Invariant 6 / Dev Reference §6: retracting an unmerged, un-pushed
        proposal removes the proposal, not history. Once merged or pushed,
        it's history — retraction must be blocked (§6 "Delete/Retract").
        """
        _, c = self._find_commit(commit_id)
        if c.author != actor:
            raise PermissionError_("Only the author can retract their own commit.")
        if c.retracted:
            return
        if c.status in ("merged", "pushed"):
            raise ValueError(
                f"Cannot retract: this commit has already been {c.status} — "
                "it's history now, not a pending proposal."
            )
        c.retracted = True
        self._log_event(actor, "retract", f"Retracted {c.comment}", branch=c.branch, commit_id=c.id)

    @_synchronized
    def merge(self, actor: str, commit_id: str) -> str:
        """
        A recipient adopts a received commit into their own working version.
        Does not change Main. Records that this viewer has merged it, which
        drives the asymmetric Activity label (Dev Reference §2) and blocks
        later retraction (§6).
        """
        _, c = self._find_commit(commit_id)
        if c.retracted:
            raise ValueError("Cannot merge a retracted commit.")
        if not c.visible_to_member(actor):
            raise PermissionError_(f"{actor} was not a recipient of this commit.")
        self._require_role(actor, Role.CONTRIBUTOR, "merge")
        c.merged_by.add(actor)
        self._log_event(actor, "merge", f"Merged {c.comment}", branch=c.branch, commit_id=c.id)
        return f"{actor} merged commit {commit_id} ({c.attachment.describe()}) into their working version."

    @_synchronized
    def unmerge(self, actor: str, commit_id: str) -> str:
        """
        The 'Undo' action on an already-merged commit in Activity — the
        viewer reverses their own adoption. Only removes THIS viewer from
        merged_by; doesn't affect anyone else who also merged it, and never
        touches Main or production (merge never did either).
        """
        _, c = self._find_commit(commit_id)
        if actor not in c.merged_by:
            raise ValueError(f"{actor} hasn't merged this commit — nothing to undo.")
        c.merged_by.discard(actor)
        self._log_event(actor, "unmerge", f"Undid merge of {c.comment}", branch=c.branch, commit_id=c.id)
        return f"{actor} undid their merge of commit {commit_id}."

    @_synchronized
    def push(self, actor: str, branch: str, attachment: Attachment, comment: str) -> PushRecord:
        """
        Promotes a version onto the target line. Enforces the Push-validity
        rule: the attachment must resolve to one unambiguous next state.

        Computes REAL file content for the new version:
          - folder_ref path -> attachment.tree_snapshot replaces the tree wholesale
          - loose_files path -> attachment.file_contents is merged onto the
            previous version's files (only the named paths change)
        """
        self._require_role(actor, Role.CONTRIBUTOR, "push")  # all roles can push
        b = self._require_branch(branch)
        if attachment.is_mixed():
            raise PushInvalidError(
                "Push is invalid: attachment mixes a folder/version reference with "
                "individual loose files — ambiguous whether loose files override or "
                "duplicate what's in the folder. Resolve to one or the other before pushing."
            )
        previous_files = b.current_files
        if attachment.folder_ref:
            new_files = dict(attachment.tree_snapshot or {})
            changed_paths = list(new_files.keys())
        else:
            new_files = dict(previous_files)
            for path in attachment.loose_files:
                new_files[path] = attachment.file_contents.get(path, new_files.get(path, ""))
            changed_paths = attachment.loose_files
        diff_stats, total_added, total_removed = diff_stats_for_change(previous_files, new_files, changed_paths)

        label = b.next_version_label()
        p = PushRecord(
            id=_next_id("push"),
            author=actor,
            branch=branch,
            attachment=attachment,
            comment=comment,
            timestamp=time.time(),
            version_label=label,
            files=new_files,
            diff_stats=diff_stats,
            total_added=total_added,
            total_removed=total_removed,
        )
        b.pushes.append(p)
        self._log_event(actor, "push", f"Pushed {comment or label} to {branch}",
                         branch=branch, push_id=p.id)
        # Invariant 1: advancing Main never changes what production serves.
        # Invariant 7: branch preview auto-reflects this immediately (no action needed here
        # beyond appending to b.pushes — preview_state just reads b.head).
        return p

    @_synchronized
    def push_commit(self, actor: str, commit_id: str, comment: Optional[str] = None) -> PushRecord:
        """
        File Detail's direct 'Push' action (Dev Reference §6): promote a
        specific commit's attachment straight to its branch, marking the
        commit as pushed (locks it from Retract, per §6).
        """
        _, c = self._find_commit(commit_id)
        if c.retracted:
            raise ValueError("Cannot push a retracted commit.")
        p = self.push(actor=actor, branch=c.branch, attachment=c.attachment,
                       comment=comment or c.comment)
        c.pushed = True
        return p

    # ---- deploy / undo (Section 10) ------------------------------------

    @_synchronized
    def deploy(self, actor: str, version_label: Optional[str] = None) -> DeployRecord:
        """
        Explicit, authorized release of a Main version to production.
        Never a side effect of Push. Defaults to Main's current head.
        Copies that version's REAL file content into deployed_files —
        this is what makes production an actual, inspectable snapshot.
        """
        self._require_role(actor, Role.MAINTAINER, "deploy")
        main = self.branches["main"]
        target = version_label or (main.head.version_label if main.head else None)
        if target is None:
            raise ValueError("Nothing has been pushed to Main yet — nothing to deploy.")
        matching = [p for p in main.pushes if p.version_label == target]
        if not matching:
            raise ValueError(f"'{target}' is not a version that exists on Main.")
        d = DeployRecord(id=_next_id("deploy"), author=actor, version_label=target, timestamp=time.time())
        self.deploy_history.append(d)
        self.deployed_version = target
        self.deployed_files = dict(matching[-1].files)
        self._log_event(actor, "deploy", f"Deployed {target} to production", branch="main")
        return d

    @_synchronized
    def undo(self, actor: str, target_version_label: Optional[str] = None) -> DeployRecord:
        """
        The Archive row's action: make a published version the live one, now.

        Named for the direction it is usually travelled — back onto something
        that was live before — but it is not restricted to that. Any version on
        Main's shelf can be applied, including one that has never been live, and
        applying it takes effect immediately. Restoring means the version's REAL
        file content goes back into deployed_files: a genuine content change,
        not a label pointed somewhere else.

        Invariant 5 holds either way: nothing is deleted or rewritten. The
        rollback is appended to deploy_history as a NEW record pointing at an old
        version, so the shelf only ever grows and every past release stays
        readable.

        Invariant 2 also holds, and this is the subtle one: a release is still
        explicit and authorized. Advancing Main by pushing does not touch
        production — it only puts a version on the shelf. Somebody with release
        authority still has to press this.

        With no target, it means the plain rollback: the deployment immediately
        before the current one.
        """
        self._require_role(actor, Role.MAINTAINER, "undo (rollback)")
        main = self.branches["main"]
        if target_version_label is None:
            if len(self.deploy_history) < 2:
                raise ValueError("No prior deployment to roll back to.")
            target_version_label = self.deploy_history[-2].version_label
        matching = [p for p in main.pushes if p.version_label == target_version_label]
        if not matching:
            raise ValueError(f"'{target_version_label}' is not a version that exists on Main.")
        # Undo itself is recorded as a new deploy event pointing at an old version —
        # it doesn't delete or rewrite deploy_history, satisfying Invariant 5.
        d = DeployRecord(id=_next_id("deploy"), author=actor, version_label=target_version_label, timestamp=time.time())
        self.deploy_history.append(d)
        self.deployed_version = target_version_label
        self.deployed_files = dict(matching[-1].files)
        self._log_event(actor, "undo", f"Undo {target_version_label} to main", branch="main")
        return d

    @_synchronized
    def production_file_tree(self) -> list[dict]:
        """What's actually live right now, as a nested checkbox-tree (Archive surface)."""
        return build_file_tree(self.deployed_files)

    # ---- surfaces (Section 6), read-only views -------------------------

    @_synchronized
    def activity_feed(self) -> list[Commit]:
        """What's being offered, by whom, across the whole team (non-retracted)."""
        out = []
        for b in self.branches.values():
            out.extend(c for c in b.commits if not c.retracted)
        return sorted(out, key=lambda c: c.timestamp)

    @_synchronized
    def activity_feed_for_viewer(self, viewer: str) -> list[dict]:
        """
        Dev Reference §2 — the asymmetric action label, driven by the shared
        event ledger. Matches the Figma Activity screen exactly: ONE row per
        commit (its action changes dynamically, no separate "Merged"/"Undid
        merge" row appears), plus one row per push and one per undo. Deploy
        events are logged to the ledger (for audit/Team-profile use) but
        deliberately don't appear here — the Figma design doesn't show them
        in Activity either; that's what the Archive surface is for.

        Per row:
          - push / undo             -> always "View" for everyone
          - commit, viewer = author -> "View"
          - commit, viewer addressed, not yet merged -> "Merge"
          - commit, viewer already merged it -> "Undo" (reverse their own
            merge — see unmerge())
          - commit not addressed to viewer, or retracted -> omitted entirely
        """
        self._member(viewer)
        rows = []
        for e in sorted(self.events, key=lambda e: e.timestamp):
            if e.type == "commit":
                c = self._find_commit(e.commit_id)[1]
                if c.retracted or not c.visible_to_member(viewer):
                    continue
                if viewer == c.author:
                    action = "View"
                elif viewer in c.merged_by:
                    action = "Undo"
                else:
                    action = "Merge"
            elif e.type in ("push", "undo"):
                action = "View"
            elif e.type == "role_changed" and viewer in e.visible_to:
                # A role change has to reach the person it happened to (Dev
                # Reference §5) rather than being discovered as a new Settings
                # section on some later visit. There is no notification surface
                # in this product, so it arrives the way everything else does --
                # as a ledger row, addressed. An entry with an explicit
                # `visible_to` is exactly that: addressed to somebody in
                # particular, and shown to nobody else.
                action = "View"
            else:
                continue  # merge/unmerge/retract/deploy/member_* don't render their own row
            row = {
                "event_id": e.id,
                "actor": e.actor,
                "type": e.type,
                "description": e.description,
                "branch": e.branch,
                "commit_id": e.commit_id,
                "timestamp": e.timestamp,
                "action": action,
            }
            if e.type == "commit":
                row["diff"] = {"added": c.total_added, "removed": c.total_removed}
                row["flagged"] = c.flagged
                row["comment_count"] = len(c.comments)
            rows.append(row)
        return rows

    @_synchronized
    def file_tree(self, branch_name: str = "main") -> list[dict]:
        """Main surface's checkbox-tree file view for a given branch — real content, not labels."""
        return self._require_branch(branch_name).file_tree()

    @_synchronized
    def archive(self) -> Optional[DeployRecord]:
        """What users are actually running, right now."""
        return self.deploy_history[-1] if self.deploy_history else None

    @_synchronized
    def archive_history(self) -> list[dict]:
        """
        Deploy audit log — every deploy()/undo() call, newest first, with
        is_live on exactly one row. Never mutated (Invariant 5). This is
        the internal audit trail; the Archive SURFACE the frontend renders
        is archive_surface() below, which lists every Main VERSION, not
        just the ones that were ever deployed.
        """
        current = self.deployed_version
        return [
            {
                "deploy_id": d.id,
                "version_label": d.version_label,
                "deployed_by": d.author,
                "deployed_at": d.timestamp,
                "is_live": (d.version_label == current and d is self.deploy_history[-1]),
            }
            for d in reversed(self.deploy_history)
        ]

    @_synchronized
    def archive_surface(self) -> list[dict]:
        """
        Dev Reference §3, matched to the Figma Archive screen exactly: every
        version ever published to Main, newest first. The currently live one
        shows "Applied"; every other row shows "Undo", and pressing it makes
        that version live immediately — see undo().

        Two words, and only two, on purpose. This surface answers one question
        — what are users running, and what were they running before — so every
        row that is not the answer is a way to change the answer. There is no
        third state to distinguish and no third word to draw.
        """
        main = self.branches["main"]
        current = self.deployed_version
        return [
            {
                "version_label": p.version_label,
                "pushed_by": p.author,
                "time": p.timestamp,
                "action": "Applied" if p.version_label == current else "Undo",
            }
            for p in reversed(main.pushes)
        ]

    @_synchronized
    def files_at_version(self, branch_name: str, version_label: str) -> dict[str, str]:
        """
        The REAL file content of one version, path -> content.

        This is what an attachment's `version_ref` resolves to (Dev Reference
        §0: an attachment is files[] *or* a version_ref). The client names a
        version it can already see; the server is the only side holding the
        bytes, so the snapshot is assembled here rather than uploaded.
        """
        b = self._require_branch(branch_name)
        matching = [p for p in b.pushes if p.version_label == version_label]
        if not matching:
            raise KeyError(f"'{version_label}' is not a version that exists on {branch_name}.")
        return dict(matching[-1].files)

    @_synchronized
    def file_content_at_version(self, branch_name: str, version_label: str, path: str) -> str:
        """Raw content of one file at one historical version — proves byte-for-byte correctness, not just that a tree node exists."""
        files = self.files_at_version(branch_name, version_label)
        if path not in files:
            raise KeyError(f"'{path}' does not exist in version '{version_label}'.")
        return files[path]

    @_synchronized
    def file_tree_at_version(self, branch_name: str, version_label: str) -> list[dict]:
        """
        Inspect ANY historical version's file tree, not just the current
        head — proves every version is genuinely retained and retrievable,
        not just the latest. Backs an Archive row's 'preview this version'
        action.
        """
        return build_file_tree(self.files_at_version(branch_name, version_label))

    @_synchronized
    def team_view(self) -> list[Member]:
        return list(self.members.values())

    @_synchronized
    def member_activity(self, member: str) -> list[dict]:
        """Team profile's per-person activity list (Dev Reference §5) — same
        ledger, filtered to one author, WITH diff stats (the '+45 -0' figure).

        `description` is the fused log line ("Committed refined ContentView.js
        v2.1"). The pane wants the pieces apart rather than the sentence: the
        row names the artefact and the comment is read underneath the file it
        was written about. So each row also carries the raw `comment`, and
        enough to name the artefact — the paths a commit changed, or the
        version a push produced.
        """
        self._member(member)
        rows = []
        for e in sorted(self.events, key=lambda e: e.timestamp):
            if e.actor != member or e.type not in ("commit", "push"):
                continue
            row = {
                "event_id": e.id, "type": e.type, "description": e.description,
                "branch": e.branch, "commit_id": e.commit_id, "timestamp": e.timestamp,
            }
            if e.type == "commit":
                c = self._find_commit(e.commit_id)[1]
                row["diff"] = {"added": c.total_added, "removed": c.total_removed}
                row["comment"] = c.comment
                # diff_stats is keyed by exactly the paths the commit changed,
                # whether it arrived as a folder snapshot or as loose files.
                row["files"] = list(c.diff_stats.keys())
                # Retract is only valid on a pending proposal (§6 / Invariant 6),
                # so the surface has to know which one this is before offering it.
                row["status"] = c.status
                row["flagged"] = c.flagged
            elif e.type == "push":
                p = self._find_push(e.push_id)
                row["diff"] = {"added": p.total_added, "removed": p.total_removed}
                row["comment"] = p.comment
                # No file list: a push promotes a whole version, so the row
                # names the project at this label rather than its contents.
                row["version_label"] = p.version_label
            rows.append(row)
        return rows

    # ---- settings (Dev Reference §4) ------------------------------------

    @_synchronized
    def get_settings(self) -> dict:
        return {
            "anyone_with_link": self.anyone_with_link,
            "invite_token": self.invite_token,
            "default_invite_role": self.default_invite_role.value,
            "branches_feature_enabled": self.branches_feature_enabled,
            "branch_creation_open_to_contributors": self.branch_creation_open_to_contributors,
            "production_visibility": self.production_visibility,
            "custom_domain": self.custom_domain,
        }

    @_synchronized
    def set_anyone_with_link(self, actor: str, enabled: bool):
        self._require_role(actor, Role.MAINTAINER, "change link-join settings")
        self.anyone_with_link = enabled

    @_synchronized
    def regenerate_invite_link(self, actor: str) -> str:
        self._require_role(actor, Role.MAINTAINER, "regenerate the invite link")
        self.invite_token = _next_id("invite").replace("invite-", "tok-")
        return self.invite_token

    @_synchronized
    def set_default_invite_role(self, actor: str, role: Role):
        self._require_role(actor, Role.MAINTAINER, "change the default invite role")
        self.default_invite_role = role

    @_synchronized
    def set_branches_enabled(self, actor: str, enabled: bool):
        self._require_role(actor, Role.OWNER, "turn Branches on or off")
        self.branches_feature_enabled = enabled

    @_synchronized
    def set_branch_creation_authority(self, actor: str, open_to_contributors: bool):
        self._require_role(actor, Role.OWNER, "change who can create branches")
        self.branch_creation_open_to_contributors = open_to_contributors

    @_synchronized
    def set_production_visibility(self, actor: str, visibility: str):
        self._require_role(actor, Role.MAINTAINER, "change production visibility")
        if visibility not in ("public", "private"):
            raise ValueError("visibility must be 'public' or 'private'.")
        self.production_visibility = visibility

    @_synchronized
    def set_custom_domain(self, actor: str, domain: Optional[str]):
        self._require_role(actor, Role.MAINTAINER, "change the custom domain")
        self.custom_domain = domain