# configs-front-end

Everything Configs draws. **Not a second application** — Cseudocode is one
window with several modules in it, and this is the source of one of them.

It has no `package.json`, no `index.html` and no dev server. `front-end` builds
it, through two aliases:

| Alias | Points at |
| --- | --- |
| `@cs/*` | `front-end/src/*` — the Cseudocode shell and Compiler |
| `@configs/*` | `configs-front-end/src/*` — this folder |

They are declared twice and must stay in step: in
[`front-end/vite.config.ts`](../front-end/vite.config.ts) for the bundler, and in
[`front-end/tsconfig.app.json`](../front-end/tsconfig.app.json) for the compiler
and the editor.

## Why it is a separate folder

So that everything belonging to Configs can be found, and later moved, in one
go. When Configs stops being a mockup and becomes something demoable, this
folder folds into `front-end`, the two aliases become ordinary relative imports,
and nothing else changes. That is the whole reason for the split — it is a
delete boundary, not an architecture.

Until then the rule is simple: **anything Configs-specific goes here.** Nothing
Configs-specific goes in `front-end`.

## What is in it

| File | What it is |
| --- | --- |
| `src/pages/ConfigsProjects.tsx` | The Configs module's project list. Every row inert. |
| `src/data/projects.ts` | That list. A fixture. |

## What it borrows, and what it does not

It borrows furniture from `@cs` — the project-list components in
`components/projects/`, which Compiler and Configs draw identically. One toolbar
with two callers cannot drift; two copies would.

It does **not** borrow Compiler's fixture or Compiler's idea of what "open"
means. The two lists name some of the same projects and mean different things by
them: Compiler's `projectId` means "the Compiler API holds this project", which
is the wrong question to ask on this screen. This list answers `canOpen` for
itself, and today the answer is always no.

## Where Configs is real, and where it is drawn

Nothing here does anything to a source file yet. This work is the *connection*
between Cseudocode and Configs — a module in the rail and a list of projects —
not Configs itself.

| Control | State |
| --- | --- |
| Rail → Configs | **Works.** |
| Search | **Works.** Filters on name and branch. |
| Binary · MyOS · OrchidLab rows | Drawn, pressable, inert |
| Open Folder · New Folder · Sync from GitHub · filter | Drawn, pressable, inert |

A blank Configs window stood behind the Orchid Lab row until 2026-09-05, built
from `282:152`. It was removed: a placeholder room for an editor that has not
been designed. Every row is inert until there is something real to land in.

## Design source

Figma file `En35pb5T6YT7m8HBzTxERa`:

| Frame | Node | Built as |
| --- | --- | --- |
| Configs with projects | `281:45` | `pages/ConfigsProjects.tsx` |
| Configs blank (temporarily) | `282:152` | built, then removed |

Same rule as the rest of the client: **source frames are ~2204px wide and the
app renders at 1400, so values are multiplied by ≈0.635.**

Two findings from building `282:152`, kept because they will apply again when
that window comes back: its title is **14, matching the rail's `Cseudocode`
wordmark exactly** rather than the 13 that scaling gives — the two words trade
places as you enter and leave, and a word that changes size across that swap
reads as a glitch. And its panel toggle is 17×13, scaled from 23×18.
