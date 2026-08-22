# What works, and what doesn't

A feature-by-feature status of CleverPro Compiler, current as of commit
`3bb1743` plus the error boundary and documentation fixes on top of it.

The interesting thing about this project is that the two halves are not at the
same place. The API is substantially ahead of the client: several capabilities
are implemented, enforced and tested on the server with no screen calling them,
because the Figma source draws no frame for them. So every table below has two
status columns, and the gap between them is the point.

| | Meaning |
| --- | --- |
| **Done** | Built, and reachable the way a user would reach it |
| **Partial** | Built, but with a stated limit — read the note |
| **—** | Not built |
| **n/a** | Not applicable to that half |

An **API: Done / UI: —** row is not a bug. It means the capability exists and
answers correctly over HTTP, and that the only ways to exercise it today are
`http://127.0.0.1:8000/docs`, `curl`, or a test. Every one of them has tests in
`back-end/tests/`.

---

## The short version

- **The core loop is complete end to end**: propose a change, address it to
  people, adopt it privately, promote it to a numbered version, release one to
  production, roll production back.
- **Collaboration plumbing is finished on the server and invisible in the
  client**: working copies, role-change notices, leaving a project, branching
  from an older version, and four single-object reads.
- **There is no identity system.** A member is a display name in a request body.
  This is the single largest thing that is not built, and much else follows from
  it.
- **Nothing persists.** The store is a dictionary in the API process; restarting
  `uvicorn` restores the demo seed and discards everything else.

---

## Identity and access

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Accounts, passwords, sessions, tokens | — | — | Identity travels as an `actor` string in each request body, matched against display names. `ActorRequest` on the server and `session.ts` on the client are the seam this would replace. |
| Acting as any member | n/a | Done | A testing control under "More" in the rail. Not cosmetic: the Activity action word, the Action composer and which Settings sections render are all computed per viewer. Remembered in `localStorage`. |
| Join through the project's link | Done | Done | `/join/<token>` is the only URL the product mints. Either admits outright or opens a request, per the project's own setting; the joiner is told which. The token is stripped from the address bar the moment it is spent. |
| The Owner's join queue | Done | Done | Settings → Accessibility → Requests, Owner-only because the server refuses everybody else. |
| Declining a request | Done | Done | Deliberately silent — no event, no notice. The only sign is the name leaving the list. |
| Leave the project | Done | — | `POST /access/leave`. The Owner is refused: transfer ownership first. Takes the leaver's working copies and role notice with them. No control anywhere in the client. |
| Invite a named person directly | Done | — | `POST /team/invite` exists; the product only mints links, so nothing calls it. |
| Regenerate the invite link | Done | — | Endpoint and client method both exist (`api.regenerateInvite`); no Settings row calls it. "Copy link" copies the current token. |

## Roles and authority

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Three roles, enforced server-side | Done | Done | Contributor / Maintainer / Owner. `lib/authority.ts` mirrors the rules to hide controls, and says in its own doc comment that it is a courtesy and never the enforcement. |
| Role-dependent screens | n/a | Done | Settings renders *fewer sections* to a Contributor rather than the same page greyed out, which is what the product spec asks for. |
| Grant / revoke Maintainer | Done | Done | On the member's own pane, via the overflow glyph. There is no roster screen by design. |
| Remove a Contributor | Done | Done | Same menu. Maintainer and above, and only ever a Contributor. |
| Transfer ownership | Done | Done | Settings → Badge → "Move owner to". The outgoing Owner keeps Maintainer, so the transfer cannot be taken back. |
| Role-change notice | Done | — | Who changed your authority, from what to what, and when. Readable by that member or the Owner. Deliberately *not* a row in the team's feed. Nothing displays it, so a role change is currently silent to the person it happened to. |
| Who may create branches | Done | Partial | The client reads `branch_creation_open_to_contributors` to gate the button, but `POST /settings/branch-creation-authority` has no control — the setting can only be changed over HTTP. |

## Branches and versions

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Branch list and switcher | Done | Done | On Main, and again in the Action composer. |
| Create a branch | Done | Done | Add Branch sheet. A blank name auto-generates one rather than refusing the submit; the server's chosen name comes back in the response. Subdomain format and uniqueness are validated. |
| Create from an older version | Done | — | `from_version` on `POST /branches` reopens a state Main has moved past. The sheet never sends it, so every branch the client makes starts from Main's head. |
| File tree of a branch | Done | Done | Real content, nested. Main's expanded browser is the same tree opened out. |
| Any historical version's tree and file contents | Done | Done | Every version stays retrievable; opening a version row reads by label, not "latest". |
| A project starts at V0 | Done | Done | Visible as the bottom row of the Archive. |
| Version labels are the author's own | Done | Done | A push's name *becomes* the version label. A name the branch already holds is refused rather than silently adjusted. |
| One branch's version history | Done | — | `GET /branches/{b}/versions`. Archive answers a different question and covers Main only, so a non-Main branch's history has no screen. |
| One branch, in full | Done | — | `GET /branches/{b}` — members, head, version and commit counts. |
| Rename or delete a branch | — | — | No endpoint. |

