"""
The rules the product is built on, each exercised directly.

These are the tests worth keeping if every other one were deleted. They are
not about a route or a payload shape but about promises the product makes to
the people using it: that pushing does not release, that history is not
rewritten, and that a merge is private.
"""

from __future__ import annotations

import pytest

from core import Attachment, PermissionError_, PushInvalidError, Role

from .conftest import CONTRIBUTOR, MAINTAINER, OWNER, snapshot


def test_pushing_never_changes_production(project, tree):
    """Invariant 1: advancing Main puts a version on the shelf and nothing else."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.deploy(OWNER)
    live = dict(project.deployed_files)

    project.push(OWNER, "main", snapshot({**tree, "new.py": "x\n"}), "v2")

    assert project.deployed_version == "V1"
    assert project.deployed_files == live
    assert project.branches["main"].head.version_label == "V2"


def test_release_requires_authority(project, tree):
    """Invariant 2: a Contributor may push all day and release nothing."""
    project.push(CONTRIBUTOR, "main", snapshot(tree), "v1")
    with pytest.raises(PermissionError_):
        project.deploy(CONTRIBUTOR)
    project.deploy(MAINTAINER)
    assert project.deployed_version == "V1"


def test_merging_is_private(project, tree):
    """Invariant 3: a merge changes the merger's view and nobody else's."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(
        CONTRIBUTOR, "main", Attachment(), "a proposal", [OWNER, MAINTAINER]
    )
    project.merge(OWNER, commit.id)

    def row_for(viewer):
        return next(
            r
            for r in project.activity_feed_for_viewer(viewer)
            if r["commit_id"] == commit.id
        )

    assert row_for(OWNER)["action"] == "Undo"
    assert row_for(MAINTAINER)["action"] == "Merge"
    # And Main is untouched by either of them.
    assert project.branches["main"].head.version_label == "V1"


