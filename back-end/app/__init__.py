"""
The HTTP layer: routes, request schemas, error translation and the store.

Everything about *how* the product is reached lives here; everything about
what it does lives in `core/`. The dependency points one way — this package
imports `core`, and `core` imports nothing from here — so the rules can be
exercised without a client, and the transport can be replaced without
touching them.
"""
