/**
 * Interpreter's data model.
 *
 * Five arrays and nothing else: a graph of `Thing`s joined by `Link`s, a log of
 * `ChangeRecord`s, the `Challenge`s raised before changes landed, and the
 * `Problem`s found after. Everything the interface shows — every banner, count,
 * filter and sentence — is derived from these at render time. Nothing rendered
 * is ever stored.
 *
 * The rules a type signature cannot carry, kept here because they are the
 * product rather than preferences:
 *
 * 1. **`why` is never invented.** An empty string is a first-class state that
 *    renders as "No reason recorded." in muted grey. It is never filled in from
 *    the diff — a summary of what changed is not a statement of why.
 * 2. **A record is immutable.** Corrections are new records. The value of the
 *    log is that it says what somebody believed at the time.
 * 3. **Certainty is always visible.** Every relationship is `watched`, `told` or
 *    `guessed`, and every change carries `watched N of M`. This is the visible
 *    proof that the model knows more than a static indexer, which is the whole
 *    claim.
 */

/** Where a thing sits in the four-band stack. Never shown to the user as a word. */
export type ThingKind = 'screen' | 'button' | 'form' | 'endpoint' | 'logic' | 'check' | 'table'

/** The four people in the fixture. A human and an agent produce the same record. */
export type ActorId = 'you' | 'claude' | 'cursor' | 'eden'

/**
 * A node in the graph of the software — **named in plain English, always**.
 *
 * `name` is what the user reads: *Settings page*, *Payment logic*, *Permission
 * check A*. `file` is the real path and appears in exactly one place, the map's
 * inspector, in monospace. It never appears in the stream.
 */
export interface Thing {
  id: string
  kind: ThingKind
  name: string
  file: string
  area: string
  /** How many places use it. `1` is what makes an orphan legible without a modal. */
  usedBy: number
  /** Hours before `NOW`. */
  lastTouched: number
  lastTouchedBy: ActorId
}

/** The plain verb a link prints. The last two describe trouble rather than traffic. */
export type LinkVerb = 'asks' | 'shows' | 'checks' | 'saves' | 'same-as' | 'disagrees-with'

/**
 * How well the system knows a relationship, and the most important idea here.
 *
 * `watched` was seen happening at runtime; `told` was declared when it was
 * built; `guessed` was read out of static code. Never present a guess as an
 * observation — the counts printed beside every change are counting these.
 */
export type Certainty = 'watched' | 'told' | 'guessed'

export interface Link {
  id: string
  from: string
  to: string
  how: LinkVerb
  certainty: Certainty
  /** A contract that no longer holds. Drawn dashed, with a glyph at the midpoint. */
  broken?: boolean
}

/** Where a reason came from. Rendered as a plain sentence under the reason. */
export type IntentSource = 'declared' | 'answered' | 'inherited' | 'none'

/** Whether a change is in the project, waiting on a decision, or refused. */
export type ChangeStatus = 'landed' | 'waiting' | 'blocked'

/** What a change did to a thing it edited. */
export type Verb = 'new' | 'edited' | 'removed' | 'moved' | 'new column'

/** One of the smaller changes inside an agent's batch. */
export interface BatchChild {
  id: string
  what: string
  why: string
  intentSource?: IntentSource
}

/**
 * The core record. Both languages, written once, immutable.
 *
 * `touched` and `affected` never overlap: the first is what the change edited,
 * the second is what it changed the behaviour of without editing. That
 * distinction is the entire point of the consequence sheet, and collapsing the
 * two would remove the only thing the product knows that a diff does not.
 */
export interface ChangeRecord {
  id: string
  by: ActorId
  /** Hours before `NOW`. */
  hours: number
  /** English verb phrase, lowercase. Rendered as `{actor} {what}`. */
  what: string
  /** One or two sentences in the author's voice. `''` means none recorded. */
  why: string
  intentSource: IntentSource
  status: ChangeStatus
  touched: string[]
  verbs: Record<string, Verb>
  affected: string[]
  /** One sentence per affected thing — including the ones that did not change. */
  effects: Record<string, string>
  /** The headline consequence. `effect[0]` is the stream card's third line. */
  effect: string[]
  /** Relationships observed, of relationships involved. */
  watched: number
  total: number
  /** The problem this change created, if it created one. */
  caused?: string
  /**
   * What to do about this change, drawn in the blue Build & Repair banner.
   *
   * Not only for blocked or waiting changes: `321:63` puts one on a change that
   * landed cleanly months ago, because the useful thing to say about it is what
   * is still outstanding rather than what happened.
   */
  buildNote?: string

  /** Set when an agent's session is one entry rather than forty. */
  batchOf?: number
  batchLines?: string
  /** The one line in the batch worth reading. */
  flag?: string
  /** Which child the flag refers to — *Read the one that matters* opens this. */
  flagChild?: string
  children?: BatchChild[]
}

/** What the Challenger asked before a change landed. */
export interface Challenge {
  id: string
  changeId: string
  kind: 'duplicate' | 'divergent'
  message: string
  existing: string[]
  verdict: string
  outcome: 'reused' | 'proceeded'
  /** Required when `proceeded`. Becomes the record's `why`, prefixed `Kept, because:`. */
  reason?: string
}

/** What the Noticer found after changes landed. */
export interface Problem {
  id: string
  /** `risk` is wrong now; `attention` will bite. */
  level: 'risk' | 'attention'
  title: string
  /** Two or three reasoned sentences. Why it matters and how it happened. */
  detail: string
  things: string[]
  /** The change that caused it. What makes this more than a linter finding. */
  causedBy?: string
  fixable: boolean
  fixCost?: string
}

export interface InterpreterProject {
  id: string
  name: string
  initial: string
  /** The monogram's colour, as a `cs-*` or `interp-*` text class. */
  colorClass: string
  /** Whether the project has been read yet. An unread one runs setup on open. */
  indexed: boolean
}
