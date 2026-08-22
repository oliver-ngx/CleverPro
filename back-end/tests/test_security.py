"""
The defects this API used to have, each pinned by a test so it cannot come
back quietly.

Read this file as a record of what was wrong rather than as coverage for its
own sake. Every case here failed before the fix beside it, and several were
failures of the *edge* — a 500 where a 422 belonged, an unbounded read on a
public route — which no amount of domain testing would have caught.
"""

from __future__ import annotations

import io
import json

import pytest

from app.config import settings
from app.store import ProjectStore
from core import PermissionError_, Project, Role

from .conftest import CONTRIBUTOR, MAINTAINER, OWNER

PROJECT = "/projects/proj_test"


# ---- credentials ---------------------------------------------------------


def test_invite_tokens_are_not_guessable():
    """
    Tokens used to come off the same sequential counter as the record ids, so
    ``tok-6`` implied ``tok-7`` and one leaked invite link exposed every other
    project's. They are drawn from the OS CSPRNG now.
    """
    first = Project(owner_name=OWNER).invite_token
    second = Project(owner_name=OWNER).invite_token

    assert first != second
    # Sequential tokens would differ by a single digit; these share only the prefix.
    assert len(first) > 24
    body = first.removeprefix("tok-")
    assert not body.isdigit()


def test_regenerating_replaces_the_token(project):
    old = project.invite_token
    new = project.regenerate_invite_link(OWNER)
    assert new != old
    assert project.invite_token == new


def test_regenerate_is_maintainer_and_above(project):
    with pytest.raises(PermissionError_):
        project.regenerate_invite_link(CONTRIBUTOR)


# ---- privilege ------------------------------------------------------------


def test_inviting_an_existing_member_cannot_demote_them(project):
    """
    ``invite_member`` used to overwrite the roster entry, which let any
    Maintainer demote the Owner by "inviting" them as a Contributor.
    """
    with pytest.raises(ValueError):
        project.invite_member(actor=MAINTAINER, new_member=OWNER, role=Role.CONTRIBUTOR)
    assert project.members[OWNER].role is Role.OWNER


def test_owner_cannot_be_a_default_invite_role(project):
    """One project, one Owner: ownership is transferred, never handed out."""
    with pytest.raises(ValueError):
        project.set_default_invite_role(OWNER, Role.OWNER)


def test_granting_maintainer_cannot_demote_the_owner(project):
    with pytest.raises(ValueError):
        project.grant_maintainer(OWNER, OWNER)
    assert project.members[OWNER].role is Role.OWNER


def test_a_refused_action_is_403_not_500(client):
    """
    Error translation used to be a decorator applied route by route, so a
    route somebody forgot to decorate answered a permission failure with an
    unhandled exception. It is registered on the application now.
    """
    response = client.post(f"{PROJECT}/deploy", json={"actor": CONTRIBUTOR})
    assert response.status_code == 403
    assert "cannot deploy" in response.json()["detail"]


def test_a_non_member_cannot_act(client):
    response = client.post(f"{PROJECT}/deploy", json={"actor": "Nobody"})
    assert response.status_code == 403


# ---- deleted projects -----------------------------------------------------


def test_a_deleted_project_stops_serving(client):
    """
    ``delete_project`` used to set a flag nothing read, so every endpoint kept
    answering normally after the project had been deleted.
    """
    assert client.get(f"{PROJECT}/overview").status_code == 200
    assert client.post(f"{PROJECT}/settings/delete", json={"actor": OWNER}).status_code == 200

    for path in ("/overview", "/team", "/archive", "/settings", "/branches"):
        assert client.get(f"{PROJECT}{path}").status_code == 404, path
    assert client.post(f"{PROJECT}/deploy", json={"actor": OWNER}).status_code == 404


def test_only_the_owner_can_delete(client):
    assert client.post(f"{PROJECT}/settings/delete", json={"actor": MAINTAINER}).status_code == 403
    assert client.get(f"{PROJECT}/overview").status_code == 200


# ---- identifiers ----------------------------------------------------------


def test_project_ids_are_not_a_counter():
    """
    Ids used to be ``proj_{len(projects) + 1}``: guessable by counting, and a
    collision the moment anything was removed.
    """
    store = ProjectStore()
    first, _ = store.create("Ada")
    second, _ = store.create("Bo")

    assert first != second
    assert first not in ("proj_1", "proj_2")
    assert len(first) > 16


# ---- payload size ---------------------------------------------------------


