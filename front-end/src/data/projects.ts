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
 */
export interface ProjectEntry {
  /** Row identity. Not the API's id — two rows may share one project. */
  key: string
  name: string
  /** The branch it is on. Drawn under the name in grey. */
  branch: string
  /** The initial(s) struck across the document icon. */
  monogram: string
  /** That initial's colour, as a `cs-*` text class. */
  monogramClass: string
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

/**
 * The search field's filter. Matches the name or the branch: the branch is on
 * screen under every row, and a word somebody can read there ought to find it.
 */
export function matchesQuery(entry: ProjectEntry, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return (
    entry.name.toLowerCase().includes(needle) || entry.branch.toLowerCase().includes(needle)
  )
}
