# configs-back-end

The server half of Configs. **Nothing calls it yet.**

It exists so that the first real Configs endpoint has an obvious place to go,
and so that nothing about Configs ends up in the Compiler API by accident. Today
it is one health route.

```
uvicorn main:app --reload --port 8100
```

Port 8100 rather than 8000 so it can run beside `back-end` without a fight. The
client does not proxy to it and does not know it exists — see
[configs-front-end/README.md](../configs-front-end/README.md).

## Why it is separate from `back-end`

They answer different questions. `back-end` is Compiler: commits, versions,
releases, and the history of a project. Configs is a bridge to a source file —
resolve a location, mutate one property, print it back — and it holds no
project history at all.

Keeping them apart from the first line costs nothing now. Merging them later,
once each has grown routes, would mean untangling two domains that never had
anything to do with each other.

## Shape

The same split as `back-end`, and for the same reason:

| | |
| --- | --- |
| `main.py` | Entry point. Assembles nothing; points at `app/main.py`. |
| `app/` | The HTTP layer. Imports `core`. |
| `core/` | The domain. Imports nothing from `app`. |

Both packages are close to empty and say so in their docstrings.

## What is deliberately missing

- **No deploy.** There is no `render.yaml` and no host. A service that answers
  one health check does not need one, and adding it would create something to
  keep alive for no benefit.
- **No tests.** `pyproject.toml` points `pytest` at `tests/`, which does not
  exist yet. The first route brings the first test with it.
- **No routes.** Configs does not need a server to draw a blank window. Guessing
  at endpoints for undesigned behaviour is how an API ends up with routes nobody
  can explain.
