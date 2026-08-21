"""
The three tiers of authority, and the one comparison every rule is built from.

Kept apart from `project.py` because the HTTP layer needs to parse a role out
of a request body without importing the whole domain, and because the ordering
is the single fact that every permission check in the product reduces to.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Role(Enum):
    CONTRIBUTOR = "contributor"
    MAINTAINER = "maintainer"
    OWNER = "owner"


# Ordered, not merely enumerated: every authority check in the product is
# "is this role at least that one", so the ranking is the rule and the three
# names are just labels on it.
_RANK = {Role.CONTRIBUTOR: 0, Role.MAINTAINER: 1, Role.OWNER: 2}


def at_least(role: Role, floor: Role) -> bool:
    """Whether `role` carries at least the authority of `floor`."""
    return _RANK[role] >= _RANK[floor]


@dataclass
class Member:
    name: str
    role: Role
