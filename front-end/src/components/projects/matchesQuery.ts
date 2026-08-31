import type { ProjectRowData } from './ProjectRow'

/**
 * The search field's filter. Matches the name or the branch: the branch is on
 * screen under every row, and a word somebody can read there ought to find it.
 *
 * Its own file rather than sitting beside `ProjectsScreen`, because a module
 * that exports both a component and a plain function cannot be hot-reloaded —
 * React Fast Refresh gives up on the whole file and remounts it, losing the
 * state of whatever was on screen.
 */
export function matchesQuery(entry: ProjectRowData, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return entry.name.toLowerCase().includes(needle) || entry.branch.toLowerCase().includes(needle)
}
