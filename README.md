# CleverPro

A version-control surface for a single project. People propose changes to each
other, promote changes into numbered versions, release a version to production,
and roll production back — with the history of all four kept readable instead of
collapsed into "latest".

A React client and a FastAPI service. The client is transcribed from a Figma
prototype; the service enforces the rules the client draws.

Two documents sit beside this one and answer different questions.
[FEATURES.md](FEATURES.md) is the status — every feature, with separate columns
for the API and the UI, because the two are not at the same place.
[NEXT-STEPS.md](NEXT-STEPS.md) is what to do about it, in order, with the
decisions that need making first.

---

## Read this part first: the words do not mean what git means

This is the single biggest source of confusion for anyone arriving from git.
The vocabulary overlaps and the meanings do not.

| Word | Here it means | It does **not** mean |
| --- | --- | --- |
| **Commit** | A *proposal*, addressed to specific teammates. Changes nothing. | A recorded change on a branch |
| **Merge** | One recipient privately adopts a proposal into their own working copy. Nobody else's view changes. | Combining branches |
| **Push** | Promote an attachment onto a branch as a new numbered version (`V1`, `V2`…). This is the operation that actually changes a branch. | Uploading commits to a remote |
| **Deploy** | Release one Main version to production. Explicit, and Maintainer-only. | A CI side effect of merging |
| **Retract** | The author withdraws their own *pending* proposal. Refused once anyone merged it or it was pushed. | Revert / reset |

Two more traps worth knowing before you read any code:

- **"Undo" is one word for two unrelated actions.** On an **Activity** row it
  un-merges — you reverse *your own* adoption of a proposal. On an **Archive**
  row it re-releases — it makes that version live in production, immediately.
  Same label, different screen, different endpoint.
- **A commit and a push are not sequential steps.** They are two independent
  things you can do with an attachment. You can push without ever committing.

---

## The five invariants

The product *is* these rules. Everything else is presentation, and every one of
them has a test in `back-end/tests/test_invariants.py`.

1. **Advancing Main never changes what production serves.** A push puts a
   version on the shelf; a deploy is what makes one live. A newer version
   sitting above the applied one is the normal state of a project mid-flight,
   not a bug.
2. **A release is always explicit and authorized.** Nothing deploys as a side
   effect of anything else, and it takes Maintainer or above.
3. **A commit is a proposal.** It changes neither Main nor production, and
   merging one is private — which is exactly why the same row reads "Merge" to a
   recipient who has not taken it and "Undo" to one who has.
4. **History is append-only.** Retract sets a flag, rolling back appends a *new*
   release record pointing at an *old* version, and no record is ever deleted.
5. **A branch preview follows its own head automatically.** Main's preview is
   production, which does not.

---

## The screens

Five, reached from the rail on the left. The top four are pages; the people
below them each open a pane.

| Screen | What it is | Source |
| --- | --- | --- |
| **Main** | The project card — preview, name + current version, deploy URL, branch switcher — over the file tree of the selected branch's current version. Creating a branch opens a sheet here. | [pages/Main.tsx](front-end/src/pages/Main.tsx) |
| **Activity** | A table of what has happened, **rendered per viewer**. The Action column is the control: it reads Merge, Undo or View depending on who is looking. | [pages/Activity.tsx](front-end/src/pages/Activity.tsx) |
| **Archive** | The shelf: every version ever pushed to Main, newest first. Exactly one row reads "Applied" — what production serves. Every other row's "Undo" makes that version live. | [pages/Archive.tsx](front-end/src/pages/Archive.tsx) |
| **Settings** | Grouped rows over one destructive card. **Each role sees a different page**, not the same page greyed out. | [pages/Settings.tsx](front-end/src/pages/Settings.tsx) |
| **A person's pane** | That member's history. Opening a row splits the pane to show the file, its comment thread and a toolbar. Your *own* pane also has the Action composer, which is where commits and pushes are made. | [pages/Team.tsx](front-end/src/pages/Team.tsx) |
| **A person's settings** | Pressing their face and name in the header opens it: their role, how it got that way, the branches they are on, and removal. There is no roster screen by design — authority moves with the person, so to change what somebody can do you go to them. | [pages/MemberSettings.tsx](front-end/src/pages/MemberSettings.tsx) |

One more screen is not reached from the rail at all: `/join/<token>` opens
[pages/Join.tsx](front-end/src/pages/Join.tsx), which is what somebody following
the project's invite link sees. They are either admitted outright or queued for
the Owner, according to the project's own setting.

---

## Running it

Two processes. Start the API first, or every screen renders its error state.

```bash
# terminal 1 — the API
cd back-end
python -m venv .venv
.venv/Scripts/activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload         # http://127.0.0.1:8000 — API docs at /docs

# terminal 2 — the client
cd front-end
npm install
npm run dev                       # http://localhost:5173
```

The client calls `/api`, which Vite proxies to the API. The browser only ever
sees one origin, so no request is cross-origin and CORS never applies.

**There is no login.** The app starts as
[`DEFAULT_USER`](front-end/src/config.ts) and can act as any member from the
switch under "More" in the rail — the API has no sessions, so "be somebody else"
is a name in a request body ([`session.ts`](front-end/src/session.ts)). That is
worth using: the Activity feed's action word, which pane has the Action
composer, and how much of Settings renders are all computed per viewer.

