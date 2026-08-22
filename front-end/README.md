# CleverPro — client

React 19 + Vite + Tailwind v4 + TypeScript. Transcribed from a Figma prototype
and built against the design system in `design-system/`.

New to the project? Read the root [`README.md`](../README.md) first — especially
the vocabulary table, because *commit*, *merge* and *push* do not mean here what
they mean in git, and the components are named after the product's meanings.

```bash
npm install
npm run dev        # http://localhost:5173 — /api proxied to 127.0.0.1:8000
npm test           # vitest, 42 tests
npm run lint       # eslint, type-aware
npm run build      # tsc -b && vite build
```

The API must be running (`cd ../back-end && uvicorn main:app --reload`) or every
screen renders its error state.

---

## What stands in for auth and routing

[`src/config.ts`](src/config.ts) holds where the app *starts*:

```ts
export const PROJECT_ID   = 'proj_1'   // must match the id the API seeds
export const DEFAULT_USER = 'Oliver'   // must be a seeded member's exact name
```

There is no login. The API has no sessions — every mutating request carries an
`actor` string the server matches by display name — so a name stands in for one.
Who the app is *currently* acting as lives in
[`src/session.ts`](src/session.ts), not in `config.ts`: it can be switched at
runtime from the rail, it is remembered in `localStorage`, and switching bumps
the revision counter so every live read refetches as that person. Read it from
`session.ts` or you will be reading the answer from before the switch.

It is **load-bearing on reads, not only on writes**: the actor is in the
Activity feed's URL path, decides which Settings sections render, and decides
which pane has the Action composer. Being able to switch is how any of that gets
looked at.

Routing is one question, answered in [`src/Entry.tsx`](src/Entry.tsx): did
somebody arrive through a project's link? `/join/<token>` opens the join screen
and every other path is the app. A router would be a dependency and a set of
concepts for one branch. The token is taken at mount and stripped from the
address bar the moment it is spent, so a reload does not re-ask a member to
join and the link does not sit in browser history.

---

## How data reaches a screen

```
API ──/api──▶ api/http.ts ──▶ api/client.ts ──▶ api/adapters.ts ──▶ page
              transport        the endpoint list  wire → drawing
```

| File | Responsibility |
| --- | --- |
| [`api/http.ts`](src/api/http.ts) | **The only file that calls `fetch`.** Coalesces concurrent identical GETs, cancels a request once every caller has abandoned it, injects `actor` into writes, and turns a non-OK response into an `ApiError` carrying the server's own wording. |
| [`api/client.ts`](src/api/client.ts) | A list of endpoints and nothing else. Adding a call means adding a line. |
| [`api/types.ts`](src/api/types.ts) | The wire — deliberately snake_case and un-prettified. It describes the API, not the screens. |
| [`api/adapters.ts`](src/api/adapters.ts) | **The seam.** Nested trees → sorted lists, `("Orchid Lab", "V3")` → `"Orchid Lab V3"`, epoch floats → `"Aug 7"`. Keeping it in one file is what stops a server rename rippling into twenty components. |

### Reads, writes, and why everything refetches at once

Reads go through [`useResource`](src/hooks/useResource.ts), writes through
[`useAction`](src/hooks/useAction.ts). Neither refetches anything by name.

A successful write bumps a counter in [`api/revision.ts`](src/api/revision.ts),
and *every* live read is subscribed to it. So merging a commit also refetches the
file tree. That is blunt and deliberate: on a handful of small endpoints it is
cheaper than a cache layer and it cannot go subtly wrong. Swap it for a query
library when the payload sizes or the endpoint count make the dependency worth
it.

One read does not take part in that: a **version** is a snapshot, so its file
tree and the text of each file in it can never change. Those two go through
`getImmutable` and are answered from memory once seen, which is what stops a
merge from refetching the bytes of the code you are reading. Only ever use it
for something addressed by a version — on anything the project can advance it
would show stale data forever.

Two details in `useResource` that are easy to undo by accident:

- **A refetch does not re-raise `loading`.** The previous result stays on screen
  while the new one is in flight, so switching branches swaps the file tree in
  place instead of blanking the panel and flashing "Loading".
- **It aborts in-flight requests when its inputs change**, so a slow response for
  the old branch cannot land after a fast one for the new branch.

---

## State: who owns what

[`App.tsx`](src/App.tsx) owns everything shared, and it is a short file worth
reading in full before anything else.

| State | Why it lives in `App` |
| --- | --- |
| `view` | A union: `{kind:'page'}` or `{kind:'person'}`. The rail selects one of two things, so the open view is one of two things. |
| `selectedBranch` | Two screens choose from the same branch list — Main's detail row and the Action composer — so a branch made on one must be visible to the other. Held as a *name*, not an index, so it survives the list arriving. |
| `version` | The open history row. Setting it splits a person's pane. |
| `actionOpen` | The Action composer, which only your own pane has. |
| `memberSettings` | Whether the open pane shows that person's settings rather than their history. Here for the reason `browsing` is: the way out of it is the header pill, and the pill is App's. |
| `browsing` | Main's expanded file browser, closed from that same pill. |
| `sortOpen` | The sort card hanging off the pill on a person's pane. |
| `overview` / `members` | Fetched once here and passed down: one overview call serves the project card, the branch switcher, and the Archive version prefix. |

