"""
The project: everything else in this package tied together, plus the rules
that hold between the pieces.

Read this file as a set of invariants rather than as a set of methods:

1. Advancing Main never changes what production serves. A push puts a version
   on the shelf; a deploy is what makes one live.
2. A release is always explicit and authorized. Nothing deploys as a side
   effect of anything else.
3. A commit is a proposal. It changes neither Main nor production, and merging
   one is a private act that changes only the merger's own view.
4. History is append-only. Retract sets a flag, undo appends a new deploy
   record pointing at an old version, and no record is ever deleted.
5. A branch preview reflects that branch's latest push automatically; Main's
   preview is production, which does not.
6. Every member has their own copy of a branch, and only their own merges
   change it. Authoring a commit is a proposal to other people, never an edit
   of your own files.
"""

from __future__ import annotations

import re
import threading
import time
from collections.abc import Callable
from functools import wraps
from typing import Any

from .attachments import Attachment, apply_attachment, build_file_tree
from .branch import Branch
from .diffing import diff_stats_for_change
from .errors import PermissionError_, PushInvalidError
from .ids import new_invite_token, next_id
from .records import (
    ActivityEvent,
    Comment,
    Commit,
    DeployRecord,
    JoinRequest,
    PushRecord,
    RoleNotice,
    WorkingVersion,
)
from .roles import Member, Role, at_least

# A hostname and nothing else: labels of letters, digits and hyphens joined by
# dots. Deliberately strict, because this value is interpolated into an href
# the whole product links to; anything carrying a scheme, a path, a credential
# or whitespace is rejected here rather than rendered.
_HOSTNAME = re.compile(
    r"^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
    r"(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$"
)

# A deploy subdomain is one label of the same alphabet — it is a prefix onto
# the product's own domain, never a host in its own right.
_LABEL = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")

# What the shared Activity feed shows, and therefore what it does not.
#
# Two kinds of event are deliberately absent even though both are recorded.
# Deployments — "deploy" and "undo" — belong to the Archive, which answers what
# production is running and what it ran before; repeating them here would put
# the same fact on two surfaces that can then disagree. Role changes are
# addressed to one person and are read as a notice they are shown directly,
# rather than as a line in a history everybody scrolls.
#
# The rest of the ledger is here: who joined or left, what changed about the
# project, and the work itself. Kept as one named set so that changing what the
# feed carries is this list rather than a walk through the function below.
_FEED_TYPES = frozenset({
    "commit",
    "push",
    "branch_created",
    "member_invited",
    "member_joined",
    "join_requested",
    "member_removed",
    "branch_members_changed",
    "settings_changed",
})

# What a version may not be called. A label is not decoration: it addresses the
# version in a URL path (`/branches/{b}/versions/{label}/files`) and keys the
# branch's label index, so a slash would be read as route structure and a
# control character would not survive the round trip. Everything else a person
# might type — spaces, punctuation, another alphabet — is allowed, because
# there is no reason a version cannot be called "Ocean rewrite".
_LABEL_FORBIDDEN = ("/", "\\")


def _resolve_version_label(branch: Branch, requested: str | None) -> str:
    """
    The label this push will carry: the one its author asked for, or the next
    one on the line if they asked for nothing.

    A chosen label is refused rather than adjusted when it is already taken.
    Silently appending a "-2" would give somebody a version under a name they
    did not choose, and the labels here are what every other surface addresses
    a version by — Archive's rows, undo, the file browser. Better to say so.
    """
    if requested is None or not requested.strip():
        return branch.next_version_label()
    label = requested.strip()
    if any(bad in label for bad in _LABEL_FORBIDDEN) or any(ch < " " for ch in label):
        raise ValueError(
            f"'{label}' is not a usable version name: a name cannot contain a slash "
            "or a control character."
        )
    if branch.version(label) is not None:
        raise ValueError(
            f"'{label}' is already a version on {branch.name}. Versions are addressed "
            "by name, so two of them cannot share one."
        )
    return label


def synchronized[F: Callable[..., Any]](method: F) -> F:
    """
    Run a Project method's entire body under that project's lock.

    Why this matters concretely: ``push`` reads a branch's current file state,
    merges the new changes into it, then appends a new snapshot. Without this,
    two members pushing different files at nearly the same moment can each
    read the same stale snapshot, and the second push silently reverts the
    first one's already-completed change. Making the read-merge-append
    sequence atomic per project is what stops that.
    """

    @wraps(method)
    def wrapper(self: Project, *args: Any, **kwargs: Any) -> Any:
        with self._lock:
            return method(self, *args, **kwargs)

    return wrapper  # type: ignore[return-value]


