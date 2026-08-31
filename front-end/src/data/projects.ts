import type { ProjectRowData } from '../components/projects/ProjectRow'
import { PROJECT_ID } from '../config'

/**
 * What the Compiler screen lists.
 *
 * This is a fixture, deliberately, and it is worth saying why rather than
 * leaving it to be discovered. The API cannot answer "what projects are
 * there": `ProjectStore` has create, put, get and a length, and no list, and
 * the ids are uuid4 precisely so that nobody can enumerate them — see the
 * comment on `create()`. Adding a route that returned every project on the
 * server would undo that on an API with no authentication at all. So the list
 * is drawn here until there is a notion of "projects *I* can see", at which
 * point this file is what a real read replaces.
 *
 * One row is one project. The grey line under the name is the branch that
 * project is currently on.
 *
 * `projectId` is the honest part: it is set only where the API genuinely holds
 * the project, and only such a row opens. Orchid Lab is the one the backend
 * seeds (see back-end/seed.py) and so the only one that opens; the other two
 * are drawn with nothing behind them, so they are listed and inert rather than
 * invented.
 *
 * This is Compiler's list and only Compiler's. Configs keeps its own in
 * `configs-front-end/src/data/projects.ts`, and the two are not the same list
 * even where they name the same project: opening Orchid Lab here opens
 * Compiler, and opening a row called Orchid Lab there would open Configs.
 */
export interface ProjectEntry extends ProjectRowData {
  /** Set only when the API really holds this project. Unset rows do not open. */
  projectId?: string
}

export const PROJECTS: ProjectEntry[] = [
  {
    key: 'orchid-lab-main',
    name: 'OrchidLab',
    branch: 'Main',
    monogram: 'O',
    monogramClass: 'text-cs-monogram-lab',
    projectId: PROJECT_ID,
  },
  {
    key: 'machine-learning-main',
    name: 'Machine Learning',
    branch: 'Main',
    monogram: 'ML',
    monogramClass: 'text-cs-text-tertiary',
  },
  {
    key: 'hello-world-main',
    name: 'HelloWorld',
    branch: 'Main',
    monogram: 'H',
    monogramClass: 'text-cs-presence',
  },
]
