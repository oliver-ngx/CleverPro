import type { PaneEntry, TeamMember } from '../data/team'

/**
 * The orders the two sort controls offer, and the comparators behind them.
 *
 * Both controls are the `filter` glyph the source draws and defines no behaviour
 * for — one beside the rail's Team heading, one in the toolbar pill on a pane. The
 * orders are not in the design system, which specifies appearance only, so they are
 * chosen here and stated in one place rather than inlined at two call sites.
 *
 * Sorting is a view of the data and never a write: nothing here reaches the server,
 * and reloading returns every list to its natural order.
 */

export type TeamSort = 'name-asc' | 'name-desc' | 'self-first'
export type HistorySort = 'newest' | 'oldest'

/**
 * Why there is no "Online first".
 *
 * It was the obvious third order and it cannot work: `toTeam` sets `online` to
 * `false` for everybody, because the API has no presence concept — no heartbeat, no
 * socket, no last-seen — so the field is a placeholder rather than data. An order
 * keyed to it would look like a working control and sort nothing.
 *
 * "You first" replaces it. It is the same idea — lift the notable member out of an
 * alphabet — against something the client actually knows.
 */
export const TEAM_SORTS: { value: TeamSort; label: string }[] = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'self-first', label: 'You first' },
]

export const HISTORY_SORTS: { value: HistorySort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

/**
 * The rail's member list.
 *
 * Copied before sorting, because the array handed in is a `useMemo` result that
 * other things read — sorting in place would reorder it for them too, without a
 * render to tell them it had happened.
 *
 * Names carry a "(You)" suffix added for display, which sorts as part of the string.
 * That only matters for the signed-in user's own row and only against a name sharing
 * their prefix, which is a smaller oddity than stripping the suffix to compare and
 * then printing it back.
 */
export function sortTeam(team: TeamMember[], order: TeamSort): TeamMember[] {
  const byName = [...team].sort((a, b) => a.name.localeCompare(b.name))

  if (order === 'name-desc') return byName.reverse()
  if (order === 'self-first') {
    return byName.sort((a, b) => Number(b.self ?? false) - Number(a.self ?? false))
  }
  return byName
}

/**
 * A pane's history.
 *
 * `toPaneEntries` already hands these over newest-first, so the natural order is the
 * one the pane has always drawn and "Oldest first" is its reverse. Reversed on a copy
 * for the same reason as above.
 */
export function sortHistory(entries: PaneEntry[], order: HistorySort): PaneEntry[] {
  return order === 'oldest' ? [...entries].reverse() : entries
}
