"""
The domain layer: what the product *is*, with no knowledge of HTTP.

Nothing in this package imports FastAPI, Pydantic or Starlette, and that is
the point of the boundary. The rules about who may deploy, what a push
resolves to, and when a commit can still be retracted are properties of the
product rather than of the transport carrying them — so they are testable
without a client, and would survive the API being replaced.

Import from here rather than from the individual modules: the split into
`roles`, `records`, `branch` and the rest is an arrangement for readers, while
this is the surface meant to stay stable.
"""

from .attachments import Attachment, build_file_tree
from .branch import Branch
from .diffing import compute_diff, diff_stats_for_change
from .errors import PermissionError_, PushInvalidError
from .ids import new_invite_token, next_id
from .project import Project
from .records import ActivityEvent, Comment, Commit, DeployRecord, PushRecord
from .roles import Member, Role, at_least

__all__ = [
    "ActivityEvent",
    "Attachment",
    "Branch",
    "Comment",
    "Commit",
    "DeployRecord",
    "Member",
    "PermissionError_",
    "Project",
    "PushInvalidError",
    "PushRecord",
    "Role",
    "at_least",
    "build_file_tree",
    "compute_diff",
    "diff_stats_for_change",
    "new_invite_token",
    "next_id",
]