Pages hold only what is theirs: Main holds the file-tree tick state and the Add
Branch sheet, Settings holds which destructive row is armed, the composer holds
its own draft.

The pages object in `App` is keyed by `PageLabel` rather than switched on, so
adding a nav item without a screen behind it is a **type error** instead of a
rail entry that does nothing.

---

## The screens

| Route | Component | Notes |
| --- | --- | --- |
| Main | [`pages/Main.tsx`](src/pages/Main.tsx) | Four detail rows in one card, over the branch's file tree. The Branches row *grows* in place rather than opening an overlay — which is what extends the card, since the card is only as tall as its rows. |
| Activity | [`pages/Activity.tsx`](src/pages/Activity.tsx) | One table. The Action word **is** the control. "View" is inert: the design defines no detail screen to open from here. |
| Archive | [`pages/Archive.tsx`](src/pages/Archive.tsx) | The shelf. "Applied" is a status, not a control. "Undo" here means *re-release*, not un-merge — a different endpoint from the identically-labelled Activity action. |
| Settings | [`pages/Settings.tsx`](src/pages/Settings.tsx) | **Each role sees a different page**, not the same page greyed out: a row that would always be refused advertises a capability and then withholds it. |
| A person's pane | [`pages/Team.tsx`](src/pages/Team.tsx) | One component for both templates — your own pane and a teammate's differ in *row shape*, not in page. Opening a row slides in the detail panel; below 860px it covers the pane outright. |
| A person's settings | [`pages/MemberSettings.tsx`](src/pages/MemberSettings.tsx) | Reached by pressing their face and name in the header, or the overflow glyph. Role, the notice saying how it got that way, their branches, and removal. There is no roster screen by design: authority moves with the person. |
| Join | [`pages/Join.tsx`](src/pages/Join.tsx) | Not reached from the rail — it is what `/join/<token>` opens, for somebody who is not a member yet. Two endings drawn apart: admitted, or queued for the Owner. |

---

## Components

Fifty-five, in five groups. Anything shared belongs in `ui/`; the other four
folders are per-screen and reach across to each other exactly once — the Action
composer borrows `main/BranchSelect`, because picking a branch is one control
wherever it appears. Treat a second such import as a sign the component has
become shared and should move to `ui/`.

- **`layout/`** — the frame. `AppWindow` (the desktop backdrop and the floating
  1400×805 window), `Sidebar` (the 299px rail: nav items above, teammates below),
  `SidebarNavItem` / `SidebarPerson` (its two row kinds), `MobileNav` (the same
  selection drawn as a tab bar, below `md`), `PageHeader`, `PageBody`,
  `ActingMember` (the acting-member switch, a testing control drawn as one), and
  `ErrorBoundary` — the only class component in the app, because
  `getDerivedStateFromError` has no hook.
- **`ui/`** — the kit: `Button`, `IconButton`, `Checkbox`, `TextField`,
  `FieldLabel`, `Avatar`, `AvatarStack`, `Icon`, `Popover`, `Sheet`, `DataTable`,
  `VersionRow`, `SettingsRow`, `SettingsGroup`, `ComposerRow`, `OptionSelect`,
  `AttachmentTile`, `CodeViewer`, `CommentBlock`, `DiffStat`, `ResourceState`.
- **`main/`** — the Main screen: `DetailRow`, `ProjectThumbnail`, `FileTree`,
  `VersionPanel`, `BranchPanel`/`BranchList`/`BranchMenu`/`BranchSelect`/`BranchTrigger`,
  `AddBranchSheet`.
- **`team/`** — a person's pane: `ActionComposer`, `MentionField`,
  `VersionDetail`, `VersionFiles`, `VersionToolbar`.
- **`settings/`** — `JoinRequests`, the Owner's queue of people at the door.

`Icon` is a closed union of 32 names. **Tint is baked into each asset** at the
value the source uses — Activity green, Archive purple, Settings blue — so a
glyph renders correctly with no extra styling. Glyphs the source left untinted
follow `currentColor`.

---

## Conventions that are not obvious from the code

These are settled decisions, not open questions. Changing one means changing it
everywhere.

**Pixel values are scaled, not literal.** The design frames are 2204px wide and
this app renders at 1400, so source values are multiplied by ≈0.635. That is how
the rail became 299 from 471 and the window radius 29 from 46. Type follows the
same scale onto the repo's existing ladder. *An overlay's scale depends on the
box it is scoped to* — the Add Branch sheet is scoped to the content pane, not
the viewport, and is scaled accordingly.

