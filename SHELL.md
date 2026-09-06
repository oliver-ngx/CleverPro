# The shell and the modules — how Home, Compiler and Configs fit together

Cseudocode is **one window with several modules in it**, and this document is
the boundary between the window and the modules. Read it before working on any
of them, because most of the ways to break one are edits made confidently
inside another.

- [README.md](README.md) is the Compiler *product* — the vocabulary, the five
  invariants, the screens.
- [front-end/README.md](front-end/README.md) is how the client is built.
- [configs-front-end/README.md](configs-front-end/README.md) is Configs, which
  lives in its own folder until it is real.
- **This file is the seam**: what belongs to the shell, what belongs to a
  module, and the few lines of code that join them.

---

## The layers

```
Entry.tsx                     /join/<token> ? Join : Shell
   │
   └── Shell.tsx  ─────────────────────────── THE CSEUDOCODE SHELL
         │                                    above any project
         ├── ProductRail        Cseudocode · Interpreter · Configs · Compiler
         │                                  · Library · Trash · Settings
         ├── Home               the greeting and "Start One"
         ├── CompilerProjects   the projects Compiler can work on
         └── ConfigsProjects    the projects Configs can open
                   │           (lists only — no row opens yet)
                   │
                   │  opening a project replaces everything above
                   ▼
                App.tsx  ──────────────────  THE COMPILER
                                             inside one project

   Main · Activity · Archive · Settings · panes
```

The shell is **above** a project. A module is **inside** one. They never render
at the same time: the moment a project opens, `Shell` returns that module's root
and nothing of the shell is on screen.

| | The shell | Compiler | Configs |
| --- | --- | --- | --- |
| Scope | All of Cseudocode | One project | A list, above any project |
| Rail | `ProductRail`, 210px, six modules | `Sidebar`, 299px, four pages + team | `ProductRail` — it is a shell screen |
| Title, top-left | `Cseudocode` | the project's name | `Cseudocode` |
| Data | A fixture, no network | The API, on every screen | A fixture, no network |
| Root | `Shell.tsx` | `App.tsx` | none — it has no inside yet |
| Backend needed | **No** | **Yes** | **No** |
| Source | `front-end/src` | `front-end/src` | `configs-front-end/src` |

---

## The seam — all of it

Three things join the layers, and there are no others. Keep it that way.

**1. `Entry` routes to `Shell`, not to a module.**

```tsx
if (token === undefined) return <Shell />
```

**2. `Shell` renders the open project's module bare.**

```tsx
if (opened !== undefined) return <App onExit={goHome} />
```

Bare, and not inside `AppWindow` — each module draws its own window, and `App`
draws its own rail and header too, exactly as it did when it was the root. This
is what "do not rebuild the existing Compiler" means in code.

**3. `onExit` is the only prop that crosses.** It is optional on `App` and
`Sidebar`, so removing the shell entirely would leave Compiler working with a
rail title that is plain text again.

### What `opened` holds, and why it is not just the project

`opened` carries the module alongside the row:

```tsx
type Opened = { module: 'Compiler'; entry: ProjectEntry }
```

One member today, and a union of one on purpose. Configs was briefly the second
before its blank window was removed, and the shape is what it left behind:
**the project does not decide what opens — the list you pressed it on does.**
Both modules list a project called Orchid Lab and they mean different things by
it. Deriving the module from the project would make that impossible to express,
and would quietly make one module's fixture authoritative over the other's, so
the next module goes in here rather than into a field on a row.

### The two rules

> **The shell never reaches inside a project.** It does not know what a branch
> is, does not import from `api/`, and holds no project state beyond which row
> was pressed and which list it was on.
>
> **A module never reaches outside itself.** It does not know a shell exists.
> `onExit` is a callback it invokes, not a place it navigates to.

A change that needs a fourth line across this seam is a design change. Raise it
rather than widening the seam quietly.

---

## Which files are whose

Edit freely within a layer. Crossing layers is where to slow down.

### The shell — added for Home and the project list

| File | What it is |
| --- | --- |
| [`src/Shell.tsx`](front-end/src/Shell.tsx) | The root. Holds two pieces of state: which module is open, and which project on which list. |
| [`src/pages/Home.tsx`](front-end/src/pages/Home.tsx) | The greeting and `Start One`. |
| [`src/pages/CompilerProjects.tsx`](front-end/src/pages/CompilerProjects.tsx) | Compiler's list: its fixture and its rule for opening a row. |
| [`src/components/layout/ProductRail.tsx`](front-end/src/components/layout/ProductRail.tsx) | The six modules in two groups, plus the wordmark. |
| [`src/components/projects/`](front-end/src/components/projects/) | The list screen both modules draw: `ProjectsScreen`, `ProjectsToolbar`, `ProjectRow`, `matchesQuery`. |
| [`src/data/products.ts`](front-end/src/data/products.ts) | The rail's six modules. |
| [`src/data/projects.ts`](front-end/src/data/projects.ts) | Compiler's project fixture. Not Configs'. |

