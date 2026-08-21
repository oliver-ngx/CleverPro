"""
Where projects live.

In-memory and process-local, which is exactly what a demo wants and exactly
what a deployment does not. It is a class with four methods rather than a
module-level dict so that swapping it for a database-backed repository is a
change to this file and to the dependency that hands it out — the domain in
`core/` has no idea it exists, and no route reaches around it.
"""

from __future__ import annotations

import threading
import uuid

from core import Project


class ProjectStore:
    def __init__(self) -> None:
        self._projects: dict[str, Project] = {}
        # Guards the mapping itself. Each Project guards its own contents.
        self._lock = threading.Lock()

    def create(self, owner_name: str, name: str | None = None) -> tuple[str, Project]:
        """
        Mint a project under an unguessable id.

        Ids used to be `proj_{len(projects) + 1}`, which collides the moment
        anything is removed and lets anyone enumerate every project on the
        server by counting. A uuid4 does neither.
        """
        project = Project(owner_name=owner_name, name=name)
        project_id = f"proj_{uuid.uuid4().hex}"
        with self._lock:
            self._projects[project_id] = project
        return project_id, project

    def put(self, project_id: str, project: Project) -> None:
        """Install a project under a chosen id — used to seed the demo."""
        with self._lock:
            self._projects[project_id] = project

    def get(self, project_id: str) -> Project | None:
        """
        The project, or None if there is no such project *or* it is deleted.

        Collapsing those two cases is deliberate. A deleted project answering
        403 while a nonexistent one answers 404 would tell an anonymous caller
        which ids had once been real; both are simply absent.
        """
        with self._lock:
            project = self._projects.get(project_id)
        if project is None or project.deleted:
            return None
        return project

    def __len__(self) -> int:
        with self._lock:
            return len(self._projects)
