"""
The half of the product that is about people rather than about versions.

Everything here is a rule from the backend logic scope that could not be
expressed while merging was a flag: a member's own copy of a branch, how
somebody gets into a project in the first place, and how they find out their
authority changed. The other test files check that history is never lost; these
check that it belongs to the right person.
"""

from __future__ import annotations

import pytest

from core import Attachment, PermissionError_, Role

from .conftest import CONTRIBUTOR, MAINTAINER, OWNER, snapshot

PROJECT = "/projects/proj_test"


def files(project, member: str, branch: str = "main") -> dict[str, str]:
    """What one member is working from, read as themselves."""
    return project.working_files(actor=member, member=member, branch=branch)


# ---- a project arrives whole ---------------------------------------------


def test_a_new_project_is_created_complete(project):
    """
    Owner, Main, an initial version and a link, together. A project that exists
    but has no version is a window in which nothing can be branched or
    deployed, and there is no such window.
    """
    assert project.members[OWNER].role is Role.OWNER
    assert "main" in project.branches
    assert project.branches["main"].head is not None
    assert project.branches["main"].head.version_label == "V0"
    assert project.invite_token

    # The initial version does not consume the counter, so the first real push
    # is still the first version anybody named.
    assert project.push(OWNER, "main", Attachment(), "first").version_label == "V1"


# ---- a member's own copy --------------------------------------------------


def test_a_member_starts_from_the_branch(project, tree):
    """Not from nothing: you start from where the project is."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    assert files(project, CONTRIBUTOR) == tree


def test_merging_a_file_commit_changes_only_that_file(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(
        OWNER,
        "main",
        Attachment(loose_files=["README.md"], file_contents={"README.md": "# Changed\n"}),
        "readme",
        [CONTRIBUTOR],
    )
    project.merge(CONTRIBUTOR, commit.id)

    mine = files(project, CONTRIBUTOR)
    assert mine["README.md"] == "# Changed\n"
    # Everything the commit did not name carried forward untouched.
    assert mine["src/app.py"] == tree["src/app.py"]
    # And nobody else moved.
    assert files(project, MAINTAINER) == tree
    assert project.branches["main"].current_files == tree


def test_merging_a_whole_version_replaces_everything(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(
        OWNER, "main", snapshot({"only.py": "one\n"}), "whole tree", [CONTRIBUTOR]
    )
    project.merge(CONTRIBUTOR, commit.id)
    assert files(project, CONTRIBUTOR) == {"only.py": "one\n"}


def test_unmerge_restores_exactly_the_pre_merge_state(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(
        OWNER,
        "main",
        Attachment(loose_files=["README.md"], file_contents={"README.md": "# Changed\n"}),
        "readme",
        [CONTRIBUTOR],
    )
    project.merge(CONTRIBUTOR, commit.id)
    project.unmerge(CONTRIBUTOR, commit.id)

    assert files(project, CONTRIBUTOR) == tree
    # Restoring is an append, so the state that was undone is still reachable.
    history = project.working_history(CONTRIBUTOR, CONTRIBUTOR, "main")
    assert [entry["merged_commit"] for entry in history] == [commit.id, None]
    assert history[-1]["restored_from"] == history[0]["id"]


def test_merging_the_same_commit_twice_is_refused(project, tree):
    """It would apply the change to files that already carry it."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(OWNER, "main", snapshot({"a.py": "a\n"}), "c", [CONTRIBUTOR])
    project.merge(CONTRIBUTOR, commit.id)
    with pytest.raises(ValueError):
        project.merge(CONTRIBUTOR, commit.id)


def test_an_out_of_order_unmerge_is_refused(project, tree):
    """
    The later merge was resolved against files the earlier one had changed, so
    there is no state that is 'after the second but before the first'.
    """
    project.push(OWNER, "main", snapshot(tree), "v1")
    first = project.commit(
        OWNER,
        "main",
        Attachment(loose_files=["a.py"], file_contents={"a.py": "one\n"}),
        "first",
        [CONTRIBUTOR],
    )
    second = project.commit(
        OWNER,
        "main",
        Attachment(loose_files=["b.py"], file_contents={"b.py": "two\n"}),
        "second",
        [CONTRIBUTOR],
    )
    project.merge(CONTRIBUTOR, first.id)
    project.merge(CONTRIBUTOR, second.id)

    with pytest.raises(ValueError) as refusal:
        project.unmerge(CONTRIBUTOR, first.id)
    assert "second" in str(refusal.value)

    # Undoing them in the order they were made is allowed, and lands back where
    # the member started.
    project.unmerge(CONTRIBUTOR, second.id)
    project.unmerge(CONTRIBUTOR, first.id)
    assert files(project, CONTRIBUTOR) == tree


