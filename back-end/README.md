# CleverPro — API

FastAPI service backing the CleverPro client. Commits, versions, releases, and
the rules between them.

New to the project? Read the root [`README.md`](../README.md) first — in
particular the vocabulary table, because *commit*, *merge* and *push* do not
mean here what they mean in git.

## Running it

```bash
cd back-end
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

uvicorn main:app --reload       # http://127.0.0.1:8000
```

Interactive, always-current API docs are at **`/docs`**, generated from the
route signatures — the fastest way to see what exists and to try a call.

The server seeds a demo project on startup — "Orchid Lab", the one the Figma
frames were drawn against — at the id `proj_1`, with three members (`Oliver`,
`Eden Sears`, `Juliana`). The client has no create-project flow, so without that
seed every screen renders a 404 on a cold start. The id is mirrored in
`front-end/src/config.ts`; change one and you must change the other. Set
`CLEVERPRO_SEED=0` to start empty instead. Everything the environment can
override is listed in [`.env.example`](.env.example).

**Everything is in memory.** Restarting the process resets the project to the
seed. There is no database.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest                # 105 tests, ~2s
python -m ruff check .
```

Five files, worth reading in this order:

| File | What it pins down |
| --- | --- |
| `tests/test_invariants.py` | The promises the product makes — pushing does not release, history is not rewritten, a merge is private. **Start here**: it is the shortest description of what this service is for. |
| `tests/test_api.py` | Every endpoint the client calls, over HTTP: status codes, JSON keys, the asymmetric action word. |
| `tests/test_security.py` | One case per defect that has been fixed, so none can come back quietly. Reads as a changelog of what was once wrong. |
| `tests/test_collaboration.py` | The half about people rather than versions: a member's own copy of a branch, joining through the link, and role-change notices. |
| `tests/test_concurrency.py` | Lost updates under concurrent pushes, and two performance cliffs with numbers attached. |

Tests build their own project and their own store (`create_app(seed=False)`),
so they never read the demo fixture and changing `seed.py` cannot break them.

---

## The domain model

Everything in `core/`. Everything else is a view over it.

```
Project ────┬── members:   name -> Member(role)
            ├── branches:  name -> Branch          "main" always exists
            ├── events:    [ActivityEvent]         the shared ledger, append-only
            ├── deploy_history: [DeployRecord]     every release, append-only
            ├── deployed_version / deployed_files  what production serves right now
            ├── _working:  (member, branch) -> [WorkingVersion]   each person's own copy
            ├── _join_requests: name -> JoinRequest    who is waiting at the door
            └── _role_notices:  name -> RoleNotice     the one message per member

Branch  ────┬── commits: [Commit]      proposals aimed at this line
            └── pushes:  [PushRecord]  versions of this line, in order
                           └── files: {path: content}   a FULL snapshot, not a delta
```

Four consequences fall out of that shape, and they explain most of the code:

- **Every version keeps a complete copy of the tree.** That is why any historical
  version can be opened byte for byte, and why rolling back restores real content
  rather than repointing a label. The cost is memory growing with versions ×
  tree size; a real deployment would put content-addressed blobs behind
  `PushRecord.files` and nothing that reads it would change.
- **Production is a separate pointer from Main's head.** They move independently,
  which is Invariant 1 expressed as a data structure rather than as a check.
- **Folders do not exist.** A directory is implied by some file path mentioning
  it, so an empty folder cannot be represented — and does not need to be.
- **A member's files are a history, not a flag.** Merging resolves a commit onto
  that person's own copy and appends the result; undoing appends the state from
  before it. Nothing else can move somebody's files — authoring a commit is a
  proposal to other people, never an edit of your own work — and nobody else can
  read them.

### The ledger is the one source

Every state-changing action appends exactly one `ActivityEvent`. Three different
surfaces then *filter the same list*:

| Surface | Filter |
| --- | --- |
| Activity feed | Events visible to one viewer, with an action word computed per viewer |
| A person's profile | Events authored by one member, with diff stats attached |
| Archive shelf | Not the ledger at all — every push on Main, joined against `deployed_version` |

This is deliberate. The alternative — each surface re-deriving "what happened"
from raw `Commit` and `PushRecord` objects — gives you three answers that can
disagree.

### The asymmetric action word

`activity_feed_for_viewer(viewer)` is the trickiest read in the codebase and the
one most worth understanding. **The same commit produces a different row for
different people:**

- push / undo → always `"View"`
- commit, viewer is the author → `"View"`
- commit, viewer was addressed but has not merged → `"Merge"`
- commit, viewer has merged it → `"Undo"` (meaning un-merge)
- commit not addressed to this viewer, or retracted → the row is **omitted**

That is why the viewer is in the URL path (`/activity/{viewer}`) and not implied.

### Attachments: what a commit or push carries

Three kinds, and the difference is *which of them carry bytes*:

| Kind | Field | Carries content? |
| --- | --- | --- |
| **Folder** | `folder_ref` + `tree_snapshot` | Yes — read off the user's machine. The only way new files enter the project. Replaces the branch tree wholesale. |
| **Version** | `version_ref` | Yes, but the *server* assembles it: the client names a label, the backend resolves it to that version's stored files. |
| **Loose files** | `loose_files` | No, and cannot. A path from a JSON tree has no bytes attached, so the backend carries each named path's existing content forward — and the diff is zero lines. |

**The Push-validity rule:** a push must resolve to *one unambiguous next state*,
so mixing a whole tree with loose files is refused with a **422**. A commit may
mix freely — a proposal is read by a person, who can tell what it means. The
composer greys out Push before it gets that far; the 422 is the guarantee, the
grey icon is the courtesy.

---

## Layout

```
back-end/
  main.py           # entry point: `uvicorn main:app`, re-exports app.main:app
  seed.py           # the Orchid Lab demo fixture
  core/             # the domain — no HTTP anywhere in it
    project.py      #   the rules, and the invariants they enforce  ← the big one
    branch.py       #   one line of development; version labels
    records.py      #   Commit, PushRecord, DeployRecord, ActivityEvent
    attachments.py  #   what a commit or push carries; flat paths -> nested tree
    diffing.py      #   the "+45 -0" line counts
    roles.py        #   Contributor < Maintainer < Owner
    ids.py          #   readable record ids, and unguessable secrets
    errors.py       #   the two failures the domain raises on purpose
  app/              # the HTTP layer
    main.py         #   create_app(): middleware, error handlers, routers
    config.py       #   everything the environment can override
    schemas.py      #   request bodies, and the size ceilings on them
    dependencies.py #   store and project injection; attachment assembly
    errors.py       #   domain exception -> status code, registered once
    store.py        #   where projects live (in-memory, swappable)
    routers/        #   one module per surface of the product
  tests/
