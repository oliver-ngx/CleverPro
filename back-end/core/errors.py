"""
The two failures the domain raises on purpose.

They are declared in their own module so that both the domain (which raises
them) and the HTTP layer (which translates them into status codes) can import
them without either one importing the other. `app/errors.py` is the only place
that knows what status code each becomes.
"""


class PermissionError_(Exception):
    """
    Raised when a member attempts an action their role does not grant.

    Named with a trailing underscore to avoid shadowing the builtin
    ``PermissionError``, which means something else entirely (a filesystem
    refusal) and would be caught by handlers that never meant to catch this.
    """


class PushInvalidError(Exception):
    """
    Raised when a Push's attachment bundle does not resolve unambiguously.

    A Commit may carry any mixture its author meant, because a person reads it.
    A Push has to name exactly one next state of the branch, so a bundle that
    mixes a whole tree with individual files is refused here rather than
    resolved by a guess about which half wins.
    """