The open project is a constant too, `PROJECT_ID`. Both it and the starting user
must match the demo data the API seeds on startup, or every screen 404s.

> If animations do not play, that is your OS "reduce motion" setting. Every
> transition in the app honours it deliberately.

### Checks

```bash
cd back-end  && python -m pytest && python -m ruff check .   # 105 tests
cd front-end && npm test && npm run lint && npm run build    # 42 tests
```

---

## How it fits together

```
browser
  │
  │  fetch /api/...
  ▼
Vite dev server ──proxy──▶ FastAPI  :8000
                              │
                          app/  ← HTTP: routers, request schemas, error mapping
                              │
                          core/ ← the domain: the rules, no web framework at all
```

Two boundaries carry most of the weight, and both point one way.

**`app` imports `core`; `core` imports nothing from `app`.** Nothing in the
domain imports FastAPI, Pydantic or Starlette. Who may deploy, and what a push
resolves to, are properties of the product rather than of the transport — so
they are testable without a client and would survive the API being replaced.

**`api/adapters.ts` is the only file that speaks both vocabularies.** The API
describes a system: nested trees, a name and a version label kept apart, epoch
floats. The components describe a drawing: a flat list, `"Orchid Lab V3"`,
`"Aug 10"`. Neither is wrong, and the seam between them lives in one file so a
rename on the server cannot ripple into twenty components.

### One action, traced end to end

Pressing **Merge** on an Activity row:

1. [`Activity.tsx`](front-end/src/pages/Activity.tsx) calls `api.merge(commitId)`.
2. [`api/client.ts`](front-end/src/api/client.ts) POSTs to
   `/api/projects/proj_1/merge/{id}`, injecting whoever `session.ts` says the
   app is acting as — the API has no session, so identity travels in each body.
3. FastAPI routes it to `app/routers/commits.py`, which calls
   `project.merge(...)` in `core/project.py`.
4. The domain checks the actor was a recipient, adds them to the commit's
   `merged_by`, and appends one line to the shared activity ledger.
5. On success the client bumps a counter in
   [`api/revision.ts`](front-end/src/api/revision.ts). Every live read is
   subscribed to it, so all of them refetch.
6. The same row now returns `action: "Undo"` — for this viewer only.

---

## Roles

| | Contributor | Maintainer | Owner |
| --- | :-: | :-: | :-: |
| Commit, push, merge, comment, flag | ● | ● | ● |
| Deploy, roll back, invite, remove a contributor, export | | ● | ● |
| Production visibility, custom domain, invite link | | ● | ● |
| Grant Maintainer, transfer ownership, delete project | | | ● |
| Create a branch | by setting | ● | ● |

Every rule is enforced server-side. The client mirrors them in
[`lib/authority.ts`](front-end/src/lib/authority.ts) so it does not draw a
control that would be refused — a courtesy, never the lock. **If a rule appears
there and nowhere in `core/project.py`, that is a backend bug, not a frontend
feature.**

---

## Repo map

```
back-end/            FastAPI service — see back-end/README.md
  main.py            entry point: `uvicorn main:app`
  seed.py            the "Orchid Lab" demo fixture, built at startup
  core/              the domain: project rules, branches, records, diffing, roles
  app/               HTTP: routers, schemas, dependencies, error mapping, store
  tests/             invariants · API surface · fixed defects · concurrency

front-end/           React 19 + Vite + Tailwind v4 — see front-end/README.md
  src/config.ts      where the app starts: the project id and the first user
  src/session.ts     who it is acting as now — the stand-in for a session
  src/Entry.tsx      the whole of routing: is this an invite link, or the app?
  src/api/           transport · endpoint list · wire types · wire→screen adapters
  src/pages/         the six screens, plus the join card
  src/components/    layout · per-screen · the shared ui kit
  src/hooks/         reads, writes, overlay presence and dismissal
  src/lib/           folder picking, permission mirrors, formatters, motion timings
  src/data/          row-shape types (the rows themselves come from the API)
  design-system/     generated from the Figma prototype — present, but not in git
```

`front-end/design-system/` is listed in `.gitignore`, so it never appears in a
diff. **Its absence from version control says nothing about its authority** — it
is the source of truth for the UI and must be consulted before any visual change.

---

## Where to make a change

| You want to… | Go to |
| --- | --- |
| Change a rule about who may do what | `back-end/core/project.py`, then mirror in `front-end/src/lib/authority.ts` |
| Add or change an endpoint | `back-end/app/routers/`, then `front-end/src/api/client.ts` and `types.ts` |
| Change the shape of data a screen receives | `front-end/src/api/adapters.ts` — and nowhere else |
| Change what a screen looks like | The design system first, then `front-end/src/components/` |
| Change the demo data every screen opens onto | `back-end/seed.py` |
| Change colours, radii, motion | `front-end/src/index.css` (`cp-*` tokens) |

---

## Before deploying this anywhere

**There is no authentication.** Every mutating request names its own actor in
the body and the service believes it, so anyone who can reach the API can act as
the Owner by typing their name. That is a demo affordance and the first thing
that must change.

The seam is deliberately narrow — every mutating request body inherits from
`ActorRequest` in `back-end/app/schemas.py`, so `actor` becomes a session-derived
dependency in one edit rather than in thirty route signatures.
[back-end/README.md](back-end/README.md) covers what is already handled and what
still is not.
