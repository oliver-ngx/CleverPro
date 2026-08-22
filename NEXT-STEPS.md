# What to do next

A plain-language plan, in the order I would do it.

The app works. The core loop — propose a change, address it to people, adopt it,
promote it to a version, release one, roll production back — is finished on both
sides. Nothing below is on fire.

Two things shape this list. First, **the server is ahead of the client**: five
capabilities are built, enforced and tested with no screen calling them, so the
biggest single gain available is drawing screens for work that already exists
rather than writing anything new. Second, **there is no login and nothing is
saved**, which is fine on your machine and is the wall between here and anyone
else using it.

[FEATURES.md](FEATURES.md) is the full status, feature by feature. This is what
to do about it.

---

## Decide these four things first

Everything else is just work. These need your opinion, and three of them are
questions the Figma file does not answer because it draws no frame for them.

### 1. Where does a person see their own working copy?

This is the one that matters most. When you merge somebody's proposal today, the
files land in your own private copy of the branch — and no screen shows it, so
the only visible effect is a row changing its word from "Merge" to "Undo". The
feature is finished and invisible.

| Option | Notes |
| --- | --- |
| A section on your own pane | Your pane already lists your history; the copy is the same idea one step further. **Suggested.** |
| A column on Main's file tree | Shows "yours" beside "the branch's", which makes divergence obvious — but Main is a shared surface and this is private, so it reads oddly. |
| Leave it API-only | Honest, and means merging stays invisible. Only worth it if you want to cut the working-copy model entirely. |

### 2. Where does someone read that their role changed?

A role change writes a notice naming who changed it, from what to what, and
when. It deliberately does not appear in the team's feed, and nothing displays
it, so right now a promotion is silent to the person promoted.

**Suggested:** the Badge group at the top of Settings, where your role is already
printed. The value is there; the notice is how it got that way.

### 3. Where does Deploy live? *(carried over — still your call)*

Unchanged from the older list, including the oddity that drove it: on a project
that has never been released, pressing **Undo** in the Archive is what publishes
it for the first time.

**Suggested:** Main already has a "Deploy" row that reads "Not deployed". Put it
there. **Avoid:** a third word in the Archive rows — that page was deliberately
built with exactly two, Applied and Undo, and adding one would reopen a decision
already made.

### 4. Can people reply on a version?

The comment under a version is the author's, written when they made it, and it is
read rather than answered. The endpoint for replies exists; no field posts one,
and the toolbar's comment glyph is inert because it has nothing to open.

Deciding yes means inventing a compose row under the thread, which the design
does not draw. Deciding no means the glyph should come out.

---

## Week one: three small things that need nobody's opinion

**Effort:** small each · **Needs your decision:** no

1. **The favicon 404.** `front-end/index.html` asks for `/favicon.svg` and there
   is no such file. Every page load fails to find it. Add one, or drop the line.
2. **Run the tests on push.** There are 140 of them — 101 for the server, 39 for
   the client — and nothing runs them unless somebody remembers. A GitHub
   Actions workflow that runs both suites plus lint and build is an afternoon,
   and it protects everything after it. Worth doing before the bigger items, not
   after.
3. **A button to reset the invite link.** The link works now, so a link sent to
   the wrong person is a real problem with no cure. The endpoint and the client
   method both exist and nothing calls them; this is a Settings row.

Two more that were on this list are done. **Error boundaries** are in — one
around the open view, keyed on it so a broken screen can be walked away from and
the rail stays usable, and one around the document for what that cannot catch; a
component throwing now shows a line and a Reload button instead of a white page.
And the **three documentation drifts** are fixed: the Activity event type union
matches what the feed actually sends, the feed's docstring no longer promises
rows it stopped emitting, and the two client methods nothing calls now say why
they are kept and what they are waiting for.

---

## The main work: finish what is already built

**Effort:** medium each · **Needs your decision:** decisions 1, 2 and 4 above

This is where the value is. None of it needs new server work.

4. **Working copies get a screen** (decision 1). The endpoints return the file
   tree and the history of every state you have been in, including which merge
   or undo produced each. Once this exists, merging visibly does something.
