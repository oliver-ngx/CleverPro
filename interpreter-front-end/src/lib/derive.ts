import { CHANGES, NOW, PROBLEMS, THINGS } from '../data/seed'
import type { ActorId, ChangeRecord, Problem, Thing } from '../data/types'

/**
 * Every reading the interface does over the fixture.
 *
 * Nothing here stores a rendered string. Banners, counts, filters and day
 * groups are all computed from the five arrays each time, which is what keeps
 * the log the single source of truth: a record can be prepended and every
 * surface that mentions it updates without anything being written twice.
 */

/**
 * The four actors. A human and an agent produce the same record and are printed
 * the same way — that symmetry is deliberate, and it is why the stream reads as
 * one history rather than a log with robots in it.
 */
export const ACTORS: Record<ActorId, { name: string }> = {
  you: { name: 'You' },
  claude: { name: 'Claude' },
  cursor: { name: 'Cursor' },
  eden: { name: 'Eden' },
}

export const actorOf = (id: ActorId) => ACTORS[id]

export const thingOf = (id: string): Thing | undefined => THINGS.find((t) => t.id === id)

/**
 * A timestamp, in the shortest form that is still unambiguous.
 *
 * Measured against the fixture's `NOW` rather than the clock, and read in UTC —
 * local-time getters would shift every seeded timestamp by the reader's offset
 * and quietly regroup the stream.
 */
export function when(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) {
    const d = new Date(NOW.getTime() - hours * 3600000)
    const suffix = d.getUTCHours() < 12 ? 'am' : 'pm'
    const hour = d.getUTCHours() % 12 || 12
    return `${String(hour)}:${String(d.getUTCMinutes()).padStart(2, '0')}${suffix}`
  }
  const days = Math.round(hours / 24)
  if (days < 7) {
    const d = new Date(NOW.getTime() - hours * 3600000)
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
  }
  return days < 60 ? `${String(Math.round(days / 7))}w ago` : `${String(Math.round(days / 30))}mo ago`
}

/** A short date, for the per-thing history and the project story. */
export function dateOf(hours: number): string {
  const d = new Date(NOW.getTime() - hours * 3600000)
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(d.getUTCDate())} ${month[d.getUTCMonth()]}`
}

/** The heading a stream group gets: Today, Yesterday, a weekday, then a date. */
export function dayLabel(hours: number): string {
  const d = new Date(NOW.getTime() - hours * 3600000)
  const today = Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate())
  const then = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const diff = Math.round((today - then) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()]
  }
  return dateOf(hours)
}

export interface StreamFilters {
  /** `undefined` means every project — the Latest stream. */
  projectId?: string
  branch: string
  /** `'all'`, or a cutoff in days. */
  window: 'all' | 7 | 30
}

/**
 * Which project a record belongs to.
 *
 * The fixture is one project's graph, and the Latest stream needs entries from
 * several, so the four areas stand in for four projects until real ones exist.
 * It is a fixture-shaped compromise and the one place here that invents
 * something the data does not say; when projects are real this reads a field.
 */
const AREA_PROJECT: Partial<Record<string, string>> = {
  payments: 'orchidlab',
  'signing in': 'myos',
  plants: 'orchidlab',
  'getting started': 'myos',
}

export function projectOf(record: ChangeRecord): string {
  if (record.touched.length === 0) return 'orchidlab'
  const thing = thingOf(record.touched[0])
  return thing === undefined ? 'orchidlab' : (AREA_PROJECT[thing.area] ?? 'orchidlab')
}

/** New records first, then the seeded log. Approving one rewrites its status. */
export function records(extra: ChangeRecord[], letThrough: string[]): ChangeRecord[] {
  const base = CHANGES.map((r) => (letThrough.includes(r.id) ? { ...r, status: 'landed' as const } : r))
  return [...extra, ...base]
}

/** The log a screen shows: filtered by project, branch and window, newest first. */
export function visible(all: ChangeRecord[], filters: StreamFilters): ChangeRecord[] {
  let list = all
  if (filters.projectId !== undefined) list = list.filter((r) => projectOf(r) === filters.projectId)
  // The experimental branch is the one the agents were not let loose on.
  if (filters.branch !== 'main') list = list.filter((r) => r.by === 'you' || r.by === 'eden')
  // Read out of `filters` first: narrowing a property does not survive into the
  // callback, and `window * 24` would be typed against the union again.
  const days = filters.window
  if (days !== 'all') list = list.filter((r) => r.hours <= days * 24)
  return [...list].sort((a, b) => a.hours - b.hours)
}

/** Groups a list into the stream's day headings, in order. */
export function byDay(list: ChangeRecord[]): { label: string; entries: ChangeRecord[] }[] {
  const groups: { label: string; entries: ChangeRecord[] }[] = []
  for (const record of list) {
    const label = dayLabel(record.hours)
    const group = groups.find((g) => g.label === label)
    if (group === undefined) groups.push({ label, entries: [record] })
    else group.entries.push(record)
  }
  return groups
}

export const openProblems = (fixed: string[]): Problem[] => PROBLEMS.filter((p) => !fixed.includes(p.id))

/**
 * Whether a link is still broken.
 *
 * Gated on the problem rather than the link so that repairing `pr1` visibly
 * redraws the edge from dashed to solid. That transition is the most persuasive
 * moment in the product, and it only works because this is derived.
 */
export const linkBroken = (broken: boolean | undefined, fixed: string[]): boolean =>
  broken === true && !fixed.includes('pr1')

/** Every change that touched one thing, newest first. */
export const historyFor = (all: ChangeRecord[], thingId: string): ChangeRecord[] =>
  all.filter((r) => r.touched.includes(thingId)).sort((a, b) => a.hours - b.hours)

/** The Notice a card carries, if the problem it caused is still open. */
export function noticeFor(record: ChangeRecord, fixed: string[]): Problem | undefined {
  if (record.caused === undefined || fixed.includes(record.caused)) return undefined
  return PROBLEMS.find((p) => p.id === record.caused)
}

/** The third line of a stream card. A batch counts lines; everything else states its consequence. */
export function thirdLine(record: ChangeRecord): string {
  if (record.batchLines !== undefined) return record.batchLines
  if (record.status === 'blocked') return ''
  if (record.effect.length > 0) return record.effect[0]
  const n = record.touched.length
  return `Touched ${String(n)} ${n === 1 ? 'thing' : 'things'}`
}

/** The sentence printed under a reason, saying where the reason came from. */
export function intentSentence(source: ChangeRecord['intentSource']): string {
  if (source === 'answered') return 'Given when Interpreter asked, at the moment of the change.'
  if (source === 'none') return 'Nothing was recorded at the time.'
  if (source === 'inherited') return 'Carried from the change this one modifies.'
  return 'Stated when the change was made.'
}
