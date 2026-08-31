import { ProjectsScreen } from '@cs/components/projects/ProjectsScreen'
import type { ConfigsProjectEntry } from '../data/projects'
import { CONFIGS_PROJECTS } from '../data/projects'

interface ConfigsProjectsProps {
  onOpen: (entry: ConfigsProjectEntry) => void
}

/**
 * The Configs module: the projects Configs can open.
 *
 * The screen is `ProjectsScreen`, the same one Compiler draws — the two frames
 * are identical apart from what is listed. What belongs to Configs and stays
 * here is the list and the rule for opening one, and that rule is its own:
 * `opens`, not Compiler's `projectId`. Today only Configs itself opens.
 */
export default function ConfigsProjects({ onOpen }: ConfigsProjectsProps) {
  return (
    <ProjectsScreen
      projects={CONFIGS_PROJECTS}
      canOpen={(entry) => entry.opens === true}
      onOpen={onOpen}
    />
  )
}