## Proposals: commit, merge, push, retract

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Commit as a proposal | Done | Done | Changes nothing on the branch. Named (required at both ends), with a multi-line comment, addressed to specific people by `@`-mention — none meaning the whole team. |
| Attachments | Done | Done | Files picked from the branch, files or a whole folder read off disk, or one whole version of the branch. A folder arrives as paths under its own name; nothing the client sends can delete a file. |
| The Push-validity rule | Done | Done | A push must resolve to one unambiguous next state, so a mixed bundle (a version *and* loose files) is refused with a 422 — and the Push button goes dead before it gets there. Enforced at both ends, never only at one. |
| Push | Done | Done | Promotes the attachment onto the branch as a new numbered version. Any role may; authority in this product gates release, not contribution. |
| Merge — private adoption | Done | Done | Adopting a proposal resolves it onto *your own copy* of the branch and nobody else's view changes. The row flips from "Merge" to "Undo". |
| Undo a merge | Done | Done | Restores your copy to what it was. |
| Double-merge and out-of-order undo | Done | Partial | Both refused, with the server's own wording. The client shows the refusal text but has nothing to draw it against, since no screen shows a working copy. |
| Retract | Done | Done | The trash glyph on your own pending proposal. Refused once anyone merged it or it was pushed — at that point it is history. |
| Promote somebody's commit | Done | Done | The toolbar's push glyph. Widens the commit's visibility to the whole team, since it is now on the branch. |
| Flag a commit | Done | Partial | A working toggle, lit when set. The source draws a chevron beside it for picking a colour; the design system defines exactly one, so the chevron is decorative. |
| One commit, in full | Done | — | `GET /commits/{id}` — recipients, who merged it, files, diff totals. |
| Forward a proposal to new recipients | — | — | The glyph is drawn because the source draws it. It needs a recipient picker and an endpoint that copies an attachment; neither exists. |
| Restore, Export, Mute, overflow | — | — | Drawn, inert. What "restore a commit" should mean is an open question in the product spec rather than something to guess at. |

## Working copies

The model underneath merging: everybody authors in their own environment, and
what they are working on stays theirs until they commit it.

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Merging resolves onto your own files | Done | — | Fully implemented and tested. |
| Read your working copy | Done | — | `GET /team/{member}/working/{branch}` as a file tree. |
| Its history | Done | — | Every state you have been in on that branch, and which merge or undo produced each. |
| Privacy | Done | n/a | Asking for somebody else's is a 403, not an empty answer. |
| Cleared when you leave or are removed | Done | n/a | |

**The practical consequence:** merging today changes the Activity row's action
word and the commit's status, and nothing else you can see. The files it brought
in exist, on the server, in a place no screen reads.

## Releases and production

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Archive shelf | Done | Done | Every version pushed to Main, newest first. Exactly one row reads "Applied". |
| Undo — release that version | Done | Done | Applies immediately, and appends a new deployment record rather than editing one. Maintainer and above. |
| Advancing Main never changes production | Done | Done | A push puts a version on the shelf; only a release makes one live. A newer version above the applied one is the normal mid-flight state. |
| A separate Deploy control | Done | — | `POST /deploy` and `api.deploy` both exist; no screen calls either. This is deliberate — the Archive frame has two words, Applied and Undo, and "Undo" reaches any version on the shelf whether or not it has been live. |
| Deploy audit log | Done | — | `GET /archive/deploy-log` — the internal trail, distinct from the shelf. |
| What production is serving, as files | Done | — | `GET /production/files`. Main's tree may be ahead of it. |
| Deploy URL and per-branch subdomains | Done | Done | Shown on Main; empty until something has been released. |

## Comments and history

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| The author's comment under the preview | Done | Done | Written in the Action composer at commit time, shown as the first block under the code with the author's face. Newlines are kept and become separate lines. |
| Replying on a version | Done | — | `POST /commits/{id}/comments` works, and the demo seed writes its notes through the same domain method — but no field in the client posts one. The composer writes the comment that *creates* a row, not a reply to one, and the toolbar's comment glyph is inert for the same reason. |
| Comment count on a row | Done | Done | |
| Activity feed, per viewer | Done | Done | One row per commit whose action word changes with who is looking, rather than a second "Merged" row appearing. Deployments and role changes are deliberately absent. |
| A member's own history | Done | Done | Their pane, opening onto the file, its comments and the toolbar. |
| Sorting | n/a | Done | Team list and history, client-side only; a reload puts both back to how the data arrives. |
| Search or filter | — | — | The `@` glyph in the page header is inert. |

## Settings

Every row below is wired end to end: Anyone with the link, Copy link, Requests,
Default new invites, Branches on/off, Production visibility, Custom domain,
Delete project (type-to-confirm), and the Badge showing your own name and role.

