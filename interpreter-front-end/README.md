# interpreter-front-end

Interpreter, the layer that records every change twice — as code, and as what it
means in English — and answers what happened here months later.

Everything Interpreter draws is here. Everything it will serve is in
[`interpreter-back-end`](../interpreter-back-end/). Neither is a second
application: `front-end` builds this one through the `@interp` alias, and nothing
calls the second yet.

The split is a **delete boundary, not an architecture**. When Interpreter stops
being a mockup these fold into `front-end` and `back-end`, the alias becomes a
relative import, and nothing else changes.

## The two halves of this folder

| | What it is |
| --- | --- |
| `src/` | **Transcription.** Every value comes from a frame. Where a frame and a guess disagree, the frame wins. |
| `inlab-front-end/` | **Reasoned out.** Screens the Figma does not draw, built from the handoff prototype and the Cseudocode design system. |

The line is provenance, not quality. Asking "where did this measurement come
from?" should have one of two answers, and which folder a file is in says which.

## What is in it

| File | What it is |
| --- | --- |
| `src/InterpreterApp.tsx` | The module root. Holds all state; nothing is fetched. |
| `src/data/types.ts` | The five types, and the rules a signature cannot carry. |
| `src/data/seed.ts` | The Orchid Lab fixture. 35 things, 41 links, 16 changes, 4 challenges, 4 problems. |
| `src/lib/derive.ts` | Every reading over that fixture. Nothing rendered is stored. |
| `src/components/Symbols.tsx` | The four symbols. **Placeholders** — see below. |
| `src/components/ProjectSidebar.tsx` | The wordmark and the projects. |
| `src/components/EntryCard.tsx` | One change: who, when, why, what it means. |
| `src/components/Setup.tsx` | What a project runs the first time it is opened. |
| `src/pages/Stream.tsx` | Latest, and each project's own history. |

## The rules, which are the product

1. **Nothing lands without a reason.** Every path that writes a record ends at a
   required, non-empty reason field. No skip, no default text. Capturing intent
   at the moment of authoring is the entire data advantage.
2. **Never invent a reason.** Where none was recorded, `No reason recorded.` in
   muted grey. Never summarise the diff and present it as intent.
3. **English is stored, not generated on read.** Both halves are written once and
   are immutable after.
4. **Never a raw diff as the primary view.** Code is one click deep and
   deliberately unpleasant to live in.
5. **Certainty is always visible.** `watched` / `told` / `guessed`, and
   `Watched N of M` on every change.

## What is not built yet

The change detail, the map, both sheets, the notices and waiting panels, the
project story and the code descent are drawn in frames that have not been
transcribed. `Show me` and `Fix this` are wired and land nowhere on purpose —
inventing those screens would put undesigned behaviour on screen, and the whole
point of the `inlab` split is that a guess is labelled as one.

`⌘K` is out of scope by decision, not omission.

## The symbols are placeholders

`src/components/Symbols.tsx` draws four glyphs approximating SF Symbols. They
carry all the meaning in this module — green translates, blue builds and repairs,
orange questions, purple warns — and they are to be replaced with the real assets
from the Figma. Swapping them is one edit to that file.

## Design source

Figma file `En35pb5T6YT7m8HBzTxERa`:

| Frame | Node | Built as |
| --- | --- | --- |
| Latest, every project | `321:133` | `pages/Stream.tsx`, `showProject` |
| One project's history | `321:63` | the same file, scoped |
| Setting up | `321:129` | `components/Setup.tsx` |

One deliberate departure, recorded in the component that makes it: the prototype
puts a blue **Set up** link on a project that has not been read. Neither frame
draws one, so it is not there — pressing the row runs setup either way.
