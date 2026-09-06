"""
The Interpreter API, assembled.

One route long, and that is the honest state of it. The client runs entirely
against its own seed fixture — which is deliberate rather than temporary, since
the interface is what decides the shape of this API and it should be finished
first. Writing endpoints now would be guessing at the payloads of screens that
are still being drawn.

What goes here when it is real, in the order it should be built:

1. **The store.** An append-only `changes` table with a graph rebuilt from it,
   never mutated in place, so branch switching and time travel come free. Two
   rules belong at the storage layer rather than the UI: `why` is `NOT NULL` and
   rejected when empty, and a change row is immutable — corrections are new
   rows, because the value of the record is that it says what somebody believed
   at the time.
2. **Ingestion** from three sources into one shape: human edits, agent
   transcripts (the highest-value source and the easiest to lose), and VCS
   webhooks.
3. **The translator** — write-time, produces the English half. It never writes
   `why`; that comes from the author or from nowhere.
4. **Runtime observation**, which is what makes `watched` true rather than
   aspirational, and is the part nobody else can copy after the fact.
5. **The noticer**, post-hoc contract and convention checks.
6. **The challenger**, last, because a false alarm teaches people to dismiss the
   sheet and the product dies the day they start doing that by reflex.

`create_app()` rather than a module-level application, for the same reason the
Compiler API does it: a test should be able to build a clean one.
"""

from __future__ import annotations

from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(
        title="Cseudocode Interpreter API",
        version="0.0.0",
        summary="The server half of Interpreter. Not yet in use.",
    )

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
