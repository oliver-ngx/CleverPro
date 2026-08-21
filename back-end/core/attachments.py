"""
What a Commit or a Push carries, and how a flat path map becomes a tree.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Attachment:
    """
    A bundle of what is being sent.

    Either a single folder/version reference or a set of individual loose
    files — never validated as "mixed" until Push time, per the Push-validity
    rule. A proposal is read by a person and may be heterogeneous; a promotion
    has to name one unambiguous next state.

    ``file_contents`` carries the actual content for entries in
    ``loose_files`` (path -> text). ``tree_snapshot`` carries a full
    replacement tree when ``folder_ref`` is used (path -> text for every file
    in that whole version). This is what makes Push and Undo operate on real
    content instead of on labels.
    """

    folder_ref: str | None = None
    loose_files: list[str] = field(default_factory=list)
    file_contents: dict[str, str] = field(default_factory=dict)
    tree_snapshot: dict[str, str] | None = None

    def is_mixed(self) -> bool:
        """Whether this bundle names a whole tree *and* individual files."""
        return bool(self.folder_ref) and bool(self.loose_files)

    def describe(self) -> str:
        parts = []
        if self.folder_ref:
            parts.append(f"folder-ref={self.folder_ref}")
        if self.loose_files:
            parts.append(f"loose_files={self.loose_files}")
        return ", ".join(parts) or "empty"


def build_file_tree(files: dict[str, str]) -> list[dict[str, Any]]:
    """
    Turn a flat ``{path: content}`` map into the nested tree the Main surface
    renders — folders with children, files as leaves.

    ``checked`` defaults to True because it means "included in this version"
    rather than being a permanent flag; the composer lets the user untick
    entries when building an attachment, and the resting state is everything.

    Folders exist only because some path mentions them: this backend stores no
    directory entries, so an empty folder cannot be represented and does not
    need to be.
    """
    root: dict[str, dict[str, Any]] = {}
    for path in sorted(files):
        parts = path.split("/")
        node = root
        for index, part in enumerate(parts):
            is_file = index == len(parts) - 1
            if part not in node:
                node[part] = {"is_file": is_file, "children": {}}
            node = node[part]["children"]

    def to_list(children: dict[str, dict[str, Any]], prefix: str) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for name, meta in children.items():
            path = f"{prefix}{name}"
            if meta["is_file"]:
                out.append({"name": name, "type": "file", "path": path, "checked": True})
            else:
                out.append({
                    "name": name,
                    "type": "folder",
                    "path": path,
                    "checked": True,
                    "children": to_list(meta["children"], path + "/"),
                })
        return out

    return to_list(root, "")
