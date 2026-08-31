import { useMemo, useState } from 'react'
import { matchesQuery } from './matchesQuery'
import type { ProjectRowData } from './ProjectRow'
import { ProjectRow } from './ProjectRow'
import { ProjectsToolbar } from './ProjectsToolbar'

interface ProjectsScreenProps<T extends ProjectRowData> {
  projects: T[]
  /**
   * Whether this module can open that project. Asked rather than assumed: the
   * two modules answer it differently for the very same row.
   */
  canOpen: (entry: T) => boolean
  onOpen: (entry: T) => void
}

/**
 * A module's project list: every project, over the toolbar that searches them.
 *
 * Compiler and Configs draw the same frame here — same rail beside it, same
 * toolbar, same rule, same rows at the same 68/16/40 — and differ only in what
 * is listed and what opens. So the frame is this component, and each module
 * keeps its own page, its own fixture and its own answer to `canOpen`. Sharing
 * the furniture is what stops the two lists drifting apart visually; keeping
 * the pages separate is what stops them being confused for one another.
 *
 * The empty state is not a second screen. The design for "no projects" is the
 * same frame with the rows removed — same rail, same toolbar, same rule, and
 * nothing under it — so it is this component with an empty list rather than a
 * component of its own. Searching down to no matches lands in exactly the same
 * place, which is right: both are "the list you asked for is empty", and the
 * design does not distinguish them.
 */
export function ProjectsScreen<T extends ProjectRowData>({
  projects,
  canOpen,
  onOpen,
}: ProjectsScreenProps<T>) {
  const [query, setQuery] = useState('')

  const shown = useMemo(
    () => projects.filter((entry) => matchesQuery(entry, query)),
    [projects, query],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto animate-cs-page-in motion-reduce:animate-none">
      <ProjectsToolbar query={query} onQuery={setQuery} />

      <div className="px-[68px] pt-[16px] pb-[40px]">
        {shown.map((entry) => (
          <ProjectRow
            key={entry.key}
            entry={entry}
            openable={canOpen(entry)}
            onOpen={() => {
              onOpen(entry)
            }}
          />
        ))}
      </div>
    </div>
  )
}
