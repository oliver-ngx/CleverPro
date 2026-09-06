# Cseudocode

## Table of Content

**Page 1 — What is [Cseudocode](#page-1--what-is-cseudocode)?**
A software that thinks. The philosophy, the objective, the method.

**Page 2 — [Configs](#configs--shaping-software-you-can-see) and [Compiler](#compiler--the-email-version-of-git)**
Shaping software visually, and moving it between people.

**Page 3 — [Binary](#binary--the-agent-that-builds) and [Interpreter](#interpreter--the-layer-that-remembers)**
The agent that writes, and the layer that remembers.

**Page 4 — [How the four work as one](#page-4--how-the-four-work-as-one)**
One AI system underneath, one project on top.

**Page 5 — Why [Interpreter](#page-5--why-interpreter-is-the-moat) is the moat**
It is not a feature. It is what a feature cannot become.

**Page 6 — [Three phases, not three versions](#page-6--three-phases-not-three-versions)**
Editor, shelter, agent — in that order, for a reason.

---

## Page 1 — What is Cseudocode?

Welcome to the project. Before you open a file in the repository, read this. It
will not tell you how the code is organised; it tells you what we believe, which
is the part that is hard to reconstruct later.

Our tagline is *a software that thinks*. Take it literally. Software stores what
it is. It does not store what it means, why it is shaped that way, or what was
already tried. That second half has always lived somewhere else — in a pull
request nobody reopens, or in the head of whoever wrote it, until they leave.

The name is deliberate. Pseudocode is how a person describes a program before a
machine can run it: informal, structural, human. It sits between thought and
instruction.

```
create a button
when a button is clicked
send a message
```

No machine executes that, and every person understands it instantly. We think
software should stay that legible after it is built, not only before.

### Where this comes from

Git solved storage and history: it shows every line that changed and none of the
reasons. Figma solved collaboration by making the artefact itself the shared
surface. Copilot solved the blank page. Then Cursor, Lovable and the agent tools
solved generation, and generation stopped being the bottleneck.

What none of them solved arrives afterwards. Someone ships an application in a
weekend and cannot open it in March. An engineer runs an agent during a meeting,
returns to four hundred changed lines, and neither reads nor trusts them. The gap
widened because the models got good: writing speed rose, reading speed did not.

### Objective and method

We are building the environment where software written faster than anyone can
read it stays maintainable anyway — not by slowing the writing down, and not by
asking anyone to read more. Three commitments follow, and every feature is
checked against them. Record each change twice, as code and as plain English, at
the moment it happens. Let every surface edit the same real project. Run the AI
underneath those surfaces, not beside them.

> **NOTE**
>
> Generation is fast. Cleanup is slow. If a decision does not narrow the distance
> between those two, it does not belong in Cseudocode.

---

## Page 2 — Configs and Compiler

Cseudocode has four parts: Configs, Compiler, Binary and Interpreter. This page
covers the two you can already touch.

### Configs — shaping software you can see

Configs is a visual editor for a real, running application. Not a canvas that
builds a new app from scratch, and not a design file somebody has to hand over.
Your own project runs in the frame against your own dev server, and you drag,
type, toggle and slide directly on it.

What matters is what happens after the edit. Configs writes the change back into
the actual source file — the real component, in the real repository. A
compile-time plugin stamps a source location onto every element as the app
builds, so the overlay always knows which line of which file sits under the
cursor, and a bridge writes the edit back through the syntax tree instead of
pasting text. There is no export step. The file on disk is the design.

Front-end and back-end move in the same motion. Real applications rarely hardcode
their text: a heading comes from a prop, a price from a query, a label from a
table. Editing one of those must not quietly replace the binding with a fixed
string, so Configs traces the value to its origin and changes it there. We call
this code sync, and it is the hardest engineering in the product.

Appearance is edited directly. Behaviour is built as stacked actions, in the
manner of Apple Shortcuts, so someone who cannot write an event handler can still
express one.

```
when Checkout is tapped
read cart.total from orders
go to the Payment screen
```

### Compiler — the email version of Git

Git is correct and almost nobody outside engineering can use it. Compiler keeps
what Git does and replaces how it feels: you do not merge branches, you send work
to people. A change is composed the way a message is composed — choose who sees
it, attach a version or a set of files, say what changed, send.

Two verbs, and they are not the same one. **Commit** proposes: your work goes in
front of the people you chose and Main is untouched. **Push** promotes: your
version becomes the one everybody sees. Deploying is a third act with its own
authority, so pushing renews the project without changing what a visitor sees
until someone publishes. The same event is even labelled differently at each end
— *View* to the sender, *Merge* to the recipient — because from those two chairs
they are genuinely different actions.

---

## Page 3 — Binary and Interpreter

### Binary — the agent that builds

Binary is the Cseudocode agent: it writes code, runs tasks, reads the project and
changes files across it. In raw capability it belongs to the same family as every
other good coding agent, and we are not pretending to win that race — it is being
run by foundation labs and we are not one.

What differs is where it stands. Binary works inside a project whose visual
layer, collaboration history and reasoning record are all first-class data, so it
can be told things no external agent can be told: this component belongs to
someone else this week, this value is bound to a table and not a string, this
pattern was tried in March and reverted, here is why. An agent with that context
makes different choices.

### One AI system underneath

The same intelligence layer runs beneath all the surfaces, which is what makes
this one product instead of a suite. In Configs it does the resolution work,
tracing a visual edit to the prop, query or record that actually produces the
value. In Compiler it reads two divergent versions semantically rather than by
line, so a merge is decided at the level of components and functions. In
Interpreter it translates between code and English in both directions. Our own
team sits inside real user projects and fixes the sync engine against what breaks
there, not against a fixture.

### Interpreter — the layer that remembers

Interpreter is the translation layer between the software and the people
responsible for it. Every event — your edit, a file the agent wrote, a change a
teammate pushed — passes through it and is stored twice: the code, and what it
means in English. Both are kept permanently. It runs at two moments, and they
behave like different products wearing one name. At **write-time** it is a smoke
detector, firing while a change is still being proposed.

```
// this is a third way of checking permissions.
// you already have two, and this one is looser.
[use the existing check]  [keep it, here is why: ___]
```

At **read-time** it is memory. It answers, at any point afterwards: what happened
here, what was this built for, what did we already try, why is it shaped this
strange way. That is the answer to the moment this company was founded on — a new
developer opening a repository and going quiet. They do not need a map of the
files. They need six months of reasoning nobody wrote down.

---

## Page 4 — How the four work as one

Read separately they look like a feature list, and a feature list is the wrong
way to hold this product in your head. They form one loop. Configs shapes,
Compiler coordinates and ships, Binary builds, Interpreter understands and
remembers. A change enters anywhere in that loop and leaves the same way: as
source code that runs, and as a plain-English record of what it did and why.

That is what closes the two failures on page one. Someone who cannot read code
gets a surface that edits the real thing rather than a copy of it. An engineer
who cannot read everything the agent wrote gets an account produced at the moment
of writing, by a system that could see the intent, instead of one reconstructed
later from a diff. Different people, opposite directions, the same records.

> **NOTE**
>
> |              | Vibe Coder                                          | Developer                                   |
> | ------------ | --------------------------------------------------- | ------------------------------------------- |
> | **Workflow** | Prompting an AI                                     | AI-assisted development                     |
> | **Problem**  | Doesn't know what maintainable software looks like  | No time to inspect everything AI changed    |
> | **When**     | Before the mess exists                              | After the change lands                      |
> | **Job**      | Prevention                                          | Correction                                  |
> | **Question** | Should I do it this way                             | What did the AI just do                     |
> | **We give**  | A nudge onto the maintainable path                  | An explanation, and a repair                |
> | **Surface**  | Write-time challenge                                | Read-time interpretation                    |

One thing worth saying out loud, because it should change how you prioritise: AI
getting better is not a threat to this premise. If agents go from writing a
hundred lines to a thousand, the chance that a person manually understands each
one falls. Every improvement in generation makes the layer that explains
generation more necessary.

---

## Page 5 — Why Interpreter is the moat

Assume the worst case honestly. Assume Cursor is perfect today — flawless
completion, flawless agents, an editor nobody can fault. We still think
Cseudocode holds, and the reason is worth stating precisely, because it is the
argument you will be asked to make in front of investors, candidates and
eventually competitors.

Interpreter is not a feature. It is a property of a system that recorded
everything from the beginning. A feature can be shipped in a quarter by anyone
with a good team. A record cannot be shipped at all. It can only be accumulated,
and only by a system that was present at write-time for every change since the
project began.

Consider what copying it would actually take. A competitor has to intercept every
event in a project — human edits, agent output, teammate pushes, visual changes —
at the moment each occurs, and store the intent beside the code, permanently,
from day one. Ship that feature tomorrow and it holds nothing. It starts empty
and stays near empty for months, because the questions worth asking are about
what happened before it was installed.

That is the asymmetry we are underwriting. Generation is a capability, and
capabilities get copied. Accumulated interpretation is a position, and positions
get taken. Every day a project runs inside Cseudocode, the distance between us
and the same project run elsewhere grows by one more day of reasoning that only
we hold.

It is also why Interpreter does not really belong on the feature list, even
though this guide introduced it there for convenience. Configs, Compiler and
Binary are surfaces where work happens; Interpreter is the substrate they write
into. Remove it and the other three still function, and Cseudocode stops being
Cseudocode — it becomes a competent editor with a good visual mode.

> **NOTE**
>
> Say it precisely and do not overreach. An editor can add a summarise button in
> a quarter. What it cannot add is six months of a project's reasoning, because
> that had to be captured while the six months were happening.

---

## Page 6 — Three phases, not three versions

We do not plan in v1, v2, v3. Version numbers describe releases; what we need to
describe is which problem we are willing to be judged on at a given moment. So
the roadmap is three phases, and each one has to earn the next.

**Phase one — the Integrated Software Editor**

Cseudocode enters as an ISE: an environment where a small team builds together
without an engineering workflow. Compiler makes collaboration feel like sending
mail rather than resolving conflicts. Configs makes interface and behaviour
editable by dragging, on the real application. The promise here is experience,
not defensibility. This phase exists to be genuinely pleasant, to earn the
install, and to get real projects running inside the system where every change
starts being recorded.

**Phase two — the filter and the shelter**

This is what Cseudocode is actually for. Vibe coding produces software nobody can
maintain, including the person who made it, and AI-assisted development produces
more change per day than any engineer can review. Cseudocode becomes the filter
between generated code and code you can live with: challenging at write-time,
explaining and repairing at read-time. Phase one earns the install; phase two
earns the dependency, and the moat is built entirely here.

**Phase three — Binary**

Only now does the agent arrive, standing on both phases beneath it. Binary builds
inside a project whose structure, history and reasoning are already legible to
it, which is a materially different agent from one dropped into a bare
repository. Built first, it would have been one more coding assistant. Built
third, it is the only agent that knows what it is walking into.

> **NOTE**
>
> Phase one is the reason to install. Phase two is the reason to stay. Phase
> three is the reason nobody catches up. If you find yourself pulling work from a
> later phase into an earlier one, stop and ask why.

You have joined during phase one, so most of what you build this year will look
like an editor, and it should. Keep the rest of this document in view anyway. The
decisions that seem small now — particularly anything about what gets recorded,
and when — are the ones the later phases will be standing on.