**Where a frame and a component spec disagree, the frame wins.** The `.jsx.txt`
specs in the design system and the frames do not always match; the frame is the
screen actually being built. Note the divergence in the ported component's doc
comment.

**Responsive behaviour is invented, because the design system defines none.**
Wide tables scroll rather than reflow; the rail is hidden below `md` and
`MobileNav` takes over; each page carries its own reduced padding. Dark mode and
the empty, error and loading states are *genuinely undefined* in the source —
ask before inventing any of those.

**Breakpoints are sometimes measured against the pane, not the window.** The
content area is a `@container`, so `@max-[860px]` in `Team.tsx` asks how much
room the pane itself has. The viewport cannot answer that: the rail beside it
takes 299px the window's own width says nothing about.

**A missing frame is not a reason to withhold a feature.** The Figma file draws
the version view for a teammate's pane and not for your own; both have it. The
frames are a sample of the product, not an enumeration of it.

### Design tokens

All in [`src/index.css`](src/index.css) under Tailwind v4's `@theme`, prefixed
`cp-`: `--color-cp-*`, `--radius-cp-*`, `--shadow-cp-*`, `--animate-cp-*`. Use
them rather than hex values — hardcoding a colour looks right in one screen and
drifts the moment the design system changes.

**Motion is a house default, not transcribed** — the source specifies no
transitions at all. `--ease-cp` is front-loaded, which suits movement and suits a
fade badly, so anything that only changes opacity uses plain `ease-out`, and the
compound animations run fade and movement as two animations on two curves.

---

## The overlay pattern

Every overlay in the app — the Add Branch sheet, the Action composer, the branch
popover — is built the same way:

1. [`usePresence(open, exitMs)`](src/hooks/usePresence.ts) keeps it mounted for
   `exitMs` after `open` goes false, so its exit animation can play. It then
   unmounts and takes any half-filled form with it.
2. `exitMs` comes from [`lib/motion.ts`](src/lib/motion.ts), **which duplicates a
   duration declared in `index.css`.** That duplication is required: CSS cannot
   tell JS when an animation is over. Change one, change the other.
3. [`useOverlayDismiss`](src/hooks/useOverlayDismiss.ts) wires Escape, which is
   the one way out every overlay shares.

The wait is a timer rather than an `animationend` listener on purpose: these
exits are two animations on one element, so the event fires more than once — and
under `prefers-reduced-motion` the animation is `none`, so it never fires at all
and the overlay would be stranded on screen for good.

A parked overlay uses `inert`, or it would still take tab stops from off-screen.

---

## Tests

Vitest, on the pure logic — no DOM rendering.

| File | Covers |
| --- | --- |
| `src/api/http.test.ts` | Request coalescing, the immutable-response cache, and what happens to a shared request when one caller aborts. Invisible when they work, subtle when they do not. |
| `src/api/adapters.test.ts` | The wire → drawing translation, so a server rename this file does not follow fails a test rather than emptying a row. |
| `src/lib/authority.test.ts` | The permission mirrors, each with a counterpart in `back-end/tests/`. |
| `src/lib/highlight.test.ts` | The code viewer's tokeniser, which is pure and easy to break silently. |

---

## Recipes

**Format a value** — `lib/format.ts` holds `titleCase` and the two timestamps.
Do not write a third copy in a page: a formatter copied is a formatter that
drifts, and the same stamp then reads two ways on two screens.

**Call a new endpoint** — add the DTO to `api/types.ts`, a line to `api/client.ts`,
and a mapping in `api/adapters.ts` if the screen wants a different shape. Read it
with `useResource((signal) => api.thing(signal), [deps])`.

**Add a screen** — add its label to the `PageLabel` union in `data/navigation.ts`;
the compiler will then require an entry in `App.tsx`'s `pages` table.

**Change a permission rule** — change it in `back-end/core/project.py` first, then
mirror it in `lib/authority.ts`. Nothing in that file may be the only check on
anything.

**Change a visual** — consult `design-system/` first. It is `.gitignore`d, so it
never appears in a diff; **that says nothing about its authority.** It is the
source of truth for the UI.

---

## Gotchas

- **`design-system/` is untracked but authoritative.** Do not conclude it is
  unused or stale because git does not show it.
- **"Undo" means two different things** — un-merge on Activity, re-release on
  Archive.
- **A blank branch name is legal.** The server generates one, which is why
  `createBranch` uses the name from the *response* rather than from the field.
- **Attaching files moves no bytes.** A path from a JSON tree has no content, so
  the diff is zero lines. Only a picked folder introduces new content.
- **Deploy URL empty is not a bug.** A push advances the version without changing
  what production serves, so the row is legitimately blank until a first release.
- **Version labels will not match the mock.** The mock's "v2" was drawn by hand;
  the backend generates `V1`, `V2`… and no endpoint can reproduce the mock's
  numbering.