```

`app` imports `core`; `core` imports nothing from `app`. Routers stay thin on
purpose — parse, call one domain method, shape the response. **If you find
yourself writing a rule in a router, it belongs in `core/project.py`.**

### Errors become status codes in exactly one place

`app/errors.py` registers the mapping on the application, so it is exhaustive by
construction — a domain exception raised anywhere, including inside a
dependency, lands there. (It used to be a decorator applied route by route,
which meant a route somebody forgot to decorate answered a refused permission
with a 500.)

| Raised in `core` | Becomes | Means |
| --- | --- | --- |
| `PermissionError_` | **403** | The actor's role does not grant this |
| `PushInvalidError` | **422** | The attachment does not resolve unambiguously |
| `KeyError` | **404** | No such branch, commit, push or version |
| `ValueError` | **400** | The request is coherent but the state forbids it |

The message travels to the browser verbatim, because the API refuses things for
real reasons and explains them better than the client could invent.

---

## Endpoints

`{p}` is `/projects/{project_id}`. Every POST body carries `actor`.

**Project**
| | |
| --- | --- |
| `GET {p}/overview` | The Main screen's top card, in one call |
| `POST {p}/rename` | Rename, and re-provision the default domain |
| `POST /projects` | Create a project (unused by the client) |
| `GET {p}/export?actor=` | The roster, that actor's own feed, and the live version. Maintainer only — it is the most revealing read here |
| `POST /import` | Inspect an uploaded JSON file and report its top-level keys |

**Team**
| | |
| --- | --- |
| `GET {p}/team` | Roster with roles |
| `GET {p}/team/{member}` | One profile: role, and the branches they are on |
| `GET {p}/team/{member}/activity` | One person's profile list, with diff stats |
| `GET {p}/team/{member}/role-notice?actor=` | How a member learns their authority changed. Them and the Owner only |
| `GET {p}/team/{member}/working/{b}?actor=` | Their own copy of a branch, as a tree. Readable by them alone |
| `GET {p}/team/{member}/working/{b}/history?actor=` | Every state they have been in on it |
| `POST {p}/team/invite` | Add a member |
| `POST {p}/team/{member}/remove` · `/grant-maintainer` · `/revoke-maintainer` | Role administration |

**Getting in** — the link is an access mechanism and never an authority.
| | |
| --- | --- |
| `POST {p}/access/join` | Ask to join, holding the token. The one endpoint with no `actor` |
| `GET {p}/access/requests?actor=` | Who is waiting. Owner only |
| `POST {p}/access/requests/approve` · `/reject` | Owner's answer. Rejection is silent |
| `POST {p}/access/leave` | Show yourself out. The Owner cannot |

**Commits and versions**
| | |
| --- | --- |
| `POST {p}/commit` | Make a proposal, routed to `view_by` |
| `POST {p}/push` | Promote an attachment onto a branch |
| `POST {p}/push_commit/{id}` | Promote one commit's attachment directly |
| `POST {p}/merge/{id}` · `/unmerge/{id}` | Adopt a proposal, or reverse your own adoption |
| `POST {p}/retract/{id}` | Withdraw your own pending proposal |
| `GET {p}/commits/{id}` | One proposal in full |
| `GET`/`POST {p}/commits/{id}/comments` · `POST .../flag` | The File Detail toolbar |
| `GET {p}/activity/{viewer}` | The viewer-specific feed |

**Release**
| | |
| --- | --- |
| `POST {p}/deploy` | Release a Main version. Defaults to Main's head |
| `POST {p}/undo` | Make any published version live, now |
| `GET {p}/archive` | The shelf: every Main version, `Applied` on one |
| `GET {p}/archive/deploy-log` | The underlying release audit trail |

**Branches and files**
| | |
| --- | --- |
| `GET`/`POST {p}/branches` | List, and create (from Main's head, or `from_version`) |
| `GET {p}/branches/{b}` | One line, and where it stands |
| `GET {p}/branches/{b}/versions` | Every version of a line, newest first |
| `GET {p}/branches/{b}/files` | Nested file tree of the branch's current version |
| `GET {p}/branches/{b}/versions/{v}/files` | …of any historical version |
| `GET {p}/branches/{b}/versions/{v}/files/content?path=` | One file's raw content |
| `GET {p}/production/files` | What is live — not necessarily Main's head |

**Settings** — `GET {p}/settings`, and one POST per row under `{p}/settings/`:
`link`, `regenerate-invite`, `default-invite-role`, `branches`,
`branch-creation-authority`, `visibility`, `custom-domain`, `transfer-owner`,
`delete`. Each write returns the whole settings object, so the client re-renders
from what the server now holds rather than from what it assumed.

### Adding an endpoint

1. Put the rule in `core/project.py` as a method. Raise the domain exceptions —
   never an `HTTPException`.
2. Add a request model in `app/schemas.py`, inheriting `ActorRequest` if it
   writes. Cap anything unbounded.
3. Add the route to the matching module in `app/routers/`. Parse, call, shape.
4. Test the rule in `test_invariants.py` and the wire shape in `test_api.py`.
5. Add it to `front-end/src/api/client.ts` and its DTO to `types.ts`.

---

## Security posture

Read this before deploying it anywhere.

**There is no authentication.** Every mutating request names its own actor in
the body, and the service believes it. Anyone who can reach the API can claim to
be the Owner by typing their name. This is a demo affordance, and it is the one
thing that must change before this is exposed to anything.

The seam is deliberate and narrow: every mutating body inherits from
`ActorRequest` in `app/schemas.py`, so `actor` becomes a dependency resolved from
a session in one edit rather than in thirty route signatures. Role checks are
already real and enforced server-side — the client hides controls it knows will
be refused, but that is a courtesy and never the lock.

What *is* handled — each with a test in `tests/test_security.py`:

- **Invite tokens** come from `secrets`, not a counter. They used to be
  sequential (`tok-6`, `tok-7`), which made one leaked link enough to derive
  every other project's.
- **Project ids** are uuid4, not `proj_{count + 1}` — no enumeration, and no
  collision after a deletion.
- **Deleted projects stop serving.** The flag used to be set and never read.
  A deleted project 404s rather than 403s, so an anonymous caller cannot learn
  which ids were once real.
- **Attachments are bounded** per file, per tree and in total, matching the
  limits the browser applies in `front-end/src/lib/picker.ts`. Content travels
  inline and every version is kept in memory, so an unbounded push was an
  unbounded allocation on an open endpoint.
- **Uploads are bounded and defensively parsed.** `POST /import` used to read an
  unlimited body and to raise `AttributeError` on a part with no filename.
- **Custom domains and deploy subdomains are validated** as bare hostnames. The
  value is rendered into an `href` by the client.
- **A role change cannot be smuggled through an invite.** Inviting an existing
  member is refused rather than overwriting their entry.
- **CORS** is restricted to configured origins with credentials off — this API
  has no cookies, so there is no ambient authority to attach.
- **Export names its reader.** It used to hand the whole roster and one member's
  feed to anyone who could reach the URL. It now takes an `actor`, requires
  Maintainer, and returns *that actor's own* feed — a viewer-specific feed
  belongs to the person it was computed for, so exporting somebody else's would
  hand out a view of the project that is not the exporter's to see. The rule
  lives in `Project.export_snapshot`, with the read it guards, rather than in
  the route.

Known gaps, in the order they matter: no authentication; no rate limiting; and
the store is a dictionary, so everything is lost when the process exits.

### One performance trap, documented so it is not "fixed" again

`core/diffing.py` leaves `SequenceMatcher`'s `autojunk` at its default. Turning
it off looks like an accuracy improvement and was tried: on a 52,000-line file of
near-identical lines — well inside the per-file size cap — the diff went from
**0.01s to over two minutes**, all of it spent holding the project lock. There is
a regression test. If it ever starts timing out, that is what happened.
