"""
Demo fixture: builds the "Orchid Lab" project the Figma frames were drawn
against, so every screen has real data the moment the server starts.

Why this exists: the _projects store in main.py is in-memory and starts
empty, but the front-end has no create-project flow -- the design assumes a
project is already open. Without a seed, every screen renders a 404.

Everything goes through the public Project API rather than poking at
internals, so the seeded history obeys the same invariants a real session
would. The one exception is _backdate() at the bottom; see its docstring.
"""

from __future__ import annotations

import time

from core import Attachment, Project, Role

OWNER = "Oliver"
EDEN = "Eden Sears"
JULIANA = "Juliana"

BRANCH = "Orchidlab Experiment AUG10"

# Mirrors PROJECT_FILES in front-end/src/data/project.ts. Folders are
# implicit in this backend -- a directory exists only because some file path
# mentions it -- so each folder needs a file in it to appear at all.
INITIAL_TREE = {
    ".env": "API_URL=http://127.0.0.1:8000\n",
    "README.md": "# Orchid Lab\n\nA Compiler demo project.\n",
    "pack.json": "{\n  \"name\": \"orchid-lab\"\n}\n",
    "pack-lock.json": "{\n  \"lockfileVersion\": 3\n}\n",
    "api/routes.js": "export const routes = []\n",
    "assets/logo.svg": "<svg viewBox=\"0 0 24 24\"></svg>\n",
    "public/index.html": "<!doctype html>\n<div id=\"root\"></div>\n",
    "src/ContentView.js": "export function ContentView() {\n  return null\n}\n",
    "src/TableView.js": "export function TableView() {\n  return null\n}\n",
    "src/TableContent.css": ".table {\n  display: grid;\n}\n",
}


def _edit(tree: dict[str, str], path: str, added: int) -> dict[str, str]:
    """Appends N lines to one file, so diff stats on screen are real."""
    body = tree[path] + "".join(f"// revision line {i}\n" for i in range(added))
    return {path: body}


