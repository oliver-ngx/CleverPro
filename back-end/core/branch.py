"""
A line of development: Main, or an experiment beside it.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from .attachments import build_file_tree
from .records import Commit, PushRecord


@dataclass
class Branch:
    name: str
    is_main: bool = False
    deploy_subdomain: str | None = None
    # Who has visibility of this line. Defaults to the whole project.
    members: set[str] = field(default_factory=set)
    commits: list[Commit] = field(default_factory=list)
    pushes: list[PushRecord] = field(default_factory=list)
    version_counter: int = 0
    # label -> the push that produced it. Maintained alongside `pushes` so
    # resolving a version by name is a lookup rather than a scan; deploy,
    # undo and every attachment carrying a `version_ref` do exactly that, and
    # each was previously walking the whole push list.
    _by_label: dict[str, PushRecord] = field(default_factory=dict, repr=False)

    def record_push(self, push: PushRecord) -> None:
        """Append a push and keep the label index in step with it."""
        self.pushes.append(push)
        self._by_label[push.version_label] = push

    def version(self, label: str) -> PushRecord | None:
        """The push that produced `label`, or None if this line has no such version."""
        return self._by_label.get(label)

    @property
    def head(self) -> PushRecord | None:
        """Latest pushed state of this line — its "current" version."""
        return self.pushes[-1] if self.pushes else None

    @property
    def current_files(self) -> dict[str, str]:
        """The real file content this branch currently holds, path -> content."""
        return self.head.files if self.head else {}

    def file_tree(self) -> list[dict[str, Any]]:
        """Nested tree shape for the Main surface's file view."""
        return build_file_tree(self.current_files)

    @property
    def preview_state(self) -> PushRecord | None:
        """
        A branch preview always reflects the branch's latest pushed state: it
        auto-updates, with no separate deploy step. Main is the exception —
        its live state is production, which is tracked on the Project and
        advances only when somebody with release authority says so.
        """
        if self.is_main:
            raise ValueError(
                "Main's live state is production, tracked on Project.deployed_version "
                "— not preview_state."
            )
        return self.head

    def next_version_label(self) -> str:
        """
        Claim the next label on this line.

        Mutates the counter, so it is called exactly once per push and only
        from inside the project lock. Main counts versions (V1, V2); a branch
        stamps the date, since an experiment's history is read by when it
        happened rather than by how far along it is.

        The counter is a proposal, not the answer: a push may be named by hand,
        and somebody who names one "V4" has taken a label the counter would
        otherwise reach later. So this walks forward until it finds a label
        this line does not already hold, which keeps `_by_label` a bijection
        however the two naming schemes interleave.
        """
        while True:
            self.version_counter += 1
            if self.is_main:
                label = f"V{self.version_counter}"
            else:
                stamp = time.strftime("%b%d", time.localtime())
                label = stamp + (f"-{self.version_counter}" if self.version_counter > 1 else "")
            if label not in self._by_label:
                return label
