"""
The claims about locking and about cost, made checkable.

Both of these guard a property that is invisible in normal use and expensive
when it breaks: a lost update under concurrent pushes, and a folder push whose
diff pass grows with the size of the tree rather than with the size of the
change.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

from core import Attachment

from .conftest import OWNER, snapshot


def test_concurrent_pushes_do_not_lose_an_update(project):
    """
    ``push`` reads the branch's files, merges the change in, and appends the
    result. Without the project lock, two pushes to different paths can each
    read the same snapshot, and the second to finish silently reverts the
    first — the head ends up holding one change instead of both.
    """
    project.push(OWNER, "main", snapshot({f"f{i}.txt": "0\n" for i in range(20)}), "base")

    def write(index: int) -> None:
        path = f"f{index}.txt"
        project.push(
            OWNER,
            "main",
            Attachment(loose_files=[path], file_contents={path: f"{index}\n"}),
            f"edit {index}",
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(write, range(20)))

    head = project.branches["main"].current_files
    # Every writer's change survived, which can only be true if each push built
    # on the state the one before it left.
    assert {path: head[path] for path in head} == {
        f"f{i}.txt": f"{i}\n" for i in range(20)
    }
    assert len(project.branches["main"].pushes) == 21


def test_version_labels_are_unique_under_concurrency(project):
    """
    ``next_version_label`` mutates a counter. Two pushes claiming the same
    label would make ``files_at_version`` ambiguous and put two rows with one
    name on the Archive shelf.
    """
    project.push(OWNER, "main", snapshot({"a.txt": "a\n"}), "base")

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(
            pool.map(
                lambda i: project.push(
                    OWNER,
                    "main",
                    Attachment(loose_files=["a.txt"], file_contents={"a.txt": f"{i}\n"}),
                    f"e{i}",
                ),
                range(30),
            )
        )

    labels = [p.version_label for p in project.branches["main"].pushes]
    assert len(labels) == len(set(labels))


def test_an_unchanged_folder_push_is_cheap(project):
    """
    A folder push attaches every file in the directory, but a working session
    changes a handful of them. Diffing all of them line by line made the cost
    of a push scale with the size of the project rather than with the size of
    the change; identical content is now answered without comparing lines.
    """
    # Files big enough that a real line-by-line pass would be measurable.
    tree = {f"src/f{i}.py": "line\n" * 2000 for i in range(120)}
    project.push(OWNER, "main", snapshot(tree), "base")

    changed = {**tree, "src/f0.py": "line\n" * 2000 + "one more\n"}
    started = time.perf_counter()
    record = project.push(OWNER, "main", snapshot(changed), "one line changed")
    elapsed = time.perf_counter() - started

    assert record.total_added == 1
    assert record.total_removed == 0
    # Generous by two orders of magnitude against the fast path, and still far
    # under what 120 full SequenceMatcher passes over 2,000 lines would cost.
    assert elapsed < 2.0


def test_a_pathological_file_does_not_stall_the_diff(project):
    """
    A regression guard with a number attached, because the obvious "accuracy"
    improvement here is a trap. ``SequenceMatcher``'s autojunk heuristic looks
    like a distortion worth turning off — it stops matching lines that recur
    in more than 1% of a large file — but on a file of near-identical lines,
    still inside the per-file size cap, disabling it took the diff from
    hundredths of a second to over two minutes, spent holding the project
    lock. If this test ever starts timing out, that is what happened.
    """
    base = "line\n" * 52000
    project.push(OWNER, "main", snapshot({"big.txt": base}), "base")

    started = time.perf_counter()
    project.push(OWNER, "main", snapshot({"big.txt": base + "tail\n"}), "one more line")
    assert time.perf_counter() - started < 5.0
