"""
Every endpoint the client actually calls, over HTTP.

The point of testing at this level rather than only against `core` is the
translation layer: that a refused permission arrives as 403 and not 500, that
a `version_ref` is resolved server-side, and that the JSON keys are the ones
`front-end/src/api/types.ts` declares. A rename in the domain that the routes
forget to follow shows up here and nowhere else.
"""

from __future__ import annotations

from .conftest import CONTRIBUTOR, MAINTAINER, OWNER

PROJECT = "/projects/proj_test"


def push(client, comment="v1", files=None, name=None):
    """
    Put a version on Main and return its label.

    Every push over HTTP has to be named, so this names them in sequence --
    V1, V2, V3 -- for the tests that only care that a version exists. That is
    the sequence the domain picked on its own before naming became the
    sender's job, which is why the assertions below still read "V1".
    """
    if name is None:
        # The archive already holds V0, the version the project was created at,
        # so its length is the number of the next one rather than one behind it.
        name = f"V{len(client.get(f'{PROJECT}/archive').json())}"
    response = client.post(
        f"{PROJECT}/push",
        json={
            "actor": OWNER,
            "branch": "main",
            "folder_ref": "tree",
            "tree_snapshot": files or {"README.md": "# One\n", "src/app.py": "print(1)\n"},
            "comment": comment,
            "name": name,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["version_label"]


# ---- reads ---------------------------------------------------------------


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_overview_shape(client):
    body = client.get(f"{PROJECT}/overview").json()
    assert set(body) == {
        "preview_image",
        "project_name",
        "current_version",
        "deploy_url",
        "branches",
    }
    # A project is created at a version -- V0, the state it starts from -- but
    # nothing has been released, so there is no live URL yet.
    assert body["current_version"] == "V0"
    assert body["deploy_url"] is None


def test_deploy_url_appears_only_after_a_release(client):
    push(client)
    assert client.get(f"{PROJECT}/overview").json()["deploy_url"] is None
    client.post(f"{PROJECT}/deploy", json={"actor": OWNER})
    assert client.get(f"{PROJECT}/overview").json()["deploy_url"] == "orchid-lab.cleverpro.com"


def test_team_shape(client):
    body = client.get(f"{PROJECT}/team").json()
    assert {m["name"]: m["role"] for m in body} == {
        OWNER: "owner",
        MAINTAINER: "maintainer",
        CONTRIBUTOR: "contributor",
    }


def test_branch_files_are_nested(client):
    push(client)
    body = client.get(f"{PROJECT}/branches/main/files").json()
    folder = next(node for node in body if node["type"] == "folder")
    assert folder["name"] == "src"
    assert folder["children"][0]["path"] == "src/app.py"


def test_missing_project_is_404(client):
    assert client.get("/projects/nope/overview").status_code == 404


def test_missing_branch_is_404(client):
    assert client.get(f"{PROJECT}/branches/ghost/files").status_code == 404


# ---- writes --------------------------------------------------------------


def test_commit_then_merge_then_unmerge(client):
    push(client)
    commit_id = client.post(
        f"{PROJECT}/commit",
        json={
            "actor": CONTRIBUTOR,
            "branch": "main",
            "loose_files": ["README.md"],
            "file_contents": {"README.md": "# Two\n"},
            "comment": "a proposal",
            "view_by": [OWNER],
            "name": "Readme pass",
        },
    ).json()["commit_id"]

    def action_for(viewer):
        rows = client.get(f"{PROJECT}/activity/{viewer}").json()
        return next(r["action"] for r in rows if r["commit_id"] == commit_id)

    assert action_for(OWNER) == "Merge"
    assert client.post(f"{PROJECT}/merge/{commit_id}", json={"actor": OWNER}).status_code == 200
    assert action_for(OWNER) == "Undo"
    assert client.post(f"{PROJECT}/unmerge/{commit_id}", json={"actor": OWNER}).status_code == 200
    assert action_for(OWNER) == "Merge"


def test_a_version_ref_is_resolved_server_side(client):
    """
    The client names a label; the server supplies the bytes. This is the half
    of the attachment model a browser cannot do for itself.
    """
    label = push(client, files={"a.py": "one\n"})
    push(client, comment="v2", files={"a.py": "two\n"})

    response = client.post(
        f"{PROJECT}/push",
        json={
            "actor": OWNER,
            "branch": "main",
            "version_ref": label,
            "comment": "restore the first tree",
            "name": "V3",
        },
    )
    assert response.status_code == 200, response.text
    assert client.get(f"{PROJECT}/branches/main/files").json()[0]["name"] == "a.py"
    content = client.get(
        f"{PROJECT}/branches/main/versions/V3/files/content", params={"path": "a.py"}
    ).json()
    assert content["content"] == "one\n"


def test_a_mixed_push_is_422(client):
    push(client)
    response = client.post(
        f"{PROJECT}/push",
        json={
            "actor": OWNER,
            "branch": "main",
            "version_ref": "V1",
            "loose_files": ["README.md"],
            "comment": "mixed",
            "name": "Mixed",
        },
    )
    assert response.status_code == 422
    assert "mixes" in response.json()["detail"]


def test_archive_marks_exactly_one_row_applied(client):
    push(client)
    push(client, comment="v2")
    client.post(f"{PROJECT}/deploy", json={"actor": OWNER, "version_label": "V1"})

    # Newest first, with V0 -- the version the project was created at -- last.
    rows = client.get(f"{PROJECT}/archive").json()
    assert [r["action"] for r in rows] == ["Undo", "Applied", "Undo"]

    client.post(f"{PROJECT}/undo", json={"actor": OWNER, "version_label": "V2"})
    rows = client.get(f"{PROJECT}/archive").json()
    assert [r["action"] for r in rows] == ["Applied", "Undo", "Undo"]


def test_create_branch_returns_the_name_the_server_settled_on(client):
    push(client)
    body = client.post(f"{PROJECT}/branches", json={"actor": OWNER, "name": ""}).json()
    assert body["branch"].startswith("orchid-lab-experiment-")
    assert body["seeded_from_main"] is True


def test_branch_members_default_to_the_whole_team(client):
    body = client.post(f"{PROJECT}/branches", json={"actor": OWNER, "name": "exp"}).json()
    assert set(body["members"]) == {OWNER, MAINTAINER, CONTRIBUTOR}


def test_comments_round_trip(client):
    push(client)
    commit_id = client.post(
        f"{PROJECT}/commit",
        json={"actor": OWNER, "branch": "main", "comment": "c", "view_by": [], "name": "c"},
    ).json()["commit_id"]

    client.post(
        f"{PROJECT}/commits/{commit_id}/comments", json={"actor": MAINTAINER, "text": "looks good"}
    )
    notes = client.get(f"{PROJECT}/commits/{commit_id}/comments").json()
    assert [n["text"] for n in notes] == ["looks good"]
    assert notes[0]["author"] == MAINTAINER


def test_flag_toggles(client):
    push(client)
    commit_id = client.post(
        f"{PROJECT}/commit",
        json={"actor": OWNER, "branch": "main", "comment": "c", "view_by": [], "name": "c"},
    ).json()["commit_id"]

    client.post(f"{PROJECT}/commits/{commit_id}/flag", json={"actor": OWNER, "flagged": True})
    row = next(
        r
        for r in client.get(f"{PROJECT}/team/{OWNER}/activity").json()
        if r["commit_id"] == commit_id
    )
    assert row["flagged"] is True
    assert row["status"] == "pending"


def test_settings_writes_return_the_whole_object(client):
    body = client.post(f"{PROJECT}/settings/link", json={"actor": OWNER, "enabled": False}).json()
    assert body["anyone_with_link"] is False
    assert "invite_token" in body


def test_member_activity_carries_the_pieces_apart(client):
    push(client, comment="Orchid Lab V1")
    rows = client.get(f"{PROJECT}/team/{OWNER}/activity").json()
    assert rows[0]["type"] == "push"
    assert rows[0]["comment"] == "Orchid Lab V1"
    assert rows[0]["version_label"] == "V1"
    assert rows[0]["diff"]["added"] > 0


# ---- naming a commit or a push -------------------------------------------


def test_a_push_can_be_named(client):
    """The Action window's Name field: the label is the author's, not the counter's."""
    body = client.post(
        f"{PROJECT}/push",
        json={
            "actor": OWNER,
            "branch": "main",
            "folder_ref": "tree",
            "tree_snapshot": {"README.md": "# One\n"},
            "comment": "first",
            "name": "Ocean rewrite",
        },
    ).json()
    assert body["version_label"] == "Ocean rewrite"

    # And it is a real label everywhere labels are used, not a display string.
    assert [row["version_label"] for row in client.get(f"{PROJECT}/archive").json()] == [
        "Ocean rewrite",
        "V0",
    ]
    files = client.get(f"{PROJECT}/branches/main/versions/Ocean rewrite/files").json()
    assert [node["name"] for node in files] == ["README.md"]


def test_a_nameless_push_is_refused(client):
    """
    There is no automatic option over HTTP. A push arrives named or it does
    not arrive, which is the whole of the rule the composer enforces at the
    other end.
    """
    push(client)
    for body in (
        {"actor": OWNER, "branch": "main", "loose_files": ["README.md"], "comment": "c"},
        {**{"actor": OWNER, "branch": "main", "comment": "c"}, "name": ""},
        {**{"actor": OWNER, "branch": "main", "comment": "c"}, "name": "   "},
    ):
        assert client.post(f"{PROJECT}/push", json=body).status_code == 422, body


def test_a_nameless_commit_is_refused(client):
    push(client)
    for name in (None, "", "   "):
        body = {"actor": OWNER, "branch": "main", "comment": "c", "view_by": []}
        if name is not None:
            body["name"] = name
        assert client.post(f"{PROJECT}/commit", json=body).status_code == 422, body


def test_a_duplicate_version_name_is_refused(client):
    push(client, comment="first")
    response = client.post(
        f"{PROJECT}/push",
        json={
            "actor": OWNER,
            "branch": "main",
            "loose_files": ["README.md"],
            "comment": "again",
            "name": "V1",
        },
    )
    assert response.status_code == 400
    assert "already a version" in response.json()["detail"]


def test_a_version_name_cannot_carry_a_slash(client):
    """A label addresses a version in a URL path, so it may not contain route structure."""
    push(client)
    response = client.post(
        f"{PROJECT}/push",
        json={
            "actor": OWNER,
            "branch": "main",
            "loose_files": ["README.md"],
            "comment": "bad",
            "name": "feature/ocean",
        },
    )
    assert response.status_code == 400


def test_a_commit_can_be_named(client):
    push(client)
    client.post(
        f"{PROJECT}/commit",
        json={
            "actor": OWNER,
            "branch": "main",
            "loose_files": ["README.md"],
            "comment": "tidied the readme",
            "view_by": [],
            "name": "Readme pass",
        },
    )
    row = client.get(f"{PROJECT}/team/{OWNER}/activity").json()[-1]
    assert row["type"] == "commit"
    assert row["name"] == "Readme pass"
    # The comment is still the log line; the name does not replace it.
    assert row["comment"] == "tidied the readme"
