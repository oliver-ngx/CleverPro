# The shell and the project — how Home and Compiler fit together

There are now **two applications in one window**, and this document is the
boundary between them. Read it before working on either, because most of the
ways to break one of them are edits made confidently inside the other.

- [README.md](README.md) is the Compiler *product* — the vocabulary, the five
  invariants, the screens.
- [front-end/README.md](front-end/README.md) is how the client is built.
- **This file is the seam**: what belongs to the shell, what belongs to the
  project, and the three lines of code that join them.

---

## The two layers

```
Entry.tsx                     /join/<token> ? Join : Shell
   │
   └── Shell.tsx  ─────────────────────────── THE CSEUDOCODE SHELL
         │                                    above any project
         ├── ProductRail        Cseudocode · IDE · Configs · Compiler
         │                                  · Library · Trash · Settings
         ├── Home               the greeting and "Start One"
         └── CompilerProjects   the project list
                   │
                   │  opening a project replaces everything above
                   ▼
              App.tsx  ───────────────────────  THE COMPILER
                                                inside one project
                        Main · Activity · Archive · Settings · panes
```

The shell is **above** a project. Compiler is **inside** one. They never render
at the same time: the moment a project opens, `Shell` returns `<App/>` and
nothing of the shell is on screen.

| | The shell | Compiler |
| --- | --- | --- |
| Scope | All of Cseudocode | One project |
| Rail | `ProductRail`, 210px, six modules | `Sidebar`, 299px, four pages + team |
| Rail title | `Cseudocode` | the project's name |
| Data | A fixture, no network | The API, on every screen |
| Root | `Shell.tsx` | `App.tsx` |
| Backend needed | **No** | **Yes** |

---

## The seam — all of it

Three things join the layers, and there are no others. Keep it that way.

**1. `Entry` routes to `Shell`, not to `App`.**

```tsx
if (token === undefined) return <Shell />
```

**2. `Shell` renders `App` bare when a project is open.**

```tsx
if (opened !== undefined) return <App onExit={goHome} />
```

Bare, and not inside `AppWindow` — `App` draws its own window, rail and header
exactly as it did when it was the root. This is what "do not rebuild the
existing Compiler" means in code.

**3. `onExit` is the only prop that crosses.** It is optional on both `App` and
`Sidebar`, so removing the shell entirely would leave Compiler working, with a
rail title that is plain text again.

### The two rules

> **The shell never reaches inside a project.** It does not know what a branch
> is, does not import from `api/`, and holds no project state beyond which row
> was pressed.
>
> **Compiler never reaches outside itself.** It does not know a shell exists.
> `onExit` is a callback it invokes, not a place it navigates to.

A change that needs a fourth line across this seam is a design change. Raise it
rather than widening the seam quietly.

---

## Which files are whose

Edit freely within a layer. Crossing layers is where to slow down.

### The shell — added for Home and the project list

| File | What it is |
| --- | --- |
| [`src/Shell.tsx`](front-end/src/Shell.tsx) | The root. Holds two pieces of state: which module is open, and which project. |
| [`src/pages/Home.tsx`](front-end/src/pages/Home.tsx) | The greeting and `Start One`. |
| [`src/pages/CompilerProjects.tsx`](front-end/src/pages/CompilerProjects.tsx) | The project list, and the search over it. |
| [`src/components/layout/ProductRail.tsx`](front-end/src/components/layout/ProductRail.tsx) | The six modules in two groups, plus the wordmark. |
| [`src/components/compiler/`](front-end/src/components/compiler/) | `CompilerToolbar`, `ProjectRow`. |
| [`src/data/products.ts`](front-end/src/data/products.ts) | The rail's six modules. |
| [`src/data/projects.ts`](front-end/src/data/projects.ts) | The project fixture. |

> ⚠️ **`components/compiler/` is a trap.** It holds the *shell's* Compiler-module
> components — a toolbar and a list row. Every other component in the repo is
> also Compiler, because Compiler is the whole app underneath. If this confuses
> somebody once, rename the folder to `projects/`; nothing outside it would
> change.

### Compiler — untouched by this work, with two exceptions

Everything under `pages/` (except the two above), `components/main/`,
`components/team/`, `components/settings/`, `api/`, `hooks/`, `lib/` is exactly
as it was. The two exceptions are both additive:

| File | The change |
| --- | --- |
| [`src/App.tsx`](front-end/src/App.tsx) | Gained an optional `onExit` prop, passed to `Sidebar`. Nothing else. |
| [`src/components/layout/Sidebar.tsx`](front-end/src/components/layout/Sidebar.tsx) | The title renders as a button when `onExit` is given, plain text otherwise. |

### Shared by both

| File | Note |
| --- | --- |
| [`src/Entry.tsx`](front-end/src/Entry.tsx) | Routing. Still one question: join link, or the app. |
| [`src/components/ui/Icon.tsx`](front-end/src/components/ui/Icon.tsx) | One closed union for both layers. The shell added 9 names. |
| [`src/index.css`](front-end/src/index.css) | One token set for both. The shell added `cs-action`, `cs-text-search`, `cs-text-branchline`, `cs-monogram-lab`, `--font-rounded`. |
| [`src/components/layout/SidebarNavItem.tsx`](front-end/src/components/layout/SidebarNavItem.tsx) | **Used by both rails, unchanged.** Editing it changes both. |

