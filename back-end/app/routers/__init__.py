"""
One module per surface of the product.

The split follows the screens rather than the HTTP verbs: `branches.py` backs
the Main surface's switcher and file tree, `commits.py` the Activity feed and
the composer, `deploy.py` the Archive shelf. A route added for a screen has an
obvious home, and reading one file tells you everything one screen can do.
"""

from fastapi import APIRouter

from . import branches, commits, deploy, projects, settings, team

# Registered in one place so `main.py` states the shape of the API in six
# lines rather than in five hundred.
routers: list[APIRouter] = [
    projects.router,
    team.router,
    commits.router,
    deploy.router,
    branches.router,
    settings.router,
]

__all__ = ["routers"]