> **`components/projects/` was `components/compiler/`.** It was renamed the
> moment a second module drew the same screen, which is what the warning that
> used to stand here predicted. It holds the *shell's* list furniture — a
> screen, a toolbar and a row — and no module's data: `ProjectsScreen` is told
> what to list and asks `canOpen` rather than reading a field, because Compiler
> and Configs answer that question differently for the very same project.

### Compiler — untouched by this work, with two exceptions

Everything under `pages/` (except the two above), `components/main/`,
`components/team/`, `components/settings/`, `api/`, `hooks/`, `lib/` is exactly
as it was. The two exceptions are both additive:

| File | The change |
| --- | --- |
| [`src/App.tsx`](front-end/src/App.tsx) | Gained an optional `onExit` prop, passed to `Sidebar`. Nothing else. |
| [`src/components/layout/Sidebar.tsx`](front-end/src/components/layout/Sidebar.tsx) | The title renders as a button when `onExit` is given, plain text otherwise. |

### Configs — a folder of its own, until it is real

Everything Configs draws is in [`configs-front-end/`](configs-front-end/), and
everything Configs will serve is in [`configs-back-end/`](configs-back-end/).
Neither is a second application: `front-end` builds the first through two
aliases, and nothing calls the second yet.

| File | What it is |
| --- | --- |
| [`configs-front-end/src/pages/ConfigsProjects.tsx`](configs-front-end/src/pages/ConfigsProjects.tsx) | Configs' list. Every row inert — `canOpen` is a constant `false`. |
| [`configs-front-end/src/data/projects.ts`](configs-front-end/src/data/projects.ts) | That fixture. Separate from Compiler's on purpose. |

The split is a **delete boundary, not an architecture**: when Configs stops
being a mockup, the folders fold into `front-end` and `back-end`, the aliases
become relative imports, and nothing else changes. Until then the rule is that
anything Configs-specific goes there and nothing Configs-specific goes here.

Four places wire it up, and they are the whole arrangement. Three of them fail
*silently* if forgotten, which is why they are listed rather than left to be
found:

| Where | What it does | If it is missing |
| --- | --- | --- |
| [`front-end/vite.config.ts`](front-end/vite.config.ts) | `@cs` / `@configs` aliases, and `dedupe` for React | The build cannot resolve `react/jsx-runtime` from outside `front-end` — this one is loud |
| [`front-end/tsconfig.app.json`](front-end/tsconfig.app.json) | The same two paths, plus `react/jsx-runtime`, plus the folder in `include` | Type errors, or Configs simply not typechecked |
| [`front-end/src/index.css`](front-end/src/index.css) | `@source "../../configs-front-end/src"` | **Silent.** Tailwind stops at the project it is imported from, so every class used only by a Configs screen is absent and those screens render half-styled |
| [`eslint.config.js`](eslint.config.js) at the repo root | Moves the lint base path up so both trees are reachable | **Silent.** ESLint refuses to lint outside its config's directory, so Configs would simply never be checked |

### Shared by all

| File | Note |
| --- | --- |
| [`src/Entry.tsx`](front-end/src/Entry.tsx) | Routing. Still one question: join link, or the app. |
| [`src/components/ui/Icon.tsx`](front-end/src/components/ui/Icon.tsx) | One closed union for every layer. The shell added 9 names; Configs added `sidebar`. |
| [`src/index.css`](front-end/src/index.css) | One token set for all. The shell added `cs-action`, `cs-text-search`, `cs-text-branchline`, `cs-monogram-lab`, `--font-rounded`; Configs added `cs-monogram-configs`. |
| [`src/components/layout/SidebarNavItem.tsx`](front-end/src/components/layout/SidebarNavItem.tsx) | **Used by both rails, unchanged.** Editing it changes both. |
| [`src/components/layout/AppWindow.tsx`](front-end/src/components/layout/AppWindow.tsx) | The window. Drawn by the shell and by each module's root. |

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
| Search | **Works.** Filters on name and branch, on both lists. | Client-side, needs nothing. |
| Project row → Compiler | **Works** for Orchid Lab. | It is the one project the API seeds. |
| Project row → Configs | Drawn, pressable, inert | Configs has no inside yet. A blank window stood behind Orchid Lab until 2026-09-05 and was removed: it was a placeholder for an editor that has not been designed. |
| `Cseudocode` / project name | **Works.** Both go Home. | |
| Open Folder · New Folder · Sync from GitHub · filter | Drawn, pressable, inert | Three unspecified features. Guessing puts undesigned behaviour on screen. |
| `Start One` | Drawn, inert | The frame does not say where it leads. |
| Interpreter · Library · Trash · Settings | Pressable, no-op | Not built. Drawn at full strength in the design, so not greyed out. |
| Machine Learning · HelloWorld rows | Drawn, do not open | No project behind them. Listed, not invented. |
| Binary · MyOS · OrchidLab on Configs' list | Drawn, do not open | Nothing to open them into. |

