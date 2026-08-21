"""
Line counts for the "+45 -0" stat the activity surfaces print.

Uses stdlib ``difflib`` — no new dependency, and the same family of algorithm
``git diff --stat`` is built on.
"""

from __future__ import annotations

import difflib


def compute_diff(old_content: str, new_content: str) -> dict[str, int]:
    """
    Added and removed line counts between two revisions of one file.

    The equality check in front is not a micro-optimisation, it is what makes
    a folder push tractable. Pushing a directory attaches every file in it,
    but a working session changes a handful of them; without this, a
    2,000-file tree would run 2,000 ``SequenceMatcher`` passes — an algorithm
    that is quadratic in the worst case — while holding the project lock, for
    a result that is zero on all but a few. Identical content is the common
    case, and it is answered without looking at a single line.
    """
    if old_content == new_content:
        return {"added": 0, "removed": 0}

    # autojunk is left at its default, on. It costs a little accuracy on large
    # files — lines recurring in more than 1% of one, a blank line or a bare
    # "}", stop being candidates for matching — and turning it off was tried.
    # It is not survivable: on a 52,000-line file of near-identical lines,
    # which is well inside the per-file size cap, the matcher went from 0.01
    # seconds to over two minutes, all of it spent holding the project lock.
    # A slightly coarse line count is a much smaller problem than a push that
    # freezes the project it is pushing to.
    matcher = difflib.SequenceMatcher(a=old_content.splitlines(), b=new_content.splitlines())

    added = removed = 0
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "replace":
            removed += i2 - i1
            added += j2 - j1
        elif tag == "delete":
            removed += i2 - i1
        elif tag == "insert":
            added += j2 - j1
    return {"added": added, "removed": removed}


def diff_stats_for_change(
    previous_files: dict[str, str],
    new_files: dict[str, str],
    changed_paths: list[str],
) -> tuple[dict[str, dict[str, int]], int, int]:
    """
    Per-file diff stats for a set of changed paths, plus the totals shown as
    the headline figure on an activity row.
    """
    per_file: dict[str, dict[str, int]] = {}
    total_added = total_removed = 0
    for path in changed_paths:
        stat = compute_diff(previous_files.get(path, ""), new_files.get(path, ""))
        per_file[path] = stat
        total_added += stat["added"]
        total_removed += stat["removed"]
    return per_file, total_added, total_removed
