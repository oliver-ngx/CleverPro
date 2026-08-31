"""
The HTTP layer for Configs: routes, request schemas and error translation.

The same split as `back-end/app` — everything about *how* Configs is reached
lives here, everything about what it does lives in `core/`, and the dependency
only ever points from this package to that one.

Both are close to empty. They exist so that the first real route has an obvious
place to go, and so that nothing about Configs ends up in the Compiler API by
default.
"""
