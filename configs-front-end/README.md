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
| `src/ConfigsApp.tsx` | Configs inside one project. Blank, deliberately. |
| `src/pages/ConfigsProjects.tsx` | The Configs module's project list. |
| `src/data/projects.ts` | That list. A fixture. |

## What it borrows, and what it does not

It borrows furniture from `@cs` — `AppWindow`, `Icon`, and the project-list
components in `components/projects/`, which Compiler and Configs draw
identically. One toolbar with two callers cannot drift; two copies would.

It does **not** borrow Compiler's fixture or Compiler's idea of what "open"
means. The two lists name some of the same projects and answer differently:
Orchid Lab opens under Compiler and does not open here. Compiler's `projectId`
means "the Compiler API holds this project", which is the wrong question to ask
on this screen, so this list has its own `opens` instead.

## Where Configs is real, and where it is drawn

Nothing here does anything to a source file yet. This work is the *connection*
between Cseudocode and Configs — a module in the rail, a list, and a window that
opening a project lands in — not Configs itself.

| Control | State |
| --- | --- |
| Rail → Configs | **Works.** |
| Search | **Works.** Filters on name and branch. |
| The Configs row | **Works.** Opens the blank window. |
| MyOS · OrchidLab rows | Drawn, do not open |
| `Configs` title in the window | **Works.** Goes back to Cseudocode. |
| Sidebar toggle | Drawn, pressable, inert |
| Open Folder · New Folder · Sync from GitHub · filter | Drawn, pressable, inert |

The two departures from the frame — no traffic lights, and the title moved left
to the window's own inset — are recorded in `ConfigsApp.tsx`, next to the code
that makes them.

## Design source

Figma file `En35pb5T6YT7m8HBzTxERa`:

| Frame | Node | Built as |
| --- | --- | --- |
| Configs with projects | `281:45` | `pages/ConfigsProjects.tsx` |
| Configs blank (temporarily) | `282:152` | `ConfigsApp.tsx` |

Same rule as the rest of the client: **source frames are ~2204px wide and the
app renders at 1400, so values are multiplied by ≈0.635.** That is how the
panel toggle's 23×18 becomes 17×13.

The window title is the one place the rule is overruled. Scaling gives 13, but
the title is **14, matching the rail's `Cseudocode` wordmark exactly** — same
size, same weight, same 18px inset, same 44px header. Those two words trade
places as you enter and leave Configs, and a word that changes size across that
swap reads as a glitch rather than as navigation.