Two exceptions: the **Teams** row draws the member avatar stack but does nothing
when pressed — what it is meant to open is recorded as undecided in the product
spec — and **who may create branches** has no control, as noted above.

## Project lifecycle

| Feature | API | UI | Notes |
| --- | --- | --- | --- |
| Create, rename, import, export a project | Done | — | Four endpoints with no client at all. The design opens straight into one project with no picker and no create flow, and `PROJECT_ID` is a constant that must match the API's seed. |

## Platform

| Feature | Status | Notes |
| --- | --- | --- |
| Persistence | — | The store is in memory. Restarting the API restores the demo seed and discards everything else — including anyone who joined. |
| Multi-user sync | — | Every successful write bumps a revision counter that refetches *this tab's* reads. A second browser sees nothing until it writes or reloads. No sockets, no polling. |
| Presence | — | The green dot is always off: `online: false` is hardcoded, because the API has no heartbeat, socket or last-seen. |
| Notifications | — | None, anywhere. This is why a role change had to become a notice you can read rather than something pushed at you. |
| Avatars | Partial | Three PNGs matched by display name; everybody else is drawn from their initials. The real fix is an avatar URL on the member payload. |
| Responsive layout | Done | Invented, because the design system defines none — the rail becomes a drawer below `md`, wide tables scroll rather than reflow, overlays drop their fixed height. |
| Loading and error states | Done | Every read has both. |
| Surviving a crash | Done | Two error boundaries. The inner one wraps the open view and is keyed on it, so a broken screen can be walked away from and the rail stays usable; the outer one wraps the document and catches what the first cannot. A component throwing now shows a line and a Reload button instead of a blank page. |
| Dark mode, empty states | — | The design system states outright that these do not exist in the source, and asks that they not be guessed at. |
| Accessibility | Partial | Labelled controls, focus rings for keyboard users only, Escape closes every overlay, and every transition honours "reduce motion". Not audited against WCAG. |
| Tests | Done | 101 backend tests, 39 front-end. The five product invariants each have one in `back-end/tests/test_invariants.py`. |

---

## Still to do

An earlier `NEXT-STEPS.md` listed seven items, written when the project had 95
tests. Three of them are now done. Here is where each stands, checked against
the tree rather than remembered.

| Old item | Now | |
| --- | --- | --- |
| 1. New people disappear from the sidebar | **Done** | Everyone is drawn, photographed or not. The decision it was waiting on went to initials on the app's field grey rather than the plain grey circle it suggested. The follow-on bug went with it: you can once again administer somebody the design has no photo of. |
| 2. Run the tests automatically | **Not done** | There is no `.github/` at all. 140 tests now pass on demand and nothing checks them on a push. |
| 3. Error boundary, and the missing favicon | **Half done** | The boundaries are in — see "Surviving a crash" above. `index.html:5` still asks for a `/favicon.svg` that does not exist, so every page load still fails to find one. |
| 4a. Somewhere to press Deploy | **Not done — still your call** | Unchanged, including the oddity that drove it: on a project that has never been released, pressing **Undo** in the Archive is what publishes it the first time. The suggestion stands — Main's "Deploy" row, which currently only reads "Not deployed" — and the thing to avoid stands too: no third word in the Archive. |
| 4b. The invite link | **Half done** | The link works now: `/join/<token>` opens a real join screen, and the project either admits people outright or queues them for the Owner, who answers from Settings. What is still missing is the other half — no way to cancel a link you sent to the wrong person. The endpoint and the client method both exist; nothing calls them. The reason that half was deferred no longer holds, because it would now be cancelling a link that genuinely works. |
| 5. Show the real file contents | **Done** | Three screens read the server's bytes; no sample code is left. |
| 6. Real logins | **Not done** | Still no auth, and now with a member switcher sitting on top of it. Contained, as promised — `ActorRequest` on one side, `session.ts` on the other. |
| 7. Stop losing data on restart | **Not done** | Still one dictionary in the API process. |

Its "already fine" list still holds: no dependency vulnerabilities, nothing junk
committed, no dead files, everything passes and builds clean.

**The order I would take them in.** First what is left of the small ones that
need no decision from anybody: the favicon, CI, and the reset-link button now
that links work. The error boundary and the three documentation drifts this
section used to list are done.

Then the largest item on this page, which postdates that older list entirely:
**the capabilities built with no way to reach them.** Working copies are the one
that matters, because they make merging visible; the rest — role notices,
leaving, branching from an older version — are a screen or a row each.

Then the Deploy button, once you have said where it goes. Then logins, then
persistence, in that order: a saved database with no logins is worse than no
database at all.

## Checking any of this yourself

```bash
cd back-end  && python -m pytest && python -m ruff check .
cd front-end && npm test && npm run lint && npm run build
```

The unwired capabilities are easiest to reach through the API's own docs at
`http://127.0.0.1:8000/docs`, which lists all 54 endpoints and will make the
calls for you.
