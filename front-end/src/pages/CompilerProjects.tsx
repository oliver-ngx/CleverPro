import { ProjectsScreen } from '../components/projects/ProjectsScreen'
import type { ProjectEntry } from '../data/projects'
import { PROJECTS } from '../data/projects'

interface CompilerProjectsProps {
  onOpen: (entry: ProjectEntry) => void
}

/**
 * The Compiler module: the projects Compiler can work on.
 *
 * The screen itself is `ProjectsScreen`, which Configs draws too. What belongs
 * to Compiler and stays here is the list and the rule for opening one: a row
 * opens when the API genuinely holds that project, which is what `projectId`
 * records. Configs answers the same question from its own fixture and gets a
 * different answer for the same project — see `configs-front-end`.
 *
 * The empty state is not a second screen; see `ProjectsScreen`. To look at it,
 * empty `PROJECTS` in data/projects.ts, or search for something that matches
 * nothing.
 */
export default function CompilerProjects({ onOpen }: CompilerProjectsProps) {
  return (
    <ProjectsScreen
      projects={PROJECTS}
      canOpen={(entry) => entry.projectId !== undefined}
      onOpen={onOpen}
    />
  )
}
