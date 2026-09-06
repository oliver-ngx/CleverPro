# inlab — back end

The server half of anything in `inlab-front-end`.

Empty, and likely to stay empty for a while. Interpreter's client runs entirely
against its own seed fixture, so an experimental screen needs no experimental
endpoint — it needs a shape in the fixture. This exists so that when one of these
screens does need a server, the answer to "where does it go?" is already decided
and it does not land in `app/` beside work that is settled.