def build_demo_project() -> Project:
    p = Project(owner_name=OWNER, name="Orchid Lab")
    p.invite_member(actor=OWNER, new_member=EDEN, role=Role.CONTRIBUTOR)
    p.invite_member(actor=OWNER, new_member=JULIANA, role=Role.CONTRIBUTOR)
    p.set_preview_image(actor=OWNER,
                        image_ref="/assets/images/orchid-lab-preview.png")

    # Created before Main holds any files, deliberately. create_branch() seeds
    # a new branch by pushing the current Main snapshot into it, and that push
    # would log an Activity row the Figma frames do not have. With Main still
    # empty there is nothing to seed, so the ledger stays clean.
    p.create_branch(actor=OWNER, name=BRANCH,
                    deploy_subdomain="orchidlab-experiment")

    tree = dict(INITIAL_TREE)

    def push(actor: str, comment: str) -> str:
        rec = p.push(actor=actor, branch="main",
                     attachment=Attachment(folder_ref="tree",
                                           tree_snapshot=dict(tree)),
                     comment=comment)
        return rec.version_label

    def commit(actor: str, comment: str, path: str, added: int, to: list[str]):
        return p.commit(actor=actor, branch="main",
                        attachment=Attachment(
                            loose_files=[path],
                            file_contents=_edit(tree, path, added)),
                        comment=comment, view_by=to)

    # The ledger below is the Figma Activity table read bottom-up (oldest
    # first). Each comment string is verbatim from data/logs.ts -- trailing
    # spaces and inconsistent version casing included -- because the backend
    # renders rows as "Committed {comment}" and "Pushed {comment} to
    # {branch}". The comment IS the log line.
    v1 = push(OWNER, "Orchid Lab V0.1")
    commit(JULIANA, "TableView.js V0.1 ", "src/TableView.js", 12, [OWNER])
    commit(EDEN, "ContentView.js v0.1", "src/ContentView.js", 20, [OWNER])
    commit(EDEN, "ContentView.js v0.1.1", "src/ContentView.js", 8, [OWNER])

    p.deploy(actor=OWNER, version_label=v1)  # deploys never reach Activity
    p.undo(actor=OWNER, target_version_label=v1)

    commit(JULIANA, "TableView.js V1 ", "src/TableView.js", 31, [OWNER])
    commit(EDEN, "ContentView.js v1.1", "src/ContentView.js", 45, [OWNER])
    commit(EDEN, "ContentView.js v1.1.1", "src/ContentView.js", 45, [OWNER])
    # Oliver authored this one, so his own row for it reads "View" while every
    # commit addressed TO him reads "Merge".
    commit(OWNER, "Orchid Lab V2 ", "README.md", 4, [EDEN, JULIANA])

    tree.update(_edit(tree, "src/ContentView.js", 45))
    v2 = push(EDEN, "ContentView.js v1.1.1")
    p.deploy(actor=OWNER, version_label=v2)

    commit(JULIANA, "TableView.js V1 .1", "src/TableView.js", 45, [OWNER])
    tree.update(_edit(tree, "src/TableView.js", 45))
    push(JULIANA, "TableView.js V1 .1")

    tree.update(_edit(tree, "README.md", 4))
    v4 = push(OWNER, "Orchid Lab V2 ")
    p.deploy(actor=OWNER, version_label=v4)
    p.undo(actor=OWNER, target_version_label=v2)

    tree.update(_edit(tree, "pack.json", 2))
    push(OWNER, "Orchid Lab V2.1")

    commit(EDEN, "ContentView.js v1.2 ", "src/ContentView.js", 17, [OWNER])

    tree.update(_edit(tree, "src/TableView.js", 26))
    v6 = push(JULIANA, "TableView.js v2")
    # Production settles here and stays. The final push below is deliberately
    # never deployed, so Archive shows "Applied" on the second row --
    # Invariant 1: advancing Main never changes what production serves.
    p.deploy(actor=OWNER, version_label=v6)

    # Oliver merges this one, which flips his row for it from "Merge" to
    # "Undo" -- the asymmetric label the Action column depends on.
    merged = commit(JULIANA, "refined  TableView.js v2, TableContent.css v3  ",
                    "src/TableContent.css", 9, [OWNER])
    p.merge(actor=OWNER, commit_id=merged.id)

    commit(EDEN, "refined ContentView.js v2 ", "src/ContentView.js", 45, [OWNER])
    commit(EDEN, "refined ContentView.js v2.1 ", "src/ContentView.js", 45, [OWNER])

    tree.update(_edit(tree, "src/ContentView.js", 45))
    push(OWNER, "Orchid Lab V3")

    _backdate(p)
    return p


def _backdate(p: Project) -> None:
    """
    Spreads the seeded history across early August instead of the few
    milliseconds it actually took to build.

    Every record above was stamped with time.time() at construction, so the
    Time column on Archive would otherwise print one identical date on every
    row. Rewriting the stamps is the only thing here that reaches past the
    public API, and it is safe precisely because it preserves order: events
    are re-stamped strictly increasing in ledger order, and each commit, push
    and deploy record inherits the stamp of the event that announced it.
    Nothing that reads a timestamp can tell the difference.
    """
    base = time.mktime((2026, 8, 1, 9, 0, 0, 0, 0, -1))
    step = 6 * 3600

    for i, e in enumerate(p.events):
        e.timestamp = base + i * step

    by_commit = {e.commit_id: e.timestamp for e in p.events if e.type == "commit"}
    by_push = {e.push_id: e.timestamp for e in p.events if e.type == "push"}

    for b in p.branches.values():
        for c in b.commits:
            if c.id in by_commit:
                c.timestamp = by_commit[c.id]
        for rec in b.pushes:
            if rec.id in by_push:
                rec.timestamp = by_push[rec.id]

    # Deploy records carry no id on their events, but they are created in the
    # same order those events are logged, so the two sequences zip.
    stamps = [e.timestamp for e in p.events if e.type in ("deploy", "undo")]
    for rec, stamp in zip(p.deploy_history, stamps, strict=True):
        rec.timestamp = stamp
