"""
Identifiers, and the distinction between the two kinds this project needs.

**Record ids** (commits, pushes, deploys, events) are sequential and readable:
``commit-14``. They are handed out by a process-wide counter, and being
guessable is not a weakness because knowing an id grants nothing — every route
that accepts one still checks the caller's role and the record's visibility.

**Secrets** (the invite token) are the opposite case. Anyone holding one can
join the project, so it must not be derivable from another one. This module
keeps the two apart so that a future record type cannot accidentally be minted
from the readable counter and used as a credential.
"""

from __future__ import annotations

import itertools
import secrets
import threading

# Guarded by a lock rather than trusting itertools.count to be atomic. CPython's
# GIL happens to make `next()` on a count atomic today, but that is an
# implementation detail of one interpreter, and a duplicated id would silently
# corrupt every lookup that resolves a record by it.
_counter = itertools.count(1)
_counter_lock = threading.Lock()


def next_id(prefix: str) -> str:
    """A readable, sequential record id: ``commit-14``, ``push-3``."""
    with _counter_lock:
        return f"{prefix}-{next(_counter)}"


def new_invite_token() -> str:
    """
    An unguessable invite token.

    This used to come off the same counter as the record ids, which made
    ``tok-7`` the token after ``tok-6``: anyone who had ever seen one invite
    link could enumerate every other project's. ``secrets`` draws from the
    OS CSPRNG, so a token carries roughly 128 bits of entropy and reveals
    nothing about the ones issued before or after it.
    """
    return f"tok-{secrets.token_urlsafe(24)}"
