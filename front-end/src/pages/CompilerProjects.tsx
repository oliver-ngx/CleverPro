import { useMemo, useState } from 'react'
import { CompilerToolbar } from '../components/compiler/CompilerToolbar'
import { ProjectRow } from '../components/compiler/ProjectRow'
import type { ProjectEntry } from '../data/projects'
import { matchesQuery, PROJECTS } from '../data/projects'

interface CompilerProjectsProps {
  onOpen: (entry: ProjectEntry) => void
}

/**
 * The Compiler module: every project, over the toolbar that searches them.
 *
 * The empty state is not a second screen. The design for "no projects" is the
 * same frame with the rows removed — same rail, same toolbar, same rule, and
 * nothing under it — so it is this component with an empty list rather than a
 * component of its own. Searching down to no matches lands in exactly the same
 * place, which is right: both are "the list you asked for is empty", and the
 * design does not distinguish them.
 *
 * That also means the state is reachable to look at. Empty `PROJECTS` in
 * data/projects.ts, or type something that matches nothing.
 */
export default function CompilerProjects({ onOpen }: CompilerProjectsProps) {
  const [query, setQuery] = useState('')

  const shown = useMemo(() => PROJECTS.filter((entry) => matchesQuery(entry, query)), [query])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto animate-cs-page-in motion-reduce:animate-none">
      <CompilerToolbar query={query} onQuery={setQuery} />

      <div className="px-[68px] pt-[16px] pb-[40px]">
        {shown.map((entry) => (
          <ProjectRow
            key={entry.key}
            entry={entry}
            onOpen={() => {
              onOpen(entry)
            }}
          />
        ))}
      </div>
    </div>
  )
}