def test_unmerge_only_reverses_your_own(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(CONTRIBUTOR, "main", Attachment(), "p", [OWNER, MAINTAINER])
    project.merge(OWNER, commit.id)
    project.merge(MAINTAINER, commit.id)

    project.unmerge(OWNER, commit.id)

    assert commit.merged_by == {MAINTAINER}
    with pytest.raises(ValueError):
        project.unmerge(OWNER, commit.id)


def test_undo_appends_rather_than_rewrites(project, tree):
    """Invariant 4: rolling back grows the history it rolls back through."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.deploy(OWNER)
    project.push(OWNER, "main", snapshot({**tree, "b.py": "b\n"}), "v2")
    project.deploy(OWNER)

    project.undo(OWNER, "V1")

    assert [d.version_label for d in project.deploy_history] == ["V1", "V2", "V1"]
    assert project.deployed_version == "V1"
    # The rollback restored real content, not just a label.
    assert "b.py" not in project.deployed_files
    # Both versions are still on the shelf, newest first.
    assert [row["version_label"] for row in project.archive_surface()] == ["V2", "V1"]
    assert [row["action"] for row in project.archive_surface()] == ["Undo", "Applied"]


def test_undo_can_apply_a_version_that_was_never_live(project, tree):
    """
    "Undo" names the direction it is usually travelled, not a restriction: any
    version on Main's shelf can be applied.
    """
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.deploy(OWNER, "V1")
    project.push(OWNER, "main", snapshot({**tree, "b.py": "b\n"}), "v2")

    project.undo(OWNER, "V2")

    assert project.deployed_version == "V2"
    assert "b.py" in project.deployed_files


def test_branch_preview_follows_its_head(project, tree):
    """Invariant 5: a branch preview auto-updates; Main's does not."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    branch = project.create_branch(OWNER, "experiment")
    first = branch.preview_state.version_label

    project.push(OWNER, "experiment", snapshot({**tree, "c.py": "c\n"}), "next")
    assert branch.preview_state.version_label != first

    with pytest.raises(ValueError):
        _ = project.branches["main"].preview_state


def test_a_new_branch_is_seeded_from_main(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    branch = project.create_branch(OWNER, "experiment")
    assert branch.current_files == tree


def test_push_refuses_a_mixed_bundle(project, tree):
    """A promotion must resolve to one next state; a proposal need not."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    mixed = snapshot(tree)
    mixed.loose_files = ["README.md"]

    # A commit accepts it: a person reads a proposal and can tell what it means.
    project.commit(OWNER, "main", mixed, "mixed proposal", [])
    with pytest.raises(PushInvalidError):
        project.push(OWNER, "main", mixed, "mixed push")


def test_retract_is_blocked_once_it_is_history(project, tree):
    """Invariant 4 again, seen from the proposal's side."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(CONTRIBUTOR, "main", Attachment(), "proposal", [OWNER])

    with pytest.raises(PermissionError_):
        project.retract_commit(OWNER, commit.id)  # not the author

    project.merge(OWNER, commit.id)
    with pytest.raises(ValueError):
        project.retract_commit(CONTRIBUTOR, commit.id)


def test_a_retracted_commit_leaves_the_feed(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(CONTRIBUTOR, "main", Attachment(), "proposal", [OWNER])
    assert any(r["commit_id"] == commit.id for r in project.activity_feed_for_viewer(OWNER))

    project.retract_commit(CONTRIBUTOR, commit.id)
    assert not any(
        r["commit_id"] == commit.id for r in project.activity_feed_for_viewer(OWNER)
    )


def test_a_commit_reaches_only_its_recipients(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(CONTRIBUTOR, "main", Attachment(), "for Ada only", [OWNER])

    assert any(r["commit_id"] == commit.id for r in project.activity_feed_for_viewer(OWNER))
    assert not any(
        r["commit_id"] == commit.id for r in project.activity_feed_for_viewer(MAINTAINER)
    )
    with pytest.raises(PermissionError_):
        project.merge(MAINTAINER, commit.id)


def test_an_empty_recipient_list_is_a_broadcast(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(CONTRIBUTOR, "main", Attachment(), "for everyone", [])
    assert any(
        r["commit_id"] == commit.id for r in project.activity_feed_for_viewer(MAINTAINER)
    )


def test_every_version_stays_retrievable(project, tree):
    """A version is a snapshot, so old content survives later pushes byte for byte."""
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.push(OWNER, "main", snapshot({"README.md": "rewritten\n"}), "v2")

    assert project.files_at_version("main", "V1") == tree
    assert project.file_content_at_version("main", "V1", "src/app.py") == "print(1)\n"
    assert "src/app.py" not in project.files_at_version("main", "V2")


def test_loose_files_carry_forward_the_rest_of_the_tree(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    project.push(
        OWNER,
        "main",
        Attachment(loose_files=["README.md"], file_contents={"README.md": "# Changed\n"}),
        "touch one file",
    )
    files = project.branches["main"].current_files
    assert files["README.md"] == "# Changed\n"
    assert files["src/app.py"] == "print(1)\n"


def test_role_change_reaches_only_the_person_it_happened_to(project):
    project.grant_maintainer(OWNER, CONTRIBUTOR)
    theirs = [
        r for r in project.activity_feed_for_viewer(CONTRIBUTOR) if r["type"] == "role_changed"
    ]
    others = [
        r for r in project.activity_feed_for_viewer(MAINTAINER) if r["type"] == "role_changed"
    ]
    assert len(theirs) == 1
    assert others == []


def test_diff_stats_count_real_lines(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    commit = project.commit(
        OWNER,
        "main",
        Attachment(
            loose_files=["src/app.py"],
            file_contents={"src/app.py": "print(1)\nprint(2)\n"},
        ),
        "one more line",
        [],
    )
    assert commit.total_added == 1
    assert commit.total_removed == 0


def test_transfer_is_not_a_loan(project):
    project.transfer_ownership(OWNER, MAINTAINER)
    assert project.members[MAINTAINER].role is Role.OWNER
    assert project.members[OWNER].role is Role.MAINTAINER
    with pytest.raises(PermissionError_):
        project.transfer_ownership(OWNER, MAINTAINER)


def test_file_tree_nests_and_marks_leaves(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    nodes = project.file_tree("main")
    by_name = {node["name"]: node for node in nodes}
    assert by_name["README.md"]["type"] == "file"
    assert by_name["src"]["type"] == "folder"
    assert [child["path"] for child in by_name["src"]["children"]] == ["src/app.py"]


def test_a_hand_picked_label_never_collides_with_the_automatic_one(project, tree):
    """
    Every version is addressed by its label, so two of them may never share
    one. The API makes naming the sender's job, but the domain still names
    versions itself for the callers that have no sender to ask — the demo seed,
    and promoting somebody else's commit. Those two schemes have to interleave
    without ever meeting in the middle.
    """
    assert project.push(OWNER, "main", snapshot(tree), "v1").version_label == "V1"

    # A label the counter would have reached later, claimed by hand now.
    project.push(OWNER, "main", Attachment(), "named", version_label="V2")

    # The counter steps over what is taken rather than minting a second "V2".
    assert project.push(OWNER, "main", Attachment(), "v3").version_label == "V3"
    assert len(project.branches["main"]._by_label) == 3


def test_a_duplicate_version_label_is_refused(project, tree):
    project.push(OWNER, "main", snapshot(tree), "v1")
    with pytest.raises(ValueError):
        project.push(OWNER, "main", Attachment(), "again", version_label="V1")