class Project:
    def __init__(
        self,
        owner_name: str,
        name: str | None = None,
        branch_creation_open_to_contributors: bool = False,
    ):
        self.members: dict[str, Member] = {owner_name: Member(owner_name, Role.OWNER)}
        self.branch_creation_open_to_contributors = branch_creation_open_to_contributors

        main = Branch(name="main", is_main=True)
        main.members = set(self.members)
        self.branches: dict[str, Branch] = {"main": main}

        # Production state, deliberately decoupled from Main's push history.
        self.deployed_version: str | None = None
        self.deployed_files: dict[str, str] = {}
        self.deploy_history: list[DeployRecord] = []

        # The shared ledger. Appended in wall-clock order and never reordered,
        # which is what lets every reader iterate it directly instead of
        # sorting a list that is already in the order it wants.
        self.events: list[ActivityEvent] = []

        # Records by id. Resolving a commit used to mean walking every branch
        # and every commit on it, once per row — which made rendering an
        # activity feed quadratic in the size of the project's history. These
        # indexes hold the same objects, addressed rather than searched for.
        self._commits: dict[str, Commit] = {}
        self._pushes: dict[str, PushRecord] = {}

        # Each member's own copy of each branch, as an ordered history that is
        # appended to and never truncated -- (member, branch) -> states, oldest
        # first. This is what an undo restores *from*: without real content
        # here, "unmerge" could only forget a flag.
        self._working: dict[tuple[str, str], list[WorkingVersion]] = {}

        # People asking to be let in, by name. A set rather than a log: a second
        # request from the same person is refused rather than queued.
        self._join_requests: dict[str, JoinRequest] = {}

        # The latest "your role changed" message per member, overwritten on each
        # change. Read by that member and by the Owner, and by nobody else.
        self._role_notices: dict[str, RoleNotice] = {}

        # Main starts at a version rather than at nothing. A project is created
        # whole — Owner, branch, membership, access link and a state to branch
        # from — so there is never a window in which the project exists but has
        # no version anybody can point at. It is recorded directly rather than
        # through push(): nobody pushed it, and it should not read as though
        # somebody did. The label sits outside the counter's sequence, so the
        # first real push is still V1.
        initial = PushRecord(
            id=next_id("push"),
            author=owner_name,
            branch="main",
            attachment=Attachment(folder_ref="initial", tree_snapshot={}),
            comment="Project created",
            timestamp=time.time(),
            version_label="V0",
            files={},
        )
        main.record_push(initial)
        self._pushes[initial.id] = initial

        # Identity and the deploy URL. `domain` is auto-provisioned from the
        # name; `custom_domain` is optional and overrides it once set.
        self.name: str = name or f"{owner_name}'s project"
        self.domain: str = self._slugify(self.name) + ".cseudocode.com"
        self.preview_image: str | None = None

        # Settings surface.
        self.anyone_with_link: bool = True
        self.invite_token: str = new_invite_token()
        self.default_invite_role: Role = Role.CONTRIBUTOR
        self.branches_feature_enabled: bool = True
        self.production_visibility: str = "private"
        self.custom_domain: str | None = None

        self.deleted = False
        # Reentrant, because push_commit() and create_branch() both call
        # push() from inside their own critical section.
        self._lock = threading.RLock()

    # ---- identity -------------------------------------------------------

    @staticmethod
    def _slugify(text: str) -> str:
        slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in text)
        while "--" in slug:
            slug = slug.replace("--", "-")
        return slug.strip("-") or "project"

    def live_domain(self) -> str:
        """What the Deploy row links to: the custom domain if set, else the default."""
        return self.custom_domain or self.domain

    @synchronized
    def overview(self) -> dict[str, Any]:
        """
        The Main screen's top card: preview, project name and current version,
        deploy URL, and the branch list for the switcher — four pieces of data
        the frontend needs together, in one call.
        """
        main = self.branches["main"]
        return {
            "preview_image": self.preview_image,
            "project_name": self.name,
            "current_version": main.head.version_label if main.head else None,
            # Null until the first deploy. A push alone never sets this, which
            # is Invariant 1 visible on screen.
            "deploy_url": self.live_domain() if self.deployed_version else None,
            "branches": [
                {
                    "name": b.name,
                    "is_main": b.is_main,
                    "latest_version": b.head.version_label if b.head else None,
                }
                for b in self.branches.values()
            ],
        }

    @synchronized
    def rename_project(self, actor: str, new_name: str | None) -> None:
        """
        Rename, and re-provision the default domain to match.

        The domain is derived from the name, so leaving it behind would point
        the Deploy row at a host named after a project that no longer exists.
        A project set up with a custom domain is unaffected — that overrides
        the default either way.
        """
        self._require_role(actor, Role.MAINTAINER, "rename the project")
        cleaned = (new_name or "").strip()
        if not cleaned:
            raise ValueError("A project name cannot be empty.")
        self.name = cleaned
        self.domain = self._slugify(cleaned) + ".cseudocode.com"
        self._log_event(actor, "settings_changed", f"Project renamed to {cleaned}")

    @synchronized
    def set_preview_image(self, actor: str, image_ref: str) -> None:
        self._require_role(actor, Role.MAINTAINER, "set the preview image")
        self.preview_image = image_ref

    # ---- shared activity ledger -----------------------------------------

    def _log_event(
        self,
        actor: str,
        type: str,
        description: str,
        branch: str | None = None,
        visible_to: list[str] | None = None,
        commit_id: str | None = None,
        push_id: str | None = None,
    ) -> ActivityEvent:
        event = ActivityEvent(
            id=next_id("event"),
            actor=actor,
            type=type,
            description=description,
            branch=branch,
            timestamp=time.time(),
            visible_to=visible_to or [],
            commit_id=commit_id,
            push_id=push_id,
        )
        self.events.append(event)
        return event

    # ---- helpers ---------------------------------------------------------

    def _owner(self) -> str:
        """Whose project this is. Exactly one member holds the role."""
        return next(name for name, m in self.members.items() if m.role == Role.OWNER)

    def _member(self, name: str) -> Member:
        if name not in self.members:
            raise PermissionError_(f"{name} is not a member of this project.")
        return self.members[name]

    def _require_role(self, name: str, floor: Role, action: str) -> None:
        member = self._member(name)
        if not at_least(member.role, floor):
            raise PermissionError_(
                f"{name} ({member.role.value}) cannot {action} — requires {floor.value}+."
            )

    def _require_branch(self, branch_name: str) -> Branch:
        if branch_name not in self.branches:
            raise KeyError(f"No such branch: {branch_name}")
        return self.branches[branch_name]

    def find_commit(self, commit_id: str) -> Commit:
        """
        Resolve a commit by id.

        Public, because the HTTP layer legitimately needs it to list a
        commit's comments and should not have to reach into a private helper
        to do so.
        """
        commit = self._commits.get(commit_id)
        if commit is None:
            raise KeyError(f"No such commit: {commit_id}")
        return commit

    def find_push(self, push_id: str) -> PushRecord:
        push = self._pushes.get(push_id)
        if push is None:
            raise KeyError(f"No such push: {push_id}")
        return push

    # ---- membership & roles ---------------------------------------------

    @synchronized
    def invite_member(
        self, actor: str, new_member: str, role: Role = Role.CONTRIBUTOR
    ) -> None:
        """
        Add somebody to the project.

        Refuses a name already on it rather than overwriting the entry. Without
        that check, "inviting" the Owner as a Contributor would silently
        demote them — a privilege change disguised as an add, available to any
        Maintainer. Changing an existing member's role goes through
        grant/revoke, which is Owner-only.
        """
        self._require_role(actor, Role.MAINTAINER, "invite members")
        if not new_member.strip():
            raise ValueError("A member needs a name.")
        if new_member in self.members:
            raise ValueError(f"{new_member} is already a member of this project.")
        self.members[new_member] = Member(new_member, role)
        self.branches["main"].members.add(new_member)
        self._log_event(actor, "member_invited", f"Invited {new_member} as {role.value}")

    @synchronized
    def request_join(self, token: str, name: str) -> dict[str, Any]:
        """
        Somebody arriving through the project's link.

        The link is an access mechanism and never an authority: it decides
        whether you may ask to come in, not what you may do once you are here.
        Which of the two things it does is the project's own setting — either it
        admits people outright at the default invite role, or it opens a request
        the Owner answers.

        Both refusals here are about the same thing: a request is a thing you
        have or have not made, not something that queues. Somebody already in
        has nothing to ask for, and somebody already waiting is already waiting.
        """
        if token != self.invite_token:
            raise PermissionError_("That link is not valid for this project.")
        name = name.strip()
        if not name:
            raise ValueError("A member needs a name.")
        if name in self.members:
            raise ValueError(f"{name} is already a member of this project.")
        if name in self._join_requests:
            raise ValueError(f"{name} has already asked to join this project.")

        if self.anyone_with_link:
            self._admit(name, self.default_invite_role, actor=name)
            return {"status": "joined", "role": self.default_invite_role.value}

        self._join_requests[name] = JoinRequest(name=name, requested_at=time.time())
        # Addressed to the Owner: it is a thing only they can act on, and the
        # rest of the team has no business knowing who asked and was refused.
        self._log_event(
            name,
            "join_requested",
            f"{name} asked to join the project",
            visible_to=[self._owner()],
        )
        return {"status": "pending"}

    def _admit(self, name: str, role: Role, actor: str) -> None:
        """Put somebody on the project. One event type, however they got here."""
        self.members[name] = Member(name, role)
        self.branches["main"].members.add(name)
        self._log_event(actor, "member_joined", f"{name} joined the project")

    @synchronized
    def join_requests(self, actor: str) -> list[dict[str, Any]]:
        """Who is waiting, oldest first. The Owner's list and nobody else's."""
        self._require_role(actor, Role.OWNER, "see who has asked to join")
        return [
            {"name": request.name, "requested_at": request.requested_at}
            for request in sorted(self._join_requests.values(), key=lambda r: r.requested_at)
        ]

    @synchronized
    def approve_join(self, actor: str, name: str, role: Role | None = None) -> None:
        """
        Let a waiting person in, at a chosen role or the project's default.

        Admission logs the same event as an instant join, because it is the same
        fact: this person is on the project now. How long they waited for it is
        not something the team's history needs to distinguish.
        """
        self._require_role(actor, Role.OWNER, "approve a join request")
        if name not in self._join_requests:
            raise KeyError(f"{name} has not asked to join this project.")
        del self._join_requests[name]
        self._admit(name, role or self.default_invite_role, actor=actor)

    @synchronized
    def reject_join(self, actor: str, name: str) -> None:
        """
        Turn a request down.

        Deliberately silent: no event, no notice, nothing the rejected person
        can read. A refusal that announces itself to the team is a judgement
        published about somebody who is not there to answer it.
        """
        self._require_role(actor, Role.OWNER, "reject a join request")
        if name not in self._join_requests:
            raise KeyError(f"{name} has not asked to join this project.")
        del self._join_requests[name]

    @synchronized
    def remove_contributor(self, actor: str, target: str) -> None:
        self._require_role(actor, Role.MAINTAINER, "remove a contributor")
        target_member = self._member(target)
        if target_member.role != Role.CONTRIBUTOR:
            raise PermissionError_(
                "Can only remove members with Contributor role via this action."
            )
        del self.members[target]
        for branch in self.branches.values():
            branch.members.discard(target)
        # Their own copy of every branch goes with them. Somebody re-invited
        # under the same name is a new arrival, not a returning session: they
        # start from where the project is now, rather than resuming a working
        # state assembled from commits that may since have been pushed,
        # retracted, or superseded.
        for key in [key for key in self._working if key[0] == target]:
            del self._working[key]
        self._role_notices.pop(target, None)
        self._log_event(actor, "member_removed", f"Removed {target} from the project")

    def _change_role(self, actor: str, member: Member, new_role: Role, description: str) -> None:
        """
        Move a member between roles, leaving both trails behind.

        Two records, not one, and they answer different questions. The activity
        event is the project's audit line — it happened, this is who did it, and
        it is never overwritten. The notice is what the affected member reads to
        find out, and it is overwritten each time because what they need is
        their role now, not a list of every role they have held.
        """
        old_role = member.role
        member.role = new_role
        self._log_event(actor, "role_changed", description, visible_to=[member.name])
        self._role_notices[member.name] = RoleNotice(
            member=member.name,
            old_role=old_role.value,
            new_role=new_role.value,
            changed_by=actor,
            timestamp=time.time(),
        )

    @synchronized
    def grant_maintainer(self, actor: str, target: str) -> None:
        self._require_role(actor, Role.OWNER, "grant Maintainer")
        member = self._member(target)
        if member.role == Role.OWNER:
            raise ValueError("The Owner already outranks Maintainer.")
        self._change_role(actor, member, Role.MAINTAINER, f"Made {target} a Maintainer")

    @synchronized
    def revoke_maintainer(self, actor: str, target: str) -> None:
        self._require_role(actor, Role.OWNER, "revoke Maintainer")
        member = self._member(target)
        if member.role == Role.MAINTAINER:
            self._change_role(
                actor, member, Role.CONTRIBUTOR, f"{target} is now a Contributor"
            )

    @synchronized
    def role_notice(self, actor: str, member: str) -> dict[str, Any] | None:
        """
        The "your role changed" message for one member, or None if their role
        has never been changed.

        Readable by that member and by the Owner, and by nobody else: it names
        who changed somebody's authority and to what, which is the Owner's
        business and the affected member's, not the whole team's.
        """
        self._member(member)
        if actor != member and self._member(actor).role != Role.OWNER:
            raise PermissionError_(
                "A role-change notice is read by the member it is about, or by the Owner."
            )
        notice = self._role_notices.get(member)
        if notice is None:
            return None
        return {
            "member": notice.member,
            "old_role": notice.old_role,
            "new_role": notice.new_role,
            "changed_by": notice.changed_by,
            "timestamp": notice.timestamp,
        }

    @synchronized
    def transfer_ownership(self, actor: str, new_owner: str) -> None:
        """
        Hand the project over. The outgoing Owner keeps Maintainer, which is a
        rank too low to take it back — the transfer is real, not a loan.
        """
        self._require_role(actor, Role.OWNER, "transfer ownership")
        self._member(new_owner)  # must already be a member
        if new_owner == actor:
            raise ValueError("You already own this project.")
        # Both people's authority changes, so both are told. The outgoing Owner
        # needs to know as much as the incoming one — more, arguably, since
        # theirs is the authority that was given away.
        self._change_role(
            actor,
            self.members[new_owner],
            Role.OWNER,
            f"Transferred ownership to {new_owner}",
        )
        self._change_role(
            actor,
            self.members[actor],
            Role.MAINTAINER,
            f"{actor} stepped down to Maintainer",
        )

    @synchronized
    def delete_project(self, actor: str) -> None:
        """
        Mark the project deleted.

        Nothing is erased — history is append-only here as everywhere else —
        but the store stops serving a deleted project, so every route answers
        404 from this point on. Tombstoning rather than dropping the object
        keeps the door open for an undelete window without a schema change.
        """
        self._require_role(actor, Role.OWNER, "delete the project")
        self.deleted = True

    # ---- branches --------------------------------------------------------

    @synchronized
    def create_branch(
        self,
        actor: str,
        name: str,
        members: set[str] | None = None,
        deploy_subdomain: str | None = None,
        from_version: str | None = None,
    ) -> Branch:
        """
        Open a line off Main.

        ``from_version`` names the version of Main to start from; without one a
        branch starts from wherever Main is now, which is what somebody
        branching to try something almost always means. Naming one is how you
        branch off a state the project has since moved past — reopening a
        version to carry on from it rather than to put it back.
        """
        if not self.branches_feature_enabled:
            raise PermissionError_(
                "Branches are turned off for this project "
                "(Settings -> Accessibility -> Branches)."
            )
        role = self._member(actor).role
        allowed = at_least(role, Role.MAINTAINER) or (
            role == Role.CONTRIBUTOR and self.branch_creation_open_to_contributors
        )
        if not allowed:
            raise PermissionError_(f"{actor} is not permitted to create branches.")

        name = name.strip() or self._default_branch_name()
        if name in self.branches:
            raise ValueError(f"Branch '{name}' already exists.")
        if deploy_subdomain:
            if not _LABEL.match(deploy_subdomain):
                raise ValueError(
                    "A deploy subdomain must be a single label of letters, digits and "
                    "hyphens — it is a prefix onto the product's domain, not a URL."
                )
            taken = {b.deploy_subdomain for b in self.branches.values() if b.deploy_subdomain}
            if deploy_subdomain in taken:
                raise ValueError(
                    f"Subdomain '{deploy_subdomain}' is already in use on this project."
                )
        if members is not None:
            for member in members:
                self._member(member)

        branch = Branch(name=name, deploy_subdomain=deploy_subdomain)
        # Defaults to "All from Main", which is what the Add Branch sheet opens on.
        branch.members = set(members) if members is not None else set(self.members)
        self.branches[name] = branch

        # Seeded by reusing push() rather than by copying the file-merge logic,
        # so a branch's first version is produced the same way every later one
        # is.
        main = self.branches["main"]
        if from_version is None:
            main_files = main.current_files
            source = "Main"
        else:
            version = main.version(from_version)
            if version is None:
                raise KeyError(f"'{from_version}' is not a version that exists on Main.")
            main_files = version.files
            source = from_version
        if main_files:
            self.push(
                actor=actor,
                branch=name,
                attachment=Attachment(folder_ref="seed-from-main", tree_snapshot=main_files),
                comment=f"Branch created from {source}",
            )
        self._log_event(actor, "branch_created", f"Created branch {name}", branch=name)
        # Being put on a branch is a thing that happened to you, so it is said
        # to you. Addressed rather than broadcast: the team already has the
        # branch-created row above, and does not need one line per person on it.
        for member in sorted(branch.members - {actor}):
            self._log_event(
                actor,
                "branch_members_changed",
                f"You were added to branch {name}",
                branch=name,
                visible_to=[member],
            )
        return branch

    def _default_branch_name(self) -> str:
        """
        A blank Name field auto-generates rather than blocking the submit:
        "{project}-experiment-{date}". A second branch made on the same day
        takes a numeric suffix, so the generated name is never itself a
        collision the user has to resolve.
        """
        base = f"{self._slugify(self.name)}-experiment-{time.strftime('%b%d').lower()}"
        if base not in self.branches:
            return base
        n = 2
        while f"{base}-{n}" in self.branches:
            n += 1
        return f"{base}-{n}"

    # There is deliberately no delete_branch. One existed, unreachable — no
    # route, no test, no control in the design — and it dropped the branch from
    # `self.branches` and nothing else: the commit and push indexes, the working
    # copies keyed by (member, branch), and every ledger row naming that branch
    # all stayed behind. Anything wired to it would have been resolving commits
    # on a branch that no longer existed. Deleting a branch means deciding what
    # happens to the history hanging off it, and the product has not asked that
    # question yet — see NEXT-STEPS.md rather than reintroducing the shortcut.

    # ---- commit / push / merge -------------------------------------------

    @synchronized
    def commit(
        self,
        actor: str,
        branch: str,
        attachment: Attachment,
        comment: str,
        view_by: list[str],
        name: str | None = None,
    ) -> Commit:
        # Every role can commit — a proposal is the one thing anybody on the
        # project may make.
        self._require_role(actor, Role.CONTRIBUTOR, "commit")
        b = self._require_branch(branch)
        for recipient in view_by:
            # Recipients must be real members: routing controls signal, not
            # access, but it cannot route to somebody who is not here.
            self._member(recipient)

        # A proposal may be heterogeneous: only Push has to resolve to one
        # unambiguous next state. So a bundle carrying both a version
        # reference and loose files records both halves here, instead of
        # letting the folder silently swallow the files beside it.
        snapshot = attachment.tree_snapshot or {}
        proposed_files = (
            {**snapshot, **attachment.file_contents}
            if attachment.folder_ref
            else dict(attachment.file_contents)
        )
        changed_paths = list(snapshot) if attachment.folder_ref else []
        changed_paths += [p for p in attachment.loose_files if p not in changed_paths]

        diff_stats, total_added, total_removed = diff_stats_for_change(
            b.current_files, {**b.current_files, **proposed_files}, changed_paths
        )
        record = Commit(
            id=next_id("commit"),
            author=actor,
            branch=branch,
            attachment=attachment,
            comment=comment,
            view_by=view_by,
            timestamp=time.time(),
            # Required of anything arriving over the API; blank only for the
            # seed, whose commits are named by the files they changed.
            name=(name or "").strip(),
            diff_stats=diff_stats,
            total_added=total_added,
            total_removed=total_removed,
        )
        b.commits.append(record)
        self._commits[record.id] = record
        self._log_event(
            actor,
            "commit",
            # The row names what was committed, not what was said about it. The
            # two used to be one field and the log line had to quote the message
            # for want of anything better; a commit now carries its own name, so
            # the message is free to be a paragraph and is read under the file it
            # was written about instead. The fallback is for the callers the API
            # does not reach -- the demo seed builds history directly.
            f"Committed {record.name or comment}",
            branch=branch,
            visible_to=view_by,
            commit_id=record.id,
        )
        return record

    @synchronized
    def add_comment(self, actor: str, commit_id: str, text: str) -> Comment:
        """A threaded note on a commit — the File Detail toolbar's "Comment"."""
        self._member(actor)
        commit = self.find_commit(commit_id)
        if not text.strip():
            raise ValueError("A comment cannot be empty.")
        note = Comment(id=next_id("comment"), author=actor, text=text, timestamp=time.time())
        commit.comments.append(note)
        return note

    @synchronized
    def set_flag(self, actor: str, commit_id: str, flagged: bool) -> None:
        """The File Detail toolbar's "Flag" toggle."""
        self._member(actor)
        self.find_commit(commit_id).flagged = flagged

    @synchronized
    def retract_commit(self, actor: str, commit_id: str) -> None:
        """
        Withdrawing an unmerged, un-pushed proposal removes the proposal, not
        history. Once merged or pushed it *is* history, and retraction is
        refused.
        """
        commit = self.find_commit(commit_id)
        if commit.author != actor:
            raise PermissionError_("Only the author can retract their own commit.")
        if commit.retracted:
            return
        if commit.status in ("merged", "pushed"):
            raise ValueError(
                f"Cannot retract: this commit has already been {commit.status} — "
                "it's history now, not a pending proposal."
            )
        commit.retracted = True
        self._log_event(
            actor,
            "retract",
            f"Retracted {commit.comment}",
            branch=commit.branch,
            commit_id=commit.id,
        )

    @synchronized
    def merge(self, actor: str, commit_id: str) -> str:
        """
        A recipient adopts a received commit into their own working copy.

        Does not change Main, and does not change anybody else's files. It
        resolves the commit's attachment onto this member's own state and
        appends the result to their history, which is also what drives the
        asymmetric Activity label — the same row reads "Merge" to a recipient
        who has not taken it and "Undo" to one who has.

        Adopting the same commit twice is refused rather than ignored. A second
        merge would apply a change to files that already carry it, and the undo
        that followed would restore a state the member was never in.
        """
        commit = self.find_commit(commit_id)
        if commit.retracted:
            raise ValueError("Cannot merge a retracted commit.")
        if not commit.visible_to_member(actor):
            raise PermissionError_(f"{actor} was not a recipient of this commit.")
        self._require_role(actor, Role.CONTRIBUTOR, "merge")
        if actor in commit.merged_by:
            raise ValueError(f"{actor} has already merged this commit.")

        base = self._working_files(actor, commit.branch)
        new_files, _ = apply_attachment(base, commit.attachment)
        self._record_working(actor, commit.branch, new_files, merged_commit=commit.id)
        commit.merged_by.add(actor)
        self._log_event(
            actor,
            "merge",
            f"Merged {commit.name or commit.comment}",
            branch=commit.branch,
            commit_id=commit.id,
        )
        return (
            f"{actor} merged commit {commit_id} ({commit.attachment.describe()}) "
            "into their working version."
        )

    @synchronized
    def unmerge(self, actor: str, commit_id: str) -> str:
        """
        The "Undo" on an already-merged commit: the member reverses their own
        adoption. It affects nobody else who also merged it, and it never
        touches Main or production — merging never did either.

        Only the most recent merge on that branch can be undone. A later merge
        was resolved against files this one had already changed, so pulling this
        one out from under it would produce a state that is neither before nor
        after either change. The refusal names the merge to undo first rather
        than guessing.

        The restore is itself an append: the member's history gains an entry
        holding the pre-merge files, so every state they have been in stays
        reachable.
        """
        commit = self.find_commit(commit_id)
        if actor not in commit.merged_by:
            raise ValueError(f"{actor} hasn't merged this commit — nothing to undo.")

        history = self._working.get((actor, commit.branch), [])
        # Merges still in effect, newest last. A merge this member has already
        # undone is in the history for good -- nothing here is removed -- but it
        # is no longer something they are carrying, so it is not what the next
        # undo has to go through. `merged_by` is the record of what is currently
        # adopted, which is exactly that distinction.
        merges = [
            entry
            for entry in history
            if entry.merged_commit is not None
            and actor in self.find_commit(entry.merged_commit).merged_by
        ]
        latest = merges[-1] if merges else None
        if latest is None:
            raise ValueError("There is nothing to undo on this branch.")
        if latest.merged_commit != commit_id:
            later = self.find_commit(latest.merged_commit or "")
            raise ValueError(
                "Only the most recent merge can be undone. Undo "
                f"{later.name or later.comment} first."
            )

        index = history.index(latest)
        if index > 0:
            before = history[index - 1].files
        else:
            before = self._require_branch(commit.branch).current_files
        self._record_working(actor, commit.branch, dict(before), restored_from=latest.id)
        commit.merged_by.discard(actor)
        self._log_event(
            actor,
            "unmerge",
            f"Undid merge of {commit.name or commit.comment}",
            branch=commit.branch,
            commit_id=commit.id,
        )
        return f"{actor} undid their merge of commit {commit_id}."

    def _record_working(
        self,
        member: str,
        branch: str,
        files: dict[str, str],
        merged_commit: str | None = None,
        restored_from: str | None = None,
    ) -> WorkingVersion:
        """Append one state to a member's history on a branch. Never replaces."""
        entry = WorkingVersion(
            id=next_id("working"),
            member=member,
            branch=branch,
            files=files,
            timestamp=time.time(),
            merged_commit=merged_commit,
            restored_from=restored_from,
        )
        self._working.setdefault((member, branch), []).append(entry)
        return entry

    def _working_files(self, member: str, branch: str) -> dict[str, str]:
        """
        What this member is currently working from on this branch.

        A member who has merged nothing is working from the branch itself, so
        this falls through to the branch's own files rather than to an empty
        tree — you start from where the project is, not from nothing.

        Unlocked, because every caller inside this class already holds the lock.
        """
        history = self._working.get((member, branch), [])
        if history:
            return dict(history[-1].files)
        return dict(self._require_branch(branch).current_files)

    @synchronized
    def working_files(self, actor: str, member: str, branch: str) -> dict[str, str]:
        """
        A member's own files on a branch, readable by that member alone.

        Everyone authors in their own environment and keeps it private until
        they commit, so this is not a window onto what somebody else is halfway
        through.
        """
        self._member(member)
        self._require_branch(branch)
        if actor != member:
            raise PermissionError_("A member's working copy is their own.")
        return self._working_files(member, branch)

    @synchronized
    def working_history(self, actor: str, member: str, branch: str) -> list[dict[str, Any]]:
        """That member's states on a branch, oldest first. Same privacy rule."""
        self._member(member)
        self._require_branch(branch)
        if actor != member:
            raise PermissionError_("A member's working copy is their own.")
        return [
            {
                "id": entry.id,
                "branch": entry.branch,
                "timestamp": entry.timestamp,
                "merged_commit": entry.merged_commit,
                "restored_from": entry.restored_from,
                "file_count": len(entry.files),
            }
            for entry in self._working.get((member, branch), [])
        ]

    @synchronized
    def push(
        self,
        actor: str,
        branch: str,
        attachment: Attachment,
        comment: str,
        version_label: str | None = None,
    ) -> PushRecord:
        """
        Promote a version onto the target line.

        Enforces the Push-validity rule: the attachment must resolve to one
        unambiguous next state. A ``folder_ref`` replaces the tree wholesale
        from ``tree_snapshot``; ``loose_files`` merge onto the previous
        version, so only the named paths change.

        ``version_label`` is what the author called this version. The API
        requires one of every push it accepts, so passing none is for the
        callers that have no author to ask — the demo seed, and promoting
        somebody else's commit — and takes the next label on the line instead.
        See ``_resolve_version_label``.
        """
        # Every role can push. Authority in this product gates release, not
        # contribution.
        self._require_role(actor, Role.CONTRIBUTOR, "push")
        b = self._require_branch(branch)
        if attachment.is_mixed():
            raise PushInvalidError(
                "Push is invalid: attachment mixes a folder/version reference with "
                "individual loose files — ambiguous whether loose files override or "
                "duplicate what's in the folder. Resolve to one or the other before pushing."
            )

        # Before any of the work: a name that cannot be used should refuse the
        # push rather than be discovered after the tree has been assembled.
        label = _resolve_version_label(b, version_label)

        previous_files = b.current_files
        new_files, changed_paths = apply_attachment(previous_files, attachment)
        diff_stats, total_added, total_removed = diff_stats_for_change(
            previous_files, new_files, changed_paths
        )

        record = PushRecord(
            id=next_id("push"),
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
        b.record_push(record)
        self._pushes[record.id] = record
        self._log_event(
            actor,
            "push",
            # The version, not the message written about it -- the same rule the
            # commit row follows. A push's name *is* its version label: it is
            # what the author typed into the Action window's Name field, and it
            # is what Archive, undo and every file read address this version by.
            # So there is nothing to fall back to and no `or` here: a push always
            # has a label, whether its author chose one or the branch did.
            f"Pushed {record.version_label} to {branch}",
            branch=branch,
            push_id=record.id,
        )
        # Invariant 1: advancing this line never changes what production
        # serves. Invariant 5 needs nothing done here — a branch preview reads
        # b.head, which this has just advanced.
        return record

    @synchronized
    def push_commit(
        self, actor: str, commit_id: str, comment: str | None = None
    ) -> PushRecord:
        """
        File Detail's direct "Push": promote a specific commit's attachment
        straight onto its branch, marking the commit pushed — which locks it
        against later retraction.
        """
        commit = self.find_commit(commit_id)
        if commit.retracted:
            raise ValueError("Cannot push a retracted commit.")
        record = self.push(
            actor=actor,
            branch=commit.branch,
            attachment=commit.attachment,
            comment=comment or commit.comment,
        )
        commit.pushed = True
        # "View by" was routing -- who needed to look at this while it was a
        # proposal -- and a promoted commit is not a proposal any more. It is on
        # the branch, so it is everyone's, and an empty recipient list is how
        # this project spells "the whole team".
        commit.view_by = []
        return record

    # ---- deploy / undo ---------------------------------------------------

    def _apply_to_production(
        self, actor: str, version: PushRecord, event: str, description: str
    ) -> DeployRecord:
        """
        The half that deploy and undo share: append a release record, point
        production at that version, and copy its real content into the live
        tree. Both are appends — production moving forward or back is never a
        rewrite of what it moved from.
        """
        record = DeployRecord(
            id=next_id("deploy"),
            author=actor,
            version_label=version.version_label,
            timestamp=time.time(),
        )
        self.deploy_history.append(record)
        self.deployed_version = version.version_label
        self.deployed_files = dict(version.files)
        self._log_event(actor, event, description, branch="main")
        return record

    @synchronized
    def deploy(self, actor: str, version_label: str | None = None) -> DeployRecord:
        """
        Explicit, authorized release of a Main version to production. Never a
        side effect of a push. Defaults to Main's current head.
        """
        self._require_role(actor, Role.MAINTAINER, "deploy")
        main = self.branches["main"]
        target = version_label or (main.head.version_label if main.head else None)
        if target is None:
            raise ValueError("Nothing has been pushed to Main yet — nothing to deploy.")
        version = main.version(target)
        if version is None:
            raise ValueError(f"'{target}' is not a version that exists on Main.")
        return self._apply_to_production(
            actor, version, "deploy", f"Deployed {target} to production"
        )

    @synchronized
    def undo(self, actor: str, target_version_label: str | None = None) -> DeployRecord:
        """
        The Archive row's action: make a published version the live one, now.

        Named for the direction it is usually travelled — back onto something
        that was live before — but not restricted to it. Any version on Main's
        shelf can be applied, including one that has never been live, and
        applying it takes effect immediately: the version's real file content
        goes back into production, a genuine content change rather than a
        label pointed elsewhere.

        Invariant 4 holds either way. Nothing is deleted or rewritten; the
        rollback is appended as a new record pointing at an old version, so
        the shelf only grows and every past release stays readable. Invariant
        2 holds too, and it is the subtle one: pushing still does not release
        anything, so somebody with release authority has to press this.

        With no target it means the plain rollback — the deployment
        immediately before the current one.
        """
        self._require_role(actor, Role.MAINTAINER, "undo (rollback)")
        main = self.branches["main"]
        if target_version_label is None:
            if len(self.deploy_history) < 2:
                raise ValueError("No prior deployment to roll back to.")
            target_version_label = self.deploy_history[-2].version_label
        version = main.version(target_version_label)
        if version is None:
            raise ValueError(f"'{target_version_label}' is not a version that exists on Main.")
        return self._apply_to_production(
            actor, version, "undo", f"Undo {target_version_label} to main"
        )

    @synchronized
    def production_file_tree(self) -> list[dict[str, Any]]:
        """What is actually live right now, as a nested tree."""
        return build_file_tree(self.deployed_files)

    # ---- read-only surfaces ---------------------------------------------

    @synchronized
    @synchronized
    def activity_feed_for_viewer(self, viewer: str) -> list[dict[str, Any]]:
        """
        The Activity surface, which is viewer-specific rather than global.

        One row per commit — its action word changes rather than a second
        "Merged" row appearing — plus one per push, and one for each membership
        or settings change the project records. What this surface does *not*
        carry, and why, is stated on ``_FEED_TYPES``.

        Per row:

        - anything that is not a commit            -> always "View"
        - commit, viewer is the author             -> "View"
        - commit, viewer addressed, not yet merged -> "Merge"
        - commit, viewer has merged it             -> "Undo"
        - commit not addressed to the viewer, or retracted -> omitted

        The ledger is iterated in place: events are appended in wall-clock
        order and never reordered, so sorting it per request would be work
        done to reach the order it already has.
        """
        self._member(viewer)
        rows: list[dict[str, Any]] = []
        for event in self.events:
            # `_FEED_TYPES` is the whole of what this surface carries, and the
            # comment on it says why each absence is deliberate. Everything
            # else either belongs to another surface or changes a row that is
            # already here — merge, unmerge and retract all alter a commit row
            # rather than drawing one of their own.
            if event.type not in _FEED_TYPES:
                continue
            commit: Commit | None = None
            if event.type == "commit":
                commit = self.find_commit(event.commit_id or "")
                if commit.retracted or not commit.visible_to_member(viewer):
                    continue
                if viewer == commit.author:
                    action = "View"
                elif viewer in commit.merged_by:
                    action = "Undo"
                else:
                    action = "Merge"
            else:
                # An entry naming recipients is meant for them in particular —
                # a join request the Owner has to answer, a branch somebody was
                # added to — and is shown to nobody else. One with none is the
                # project's shared history and is shown to everyone.
                if event.visible_to and viewer not in event.visible_to:
                    continue
                action = "View"

            row: dict[str, Any] = {
                "event_id": event.id,
                "actor": event.actor,
                "type": event.type,
                "description": event.description,
                "branch": event.branch,
                "commit_id": event.commit_id,
                "timestamp": event.timestamp,
                "action": action,
            }
            if commit is not None:
                row["diff"] = {"added": commit.total_added, "removed": commit.total_removed}
                row["flagged"] = commit.flagged
                row["comment_count"] = len(commit.comments)
            rows.append(row)
        return rows

    @synchronized
    def member_activity(self, member: str) -> list[dict[str, Any]]:
        """
        One person's profile list: the same ledger, filtered to one author,
        carrying the diff stats the pane prints.

        ``description`` is the fused log line ("Committed refined
        ContentView.js v2.1"), but the pane wants the pieces apart: the row
        names the artefact and the comment is read underneath the file it was
        written about. So each row also carries the raw comment, and enough to
        name the artefact — the paths a commit changed, or the version a push
        produced.
        """
        self._member(member)
        rows: list[dict[str, Any]] = []
        for event in self.events:
            if event.actor != member or event.type not in ("commit", "push"):
                continue
            row: dict[str, Any] = {
                "event_id": event.id,
                "type": event.type,
                "description": event.description,
                "branch": event.branch,
                "commit_id": event.commit_id,
                "timestamp": event.timestamp,
            }
            if event.type == "commit":
                commit = self.find_commit(event.commit_id or "")
                row["diff"] = {"added": commit.total_added, "removed": commit.total_removed}
                row["comment"] = commit.comment
                # diff_stats is keyed by exactly the paths the commit changed,
                # whether it arrived as a folder snapshot or as loose files.
                row["files"] = list(commit.diff_stats)
                # Retract is valid on a pending proposal and nothing else, so
                # the surface has to know which one this is before offering it.
                row["status"] = commit.status
                row["flagged"] = commit.flagged
                if commit.name:
                    row["name"] = commit.name
            else:
                push = self.find_push(event.push_id or "")
                row["diff"] = {"added": push.total_added, "removed": push.total_removed}
                row["comment"] = push.comment
                # No file list: a push promotes a whole version, so the row
                # names the project at this label rather than its contents.
                row["version_label"] = push.version_label
            rows.append(row)
        return rows

    @synchronized
    def export_snapshot(self, actor: str) -> dict[str, Any]:
        """
        The whole project in one object: who is on it, what has happened, and
        what production is serving.

        Assembled here rather than in the route because it is three domain
        reads with one rule over them, and the rule is the interesting part.
        This is the most revealing read in the API — a roster and a feed in a
        single response — so it takes Maintainer, the tier that already
        administers the project.

        The feed is the actor's own. A viewer-specific feed belongs to the
        person it was computed for: the same commit reads "Merge" to a
        recipient and "View" to its author, so handing somebody else's out
        would be exporting a view of the project that is not the exporter's
        to see.
        """
        self._require_role(actor, Role.MAINTAINER, "export this project")
        return {
            "team": [{"name": m.name, "role": m.role.value} for m in self.team_view()],
            "activity": self.activity_feed_for_viewer(actor),
            "deployed_version": self.deployed_version,
        }

    @synchronized
    def member_view(self, member: str) -> dict[str, Any]:
        """One person's profile. Their role is public to the team; how it got
        that way is not, which is what the role notice is for."""
        found = self._member(member)
        return {
            "name": found.name,
            "role": found.role.value,
            "branches": sorted(b.name for b in self.branches.values() if member in b.members),
        }

    @synchronized
    def leave_project(self, actor: str) -> None:
        """
        Show yourself out, taking your working copies with you.

        The Owner cannot: a project with nobody who can administer it is a
        project nobody can ever fix, so leaving is transferring ownership first
        and then leaving — two deliberate acts rather than one that quietly
        strands the team.
        """
        member = self._member(actor)
        if member.role == Role.OWNER:
            raise PermissionError_(
                "The Owner cannot leave a project. Transfer ownership first."
            )
        del self.members[actor]
        for branch in self.branches.values():
            branch.members.discard(actor)
        for key in [key for key in self._working if key[0] == actor]:
            del self._working[key]
        self._role_notices.pop(actor, None)
        self._log_event(actor, "member_removed", f"{actor} left the project")

    @synchronized
    def commit_view(self, commit_id: str) -> dict[str, Any]:
        """One proposal, in full — what it carries, who it went to, where it got to."""
        commit = self.find_commit(commit_id)
        return {
            "commit_id": commit.id,
            "author": commit.author,
            "branch": commit.branch,
            "name": commit.name,
            "comment": commit.comment,
            "status": commit.status,
            "flagged": commit.flagged,
            "view_by": list(commit.view_by),
            "merged_by": sorted(commit.merged_by),
            "files": list(commit.diff_stats),
            "diff": {"added": commit.total_added, "removed": commit.total_removed},
            "timestamp": commit.timestamp,
            "comment_count": len(commit.comments),
        }

    @synchronized
    def branch_view(self, branch_name: str) -> dict[str, Any]:
        """One line of development, and where it currently stands."""
        branch = self._require_branch(branch_name)
        return {
            "name": branch.name,
            "is_main": branch.is_main,
            "deploy_subdomain": branch.deploy_subdomain,
            "members": sorted(branch.members),
            "latest_version": branch.head.version_label if branch.head else None,
            "version_count": len(branch.pushes),
            "commit_count": len(branch.commits),
        }

    @synchronized
    def version_history(self, branch_name: str) -> list[dict[str, Any]]:
        """
        Every version of a branch, newest first.

        Main has the Archive, which answers a different question — what is live
        and what was live before. This one is the plain history of a line, and
        it is the only way to read it for a branch that is not Main.
        """
        branch = self._require_branch(branch_name)
        return [
            {
                "version_label": push.version_label,
                "pushed_by": push.author,
                "comment": push.comment,
                "time": push.timestamp,
                "diff": {"added": push.total_added, "removed": push.total_removed},
                "is_head": push is branch.head,
            }
            for push in reversed(branch.pushes)
        ]

    @synchronized
    def file_tree(self, branch_name: str = "main") -> list[dict[str, Any]]:
        """The Main surface's file view for one branch — real content, not labels."""
        return self._require_branch(branch_name).file_tree()

    @synchronized
    def archive(self) -> DeployRecord | None:
        """What users are actually running, right now."""
        return self.deploy_history[-1] if self.deploy_history else None

    @synchronized
    def archive_history(self) -> list[dict[str, Any]]:
        """
        The deploy audit log: every deploy and undo call, newest first, with
        ``is_live`` true on exactly one row. Never mutated.

        This is the internal trail. The Archive surface the frontend renders
        is ``archive_surface`` below, which lists every Main version rather
        than only the ones that were ever released.
        """
        latest = self.deploy_history[-1] if self.deploy_history else None
        return [
            {
                "deploy_id": record.id,
                "version_label": record.version_label,
                "deployed_by": record.author,
                "deployed_at": record.timestamp,
                "is_live": record is latest,
            }
            for record in reversed(self.deploy_history)
        ]

    @synchronized
    def archive_surface(self) -> list[dict[str, Any]]:
        """
        Every version ever published to Main, newest first. The live one shows
        "Applied"; every other row shows "Undo", and pressing it makes that
        version live immediately.

        Two words, and only two, on purpose. This surface answers one question
        — what are users running, and what were they running before — so every
        row that is not the answer is a way to change the answer. There is no
        third state to distinguish and no third word to draw.
        """
        main = self.branches["main"]
        current = self.deployed_version
        return [
            {
                "version_label": push.version_label,
                "pushed_by": push.author,
                "time": push.timestamp,
                "action": "Applied" if push.version_label == current else "Undo",
            }
            for push in reversed(main.pushes)
        ]

    @synchronized
    def files_at_version(self, branch_name: str, version_label: str) -> dict[str, str]:
        """
        The real file content of one version, path -> content.

        This is what an attachment's ``version_ref`` resolves to. The client
        names a version it can already see; the server is the only side
        holding the bytes, so the snapshot is assembled here rather than
        uploaded by a browser that cannot read it.
        """
        branch = self._require_branch(branch_name)
        version = branch.version(version_label)
        if version is None:
            raise KeyError(f"'{version_label}' is not a version that exists on {branch_name}.")
        return dict(version.files)

    @synchronized
    def file_content_at_version(self, branch_name: str, version_label: str, path: str) -> str:
        """One file's raw content at one historical version."""
        files = self.files_at_version(branch_name, version_label)
        if path not in files:
            raise KeyError(f"'{path}' does not exist in version '{version_label}'.")
        return files[path]

    @synchronized
    def file_tree_at_version(self, branch_name: str, version_label: str) -> list[dict[str, Any]]:
        """
        Any historical version's file tree, not only the head — which is what
        proves every version is genuinely retained rather than merely labelled.
        """
        return build_file_tree(self.files_at_version(branch_name, version_label))

    @synchronized
    def team_view(self) -> list[Member]:
        return list(self.members.values())

    # ---- settings --------------------------------------------------------

    @synchronized
    def get_settings(self) -> dict[str, Any]:
        return {
            "anyone_with_link": self.anyone_with_link,
            "invite_token": self.invite_token,
            "default_invite_role": self.default_invite_role.value,
            "branches_feature_enabled": self.branches_feature_enabled,
            "branch_creation_open_to_contributors": self.branch_creation_open_to_contributors,
            "production_visibility": self.production_visibility,
            "custom_domain": self.custom_domain,
        }

    @synchronized
    def set_anyone_with_link(self, actor: str, enabled: bool) -> None:
        # A step up from the Maintainer floor the other settings take. This one
        # decides whether a stranger holding the link becomes a member without
        # anybody agreeing to it, which is a question about who the project is
        # rather than about how it is configured.
        self._require_role(actor, Role.OWNER, "change link-join settings")
        self.anyone_with_link = enabled
        self._log_event(
            actor,
            "settings_changed",
            f"Link access {'opened' if enabled else 'closed'}",
        )

    @synchronized
    def regenerate_invite_link(self, actor: str) -> str:
        """
        Mint a new token and drop the old one, which is the only way to revoke
        an invite link that has escaped.
        """
        self._require_role(actor, Role.MAINTAINER, "regenerate the invite link")
        self.invite_token = new_invite_token()
        # The event says a new link exists, and deliberately not what it is:
        # the ledger is read by the whole team and the token is the one field
        # here that is a credential.
        self._log_event(actor, "settings_changed", "Regenerated the project link")
        return self.invite_token

    @synchronized
    def set_default_invite_role(self, actor: str, role: Role) -> None:
        self._require_role(actor, Role.MAINTAINER, "change the default invite role")
        if role == Role.OWNER:
            # Ownership is transferred, never handed out by invitation — one
            # project, one Owner.
            raise ValueError("Owner cannot be a default invite role.")
        self.default_invite_role = role
        self._log_event(
            actor, "settings_changed", f"New members now join as {role.value}"
        )

    @synchronized
    def set_branches_enabled(self, actor: str, enabled: bool) -> None:
        self._require_role(actor, Role.OWNER, "turn Branches on or off")
        self.branches_feature_enabled = enabled
        self._log_event(
            actor, "settings_changed", f"Branches turned {'on' if enabled else 'off'}"
        )

    @synchronized
    def set_branch_creation_authority(self, actor: str, open_to_contributors: bool) -> None:
        self._require_role(actor, Role.OWNER, "change who can create branches")
        self.branch_creation_open_to_contributors = open_to_contributors
        who = "everyone" if open_to_contributors else "Maintainers and above"
        self._log_event(actor, "settings_changed", f"Branches can be created by {who}")

    @synchronized
    def set_production_visibility(self, actor: str, visibility: str | None) -> None:
        self._require_role(actor, Role.MAINTAINER, "change production visibility")
        if visibility not in ("public", "private"):
            raise ValueError("visibility must be 'public' or 'private'.")
        self.production_visibility = visibility
        self._log_event(actor, "settings_changed", f"Production is now {visibility}")

    @synchronized
    def set_custom_domain(self, actor: str, domain: str | None) -> None:
        """
        Point the project at a domain of its own, or clear it with None.

        The value is validated as a bare hostname because the frontend renders
        it as ``https://{host}`` in the Deploy row's link. React escapes the
        attribute, so this is not the last line of defence against injection —
        but a value that cannot be a host has no business being stored as one,
        and rejecting it here means every consumer can trust the field.
        """
        self._require_role(actor, Role.MAINTAINER, "change the custom domain")
        if domain is None or not domain.strip():
            self.custom_domain = None
            self._log_event(actor, "settings_changed", "Cleared the custom domain")
            return
        cleaned = domain.strip().lower()
        if not _HOSTNAME.match(cleaned):
            raise ValueError(
                f"'{domain}' is not a valid domain name. Give a bare hostname such as "
                "'orchid.example.com' — no scheme, port or path."
            )
        self.custom_domain = cleaned
        self._log_event(actor, "settings_changed", f"Custom domain set to {cleaned}")
