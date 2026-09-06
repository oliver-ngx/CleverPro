import { ProjectsScreen } from '@cs/components/projects/ProjectsScreen'
import { CONFIGS_PROJECTS } from '../data/projects'

/**
 * The Configs module: the projects Configs will be able to open.
 *
 * The screen is `ProjectsScreen`, the same one Compiler draws — the two frames
 * are identical apart from what is listed. What belongs to Configs and stays
 * here is the list itself.
 *
 * `canOpen` is a constant `false`, which is the honest shape of this screen
 * today: Configs has no editor yet, so no row can lead anywhere. It is a
 * function rather than a flag because `ProjectsScreen` asks each module the
 * question per row, and the day one project opens, this is the single line that
 * changes.
 */
export default function ConfigsProjects() {
  return <ProjectsScreen projects={CONFIGS_PROJECTS} canOpen={() => false} onOpen={() => {}} />
}