5. **Role-change notices get shown** (decision 2).
6. **A way to leave the project.** The endpoint is there and refuses the Owner,
   who must hand the project on first. Settings' destructive card is the natural
   home: the Owner sees "Delete project" there, everybody else could see "Leave".
   That fits how the rest of Settings already works — each role gets fewer rows
   rather than greyed-out ones.
7. **Branch from an older version.** The Add Branch sheet always starts from
   wherever Main is now. The server accepts a version to start from instead; this
   is one optional row on a sheet that already exists.
8. **Replies on a version** (decision 4), if you want them.

**Not yet:** the four single-object reads — one commit, one branch, one branch's
version list, one member. They exist for a screen opened directly on one thing,
and the app has one URL and no routing, so there is nothing to open. Worth
building when deep links are, and not before.

---

## Before anyone else uses it

**Effort:** large each · **Needs your decision:** no

9. **Real logins.** Every request says who it is and the server believes it, so
   anyone who can reach it can claim to be the Owner by typing the name. Fine on
   your own machine; the one thing that must be fixed before this is online. It
   was arranged to be contained: identity enters through one place on each side
   — `ActorRequest` on the server, `session.ts` in the client — rather than at
   dozens of call sites.
10. **Stop losing everything on restart.** The whole project is a dictionary in
    the API process, so stopping the server restores the demo data and discards
    the rest. Same arrangement: one file decides where projects live, and the
    rules do not know what is behind it.
11. **Two people at the same time.** Today a write refreshes *your* tab and
    nobody else's; a second browser sees nothing until it reloads. Presence — the
    green dot — is hardcoded off for the same reason. For a product about
    working with other people this matters, but it needs 9 and 10 underneath it
    first.
12. **Somewhere to run it.** In development Vite proxies `/api` to the API so the
    browser only ever sees one origin. Whatever serves the build needs to do the
    same, or CORS becomes a real problem for the first time.

---

## Two housekeeping risks worth an hour today

Neither is a feature, and both would hurt on the day somebody clones this fresh.

- **The design system is not in git.** `front-end/design-system/` is the source
  of truth for the entire UI, it is on disk, and `front-end/.gitignore` excludes
  it. A clean clone gets the app without the thing the app is supposed to follow.
  Commit it, or record where it comes from and how to regenerate it.
- **The two product specs are not in the repo at all.** The documents that define
  what Compiler *does* — the logic and invariants, and the per-surface breakdown
  — have only ever been pasted into conversations. They govern behaviour the same
  way the design system governs appearance, and right now they exist nowhere a
  new person could find them.

---

## Decisions already made — don't reopen these

Each of these looks like an obvious improvement and is not:

- **No third word in the Archive.** Two rows' worth of vocabulary, Applied and
  Undo, and Undo reaches any version on the shelf whether or not it has been
  live.
- **Client-side gating is never the enforcement.** Hiding a control the API would
  refuse is a courtesy. Every rule in `lib/authority.ts` is a copy of one the
  server enforces; if a rule appears only in the client, that is a bug in the
  server.
- **History is append-only.** Rolling back appends a new release pointing at an
  old version; retract sets a flag. Nothing is ever deleted.
- **A commit and a push are not steps in a sequence.** They are two things you
  can do with an attachment, and you can push without ever committing.
- **Don't invent dark mode, or empty states.** The design system says outright
  that they do not exist in the source and asks that they not be guessed at.
  Responsive behaviour is the exception — it was invented deliberately and is
  documented; extend what is there rather than inventing a second scheme.
- **Build from the tokens, not from pixels.** Values transcribed out of a mock
  look right once and drift the moment the design system moves.

---

## Checking your work

```bash
cd back-end  && python -m pytest && python -m ruff check .   # 101 tests
cd front-end && npm test && npm run lint && npm run build    # 39 tests
```

Both suites pass today, the client builds without warnings, and `npm audit`
reports nothing against its dependencies. Keep it that way — item 2 above is how.