def test_an_oversized_tree_is_refused(client):
    """
    Attachments carry file content inline and every version is kept forever,
    so an unbounded ``tree_snapshot`` was an unbounded allocation reachable
    from an unauthenticated POST.
    """
    huge = {f"f{i}.txt": "x" for i in range(settings.max_tree_files + 1)}
    response = client.post(
        f"{PROJECT}/push",
        json={"actor": OWNER, "branch": "main", "folder_ref": "t",
              "tree_snapshot": huge, "comment": "too big", "name": "V1"},
    )
    assert response.status_code == 422


def test_an_oversized_single_file_is_refused(client):
    over = "x" * (settings.max_file_chars + 1)
    response = client.post(
        f"{PROJECT}/push",
        json={"actor": OWNER, "branch": "main", "folder_ref": "t",
              "tree_snapshot": {"big.txt": over}, "comment": "too big", "name": "V1"},
    )
    assert response.status_code == 422


def test_an_empty_comment_is_refused(client):
    response = client.post(
        f"{PROJECT}/push",
        json={"actor": OWNER, "branch": "main", "folder_ref": "t",
              "tree_snapshot": {"a.txt": "a"}, "comment": "", "name": "V1"},
    )
    assert response.status_code == 422


# ---- upload ---------------------------------------------------------------


def test_import_rejects_a_non_json_name(client):
    response = client.post("/import", files={"file": ("notes.txt", io.BytesIO(b"{}"))})
    assert response.status_code == 422


def test_import_survives_a_missing_filename(client):
    """
    ``file.filename.endswith(...)`` raised AttributeError on a part with no
    filename, which surfaced as a 500 rather than as the 422 it is.
    """
    response = client.post("/import", files={"file": ("", io.BytesIO(b"{}"))})
    assert response.status_code == 422


def test_import_rejects_an_oversized_body(client):
    payload = json.dumps({"pad": "x" * (settings.max_upload_bytes + 100)}).encode()
    response = client.post("/import", files={"file": ("big.json", io.BytesIO(payload))})
    assert response.status_code == 413


def test_import_rejects_a_top_level_array(client):
    response = client.post("/import", files={"file": ("a.json", io.BytesIO(b"[1, 2]"))})
    assert response.status_code == 422


def test_import_accepts_a_json_object(client):
    response = client.post("/import", files={"file": ("a.json", io.BytesIO(b'{"k": 1}'))})
    assert response.status_code == 200
    assert response.json()["top_level_keys"] == ["k"]


# ---- values that reach the DOM --------------------------------------------


def test_custom_domain_must_be_a_hostname(client):
    """
    The value is rendered as ``https://{host}`` in the Deploy row's link.
    React escapes the attribute, so this is not the last line of defence — but
    a value that cannot be a host has no business being stored as one.
    """
    for bad in ("javascript:alert(1)", "https://example.com", "ex ample.com", "a/b"):
        response = client.post(
            f"{PROJECT}/settings/custom-domain", json={"actor": OWNER, "value": bad}
        )
        assert response.status_code == 400, bad

    ok = client.post(
        f"{PROJECT}/settings/custom-domain", json={"actor": OWNER, "value": "Orchid.Example.COM"}
    )
    assert ok.status_code == 200
    assert ok.json()["custom_domain"] == "orchid.example.com"


def test_custom_domain_can_be_cleared(client):
    client.post(
        f"{PROJECT}/settings/custom-domain", json={"actor": OWNER, "value": "a.example.com"}
    )
    body = client.post(
        f"{PROJECT}/settings/custom-domain", json={"actor": OWNER, "value": None}
    ).json()
    assert body["custom_domain"] is None


def test_deploy_subdomain_must_be_one_label(client):
    response = client.post(
        f"{PROJECT}/branches",
        json={"actor": OWNER, "name": "exp", "deploy_subdomain": "http://evil.com"},
    )
    assert response.status_code == 400


def test_a_renamed_project_reprovisions_its_domain(client):
    client.post(f"{PROJECT}/rename", json={"actor": OWNER, "value": "Violet Works"})
    push_body = {"actor": OWNER, "branch": "main", "folder_ref": "t",
                 "tree_snapshot": {"a.txt": "a"}, "comment": "v1", "name": "V1"}
    client.post(f"{PROJECT}/push", json=push_body)
    client.post(f"{PROJECT}/deploy", json={"actor": OWNER})
    assert client.get(f"{PROJECT}/overview").json()["deploy_url"] == "violet-works.cleverpro.com"


def test_a_project_cannot_be_renamed_to_nothing(client):
    response = client.post(f"{PROJECT}/rename", json={"actor": OWNER, "value": "   "})
    assert response.status_code == 400