def test_authoring_a_commit_does_not_change_your_own_files(project, tree):
    """A commit is a proposal to other people, never an edit of your own work."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.commit(
        OWNER,
        "main",
        Attachment(loose_files=["a.py"], file_contents={"a.py": "mine\n"}),
        "c",
        [CONTRIBUTOR],
    )
    assert files(project, OWNER) == tree


def test_a_working_copy_is_private(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    with pytest.raises(PermissionError_):
        project.working_files(actor=OWNER, member=CONTRIBUTOR, branch="main")
    with pytest.raises(PermissionError_):
        project.working_history(OWNER, CONTRIBUTOR, "main")


def test_removing_and_re_inviting_resets_a_working_copy(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(OWNER, "main", snapshot({"old.py": "old\n"}), "c", [CONTRIBUTOR])
    project.merge(CONTRIBUTOR, commit.id)
    assert files(project, CONTRIBUTOR) == {"old.py": "old\n"}

    project.remove_contributor(OWNER, CONTRIBUTOR)
    project.invite_member(OWNER, CONTRIBUTOR, Role.CONTRIBUTOR)

    # A new arrival, not a resumed session.
    assert files(project, CONTRIBUTOR) == tree
    assert project.working_history(CONTRIBUTOR, CONTRIBUTOR, "main") == []


def test_leaving_takes_your_working_copy_with_you(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.leave_project(CONTRIBUTOR)
    assert CONTRIBUTOR not in project.members
    with pytest.raises(PermissionError_):
        project.leave_project(OWNER)


# ---- getting in ------------------------------------------------------------


def test_the_link_admits_outright_when_the_project_says_so(project):
    project.set_anyone_with_link(OWNER, True)
    result = project.request_join(project.invite_token, "Dana")
    assert result["status"] == "joined"
    assert project.members["Dana"].role is project.default_invite_role
    assert [e.type for e in project.events if e.actor == "Dana"] == ["member_joined"]


def test_the_link_queues_when_the_project_does_not(project):
    project.set_anyone_with_link(OWNER, False)
    assert project.request_join(project.invite_token, "Dana")["status"] == "pending"
    assert "Dana" not in project.members
    assert [r["name"] for r in project.join_requests(OWNER)] == ["Dana"]


def test_a_wrong_token_gets_nowhere(project):
    with pytest.raises(PermissionError_):
        project.request_join("tok-not-this-one", "Dana")


def test_a_request_is_not_a_queue(project):
    """One pending request per person, and none at all from a member."""
    project.set_anyone_with_link(OWNER, False)
    project.request_join(project.invite_token, "Dana")
    with pytest.raises(ValueError):
        project.request_join(project.invite_token, "Dana")
    with pytest.raises(ValueError):
        project.request_join(project.invite_token, CONTRIBUTOR)


def test_approving_admits_at_the_chosen_role(project):
    project.set_anyone_with_link(OWNER, False)
    project.request_join(project.invite_token, "Dana")
    project.approve_join(OWNER, "Dana", Role.MAINTAINER)
    assert project.members["Dana"].role is Role.MAINTAINER
    assert project.join_requests(OWNER) == []
    # The same event as an instant join: however long they waited, the fact is
    # that they are here.
    joined = [e for e in project.events if e.type == "member_joined"]
    assert [e.description for e in joined] == ["Dana joined the project"]


def test_rejecting_is_silent(project):
    project.set_anyone_with_link(OWNER, False)
    project.request_join(project.invite_token, "Dana")
    before = len(project.events)
    project.reject_join(OWNER, "Dana")
    assert project.join_requests(OWNER) == []
    assert "Dana" not in project.members
    assert len(project.events) == before


def test_answering_requests_is_the_owners_alone(project):
    project.set_anyone_with_link(OWNER, False)
    project.request_join(project.invite_token, "Dana")
    for act in (
        lambda: project.join_requests(MAINTAINER),
        lambda: project.approve_join(MAINTAINER, "Dana"),
        lambda: project.reject_join(MAINTAINER, "Dana"),
        lambda: project.set_anyone_with_link(MAINTAINER, True),
    ):
        with pytest.raises(PermissionError_):
            act()


def test_opening_the_link_does_not_resolve_what_is_already_waiting(project):
    project.set_anyone_with_link(OWNER, False)
    project.request_join(project.invite_token, "Dana")
    project.set_anyone_with_link(OWNER, True)
    assert [r["name"] for r in project.join_requests(OWNER)] == ["Dana"]
    assert "Dana" not in project.members


def test_a_join_request_is_the_owners_business(project):
    """Addressed to them, and shown to nobody else."""
    project.set_anyone_with_link(OWNER, False)
    project.request_join(project.invite_token, "Dana")
    def requests_seen_by(viewer: str) -> list[str]:
        return [
            row["actor"]
            for row in project.activity_feed_for_viewer(viewer)
            if row["type"] == "join_requested"
        ]

    assert requests_seen_by(OWNER) == ["Dana"]
    assert requests_seen_by(MAINTAINER) == []
    assert requests_seen_by(CONTRIBUTOR) == []


# ---- what the feed carries -------------------------------------------------


def test_deployments_never_reach_the_feed(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.deploy(OWNER)
    project.push(OWNER, "main", snapshot({**tree, "b.py": "b\n"}), "v2")
    project.deploy(OWNER)
    project.undo(OWNER, "V1")

    types = {row["type"] for row in project.activity_feed_for_viewer(OWNER)}
    assert types.isdisjoint({"deploy", "undo"})
    # They are still recorded — the Archive is where they are read.
    assert [row["version_label"] for row in project.archive_history()] == ["V1", "V2", "V1"]


def test_a_commit_widens_to_the_team_once_it_is_pushed(project, tree):
    """
    "View by" is routing while a proposal is pending. Promoted, it is on the
    branch, and being left out of the feed for it would be a lie about what is
    in the project.
    """
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(OWNER, "main", snapshot({"a.py": "a\n"}), "c", [CONTRIBUTOR])
    assert [
        row for row in project.activity_feed_for_viewer(MAINTAINER) if row["commit_id"]
    ] == []

    project.push_commit(OWNER, commit.id)
    seen = [row for row in project.activity_feed_for_viewer(MAINTAINER) if row["commit_id"]]
    assert [row["commit_id"] for row in seen] == [commit.id]


# ---- branches --------------------------------------------------------------


def test_a_branch_can_start_from_an_older_version(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.push(OWNER, "main", snapshot({**tree, "late.py": "late\n"}), "v2")

    branch = project.create_branch(OWNER, "revisit", from_version="V1")
    assert branch.current_files == tree
    with pytest.raises(KeyError):
        project.create_branch(OWNER, "nope", from_version="V99")


def test_branch_creation_authority_is_the_owners_to_set(project, tree):
    with pytest.raises(PermissionError_):
        project.create_branch(CONTRIBUTOR, "theirs")
    project.set_branch_creation_authority(OWNER, True)
    assert project.create_branch(CONTRIBUTOR, "theirs").name == "theirs"


def test_being_added_to_a_branch_is_told_to_you(project):
    project.create_branch(OWNER, "shared", members={OWNER, CONTRIBUTOR})
    theirs = [
        row
        for row in project.activity_feed_for_viewer(CONTRIBUTOR)
        if row["type"] == "branch_members_changed"
    ]
    assert len(theirs) == 1
    # Told to them, and to nobody who was not added.
    assert [
        row
        for row in project.activity_feed_for_viewer(MAINTAINER)
        if row["type"] == "branch_members_changed"
    ] == []


# ---- over HTTP --------------------------------------------------------------


def test_joining_over_http(client, project):
    project.set_anyone_with_link(OWNER, False)
    token = project.invite_token

    assert client.post(
        f"{PROJECT}/access/join", json={"token": token, "name": "Dana"}
    ).json() == {"status": "pending"}

    # Owner-only, and the reader names themselves.
    assert client.get(f"{PROJECT}/access/requests", params={"actor": MAINTAINER}).status_code == 403
    listed = client.get(f"{PROJECT}/access/requests", params={"actor": OWNER}).json()
    assert [r["name"] for r in listed] == ["Dana"]

    client.post(
        f"{PROJECT}/access/requests/approve",
        json={"actor": OWNER, "name": "Dana", "role": "contributor"},
    )
    assert "Dana" in [m["name"] for m in client.get(f"{PROJECT}/team").json()]


def test_a_working_copy_over_http_is_the_members_own(client, project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    ok = client.get(
        f"{PROJECT}/team/{CONTRIBUTOR}/working/main", params={"actor": CONTRIBUTOR}
    )
    assert ok.status_code == 200
    assert [node["name"] for node in ok.json()] == ["README.md", "src"]

    peeking = client.get(
        f"{PROJECT}/team/{CONTRIBUTOR}/working/main", params={"actor": OWNER}
    )
    assert peeking.status_code == 403


def test_a_role_notice_over_http(client):
    client.post(f"{PROJECT}/team/{CONTRIBUTOR}/grant-maintainer", json={"actor": OWNER})

    mine = client.get(
        f"{PROJECT}/team/{CONTRIBUTOR}/role-notice", params={"actor": CONTRIBUTOR}
    ).json()
    assert (mine["old_role"], mine["new_role"]) == ("contributor", "maintainer")

    assert client.get(
        f"{PROJECT}/team/{MAINTAINER}/role-notice", params={"actor": CONTRIBUTOR}
    ).status_code == 403
    # Never changed, so there is nothing to read — which is not an error.
    assert client.get(
        f"{PROJECT}/team/{MAINTAINER}/role-notice", params={"actor": OWNER}
    ).json() is None


def test_reading_one_commit_and_one_branch(client, project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(OWNER, "main", snapshot({"a.py": "a\n"}), "c", [CONTRIBUTOR])

    body = client.get(f"{PROJECT}/commits/{commit.id}").json()
    assert body["status"] == "pending"
    assert body["view_by"] == [CONTRIBUTOR]

    branch = client.get(f"{PROJECT}/branches/main").json()
    assert branch["latest_version"] == "V1"
    versions = client.get(f"{PROJECT}/branches/main/versions").json()
    assert [v["version_label"] for v in versions] == ["V1", "V0"]
    assert versions[0]["is_head"] is True