---

## Two rails, and they are not the same rail

The single most likely confusion, and the reason `data/products.ts` and
`data/navigation.ts` are two files rather than one list with a mode flag.

| | `ProductRail` | `Sidebar` |
| --- | --- | --- |
| Selects | a **module** of Cseudocode | a **screen** inside one project |
| Items | `data/products.ts` | `data/navigation.ts` |
| Width | 210px | 299px |
| Title | `Cseudocode` → Home | the project's name → leaves the project |
| Below `md` | **nothing** — see the gap below | `MobileNav` |

They share `SidebarNavItem` because the row is genuinely one component. They
share nothing else, and they never appear together.

**Going up a level is the top-left of whichever rail is on screen.** Inside a
project that is its name; in the shell it is the wordmark. Both land on Home.

---

## What is real and what is drawn

The shell is mostly a working screen over deliberately inert controls. Nothing
below is unfinished by accident — each is a decision, and each is one small
change once its behaviour is specified.

| Control | State | Why |
| --- | --- | --- |
| Search | **Works.** Filters on name and branch. | Client-side, needs nothing. |
| Project row → Compiler | **Works** for Orchid Lab. | It is the one project the API seeds. |
| `Cseudocode` / project name | **Works.** Both go Home. | |
| Open Folder · New Folder · Sync from GitHub · filter | Drawn, pressable, inert | Three unspecified features. Guessing puts undesigned behaviour on screen. |
| `Start One` | Drawn, inert | The frame does not say where it leads. |
| IDE · Configs · Library · Trash · Settings | Pressable, no-op | Not built. Drawn at full strength in the design, so not greyed out. |
| Machine Learning · HelloWorld rows | Drawn, do not open | No project behind them. Listed, not invented. |

**The empty state is not a second screen.** The "no projects" frame is the same
frame with the rows removed, so it is `CompilerProjects` with an empty list.
Searching down to nothing lands in the same place, which is correct — both are
"the list you asked for is empty". To see it: empty `PROJECTS`, or search for
something that matches nothing.

---

## Known gaps

**The shell has no mobile navigation.** `ProductRail` is `hidden md:block` and
`Shell` renders no `MobileNav` counterpart. Below `md` you land on Home with no
way to reach Compiler, and no way back from it. Compiler itself is fine — it has
`MobileNav`. The design draws no phone frame for the shell, so this is waiting
on a decision, not on code.

**The project list is a fixture, and cannot not be.** `ProjectStore` has
`create`, `put`, `get` and a length — no `list()` — and its ids are uuid4
*specifically* so projects cannot be enumerated (see the comment on `create()`).
On an API with no authentication, a route returning every project would undo
that. So the real endpoint is not `GET /projects` but **"projects I can see"**,
which cannot exist before identity does. `data/projects.ts` is what that read
replaces, and its shape is already the shape a real row would have —
`projectId` is set only where the API genuinely holds the project.

**Opening a project loses your place in the shell.** `Shell` keeps `module` and
`opened`, so leaving returns you Home rather than to the list you came from.
That is what was asked for; noted here because it will read as a bug to someone
who did not ask for it.

---

## Where to make a change

| You want to… | Go to |
| --- | --- |
| Change the greeting or `Start One` | `pages/Home.tsx` |
| Add, remove or re-order a project row | `data/projects.ts` |
| Make a project row open | give it a `projectId` in `data/projects.ts` |
| Change the toolbar over the list | `components/compiler/CompilerToolbar.tsx` |
| Change how a project row looks | `components/compiler/ProjectRow.tsx` |
| Add a module to the shell's rail | `data/products.ts` |
| Make a module actually open something | `Shell.tsx` — the `onSelect` guard |
| Change anything **inside** a project | Compiler's own docs. Do not start here. |
| Add a glyph | `components/ui/Icon.tsx` — one union for both layers |
| Add a colour or radius | `src/index.css`, `cs-*` tokens |

---

## Design sources

Figma file `En35pb5T6YT7m8HBzTxERa`:

| Frame | Node | Built as |
| --- | --- | --- |
| Cseudocode Home Page | `230:56` | `pages/Home.tsx` |
| Compiler with projects | `230:144` | `pages/CompilerProjects.tsx` |
| Compiler, no projects | `230:141` | the same file, empty list |

Metrics follow the same rule as the rest of the client: **source frames are
2204px wide and the app renders at 1400, so values are multiplied by ≈0.635.**
That is how the shell's rail is 210 from 330, and the project rows' document
icon 53×70 from 83×111.

Two places the transcription deliberately departs from the frame, both recorded
in the component that does it:

- **The monogram is centred**, not offset. The source positions each initial by
  hand, which lands a single letter in the middle and pushes a two-letter one
  off the page edge.
- **Monogram size follows letter count** — 30px for one, 27px for two. The source
  draws the same letter `O` at two different sizes, and this is the only reading
  that makes its three values consistent.

The project row's document is the **existing** `file-blank.png`. The asset the
frame exports for it is byte-identical (same md5), so it is reused rather than
shipped twice.