**The empty state is not a second screen.** The "no projects" frame is the same
frame with the rows removed, so it is `ProjectsScreen` with an empty list — for
either module. Searching down to nothing lands in the same place, which is
correct: both are "the list you asked for is empty". To see it: empty the
fixture, or search for something that matches nothing.

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

**Configs is a connection, not a feature.** The rail reaches it, the list
searches and opens, and the window it opens into is blank because the frame it
is built from is blank. Nothing in it touches a source file. What that will
eventually take — a source-map plugin, a bridge, an overlay — is in
[configs-back-end/README.md](configs-back-end/README.md), and none of it exists.

**`front-end` is no longer self-contained, and a deploy may need to know.**
`tsc -b` and `vite build` both now read `../configs-front-end`, so building from
inside `front-end` alone fails. If the host is configured with `front-end` as
its root directory it must be pointed at the repo root instead, with the build
run from `front-end` and `front-end/dist` as the output. Nothing in the repo can
check that, which is why it is written down here.

---

## Where to make a change

| You want to… | Go to |
| --- | --- |
| Change the greeting or `Start One` | `pages/Home.tsx` |
| Add, remove or re-order a **Compiler** row | `front-end/src/data/projects.ts` |
| Add, remove or re-order a **Configs** row | `configs-front-end/src/data/projects.ts` |
| Make a Compiler row open | give it a `projectId` in its fixture |
| Make a Configs row open | `ConfigsProjects.tsx` — the `canOpen` constant, and a root for it to land in |
| Change the toolbar over either list | `components/projects/ProjectsToolbar.tsx` — changes both |
| Change how a project row looks | `components/projects/ProjectRow.tsx` — changes both |
| Add a module to the shell's rail | `data/products.ts` |
| Make a module actually open something | `Shell.tsx` — the `onSelect` guard, and `Opened` |
| Change anything **inside** a Compiler project | Compiler's own docs. Do not start here. |
| Change anything **inside** Configs | `configs-front-end/`. Nowhere else. |
| Add a glyph | `components/ui/Icon.tsx` — one union for every layer |
| Add a colour or radius | `src/index.css`, `cs-*` tokens |

---

## Design sources

Figma file `En35pb5T6YT7m8HBzTxERa`:

| Frame | Node | Built as |
| --- | --- | --- |
| Cseudocode Home Page | `230:56` | `pages/Home.tsx` |
| Compiler with projects | `230:144` | `pages/CompilerProjects.tsx` |
| Compiler, no projects | `230:141` | the same file, empty list |
| Configs with projects | `281:45` | `configs-front-end/src/pages/ConfigsProjects.tsx` |
| Configs blank (temporarily) | `282:152` | built, then removed — see below |

Metrics follow the same rule as the rest of the client: **source frames are
2204px wide and the app renders at 1400, so values are multiplied by ≈0.635.**
That is how the shell's rail is 210 from 330, and the project rows' document
icon 53×70 from 83×111.

Four places the transcription deliberately departs from the frame, each recorded
in the component that does it:

- **The monogram is centred**, not offset. The source positions each initial by
  hand, which lands a single letter in the middle and pushes a two-letter one
  off the page edge.
- **Monogram size follows letter count** — 30px for one, 27px for two. The source
  draws the same letter `O` at two different sizes, and this is the only reading
  that makes its three values consistent.
- **No traffic lights.** Every frame in the file is drawn as a macOS window and
  not one of them is transcribed with its three dots — `ProductRail` drops the
  ones above the wordmark and starts at the title. They are the mockup's chrome,
  not the product's.

`282:152`, *Configs blank (temporarily)*, was built and then removed on
2026-09-05. The frame is a window, a title and a panel toggle and nothing else;
built, it was a blank room a project row led into. It goes back when there is an
editor to put in it, and the frame is still the source for its header.

`281:3`, the third frame given for Configs, is a bare rounded rectangle with no
rail, no toolbar and no text. It is read as a background layer rather than as a
screen: Configs' empty state is the same one Compiler's is, the frame with its
rows removed, because that is what the built empty state already means and
inventing a second kind would need a frame that says so.

The project row's document is the **existing** `file-blank.png`. The asset the
frame exports for it is byte-identical (same md5), so it is reused rather than
shipped twice.
