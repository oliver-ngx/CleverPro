/**
 * Who is on the project and what each of them has done: the rail's team list, and the
 * entries that fill a teammate's pane.
 */
import type { PersonName } from '../components/ui/Avatar'
import type { IconName } from '../components/ui/Icon'

export interface TeamMember {
  /** Matches the avatar asset filename. */
  id: PersonName
  name: string
  online: boolean
  /** The signed-in user. Their pane uses the Self template, everyone else's Other. */
  self?: boolean
}

/** One commit or artefact in a teammate's pane. */
export interface PaneEntry {
  icon: IconName
  /** The source draws each glyph at its own size; none of them share one. */
  iconSize: number
  title: string
  /** Present only on the Self template's taller rows. */
  subtitle?: string
  /** Present only on the Other template. */
  diff?: { added: number; removed: number }
  avatars: PersonName[]
}
export const TEAM: TeamMember[] = [
  { id: 'oliver', name: 'Oliver (You)', online: false, self: true },
  { id: 'eden-sears', name: 'Eden Sears', online: true },
  { id: 'juliana', name: 'Juliana', online: true },
]

/**
 * What each teammate's pane lists. Oliver's is the Self template — versions of the
 * project with a Preview line; everyone else's is the Other template — commits to a
 * single source file with a diff stat.
 *
 * Oliver's and Eden's rows are transcribed from their frames. Juliana has no frame,
 * so hers follow the same template with the TableView.js history the Activity log
 * already attributes to her.
 */
export const TEAM_PANES: Record<PersonName, PaneEntry[]> = {
  oliver: [
    { icon: 'book-md', iconSize: 18, title: 'README.md', avatars: ['juliana', 'eden-sears'] },
    { icon: 'eye', iconSize: 18, title: 'Main v3', subtitle: 'Preview', avatars: ['juliana', 'eden-sears'] },
    { icon: 'eye', iconSize: 18, title: 'Main v2', subtitle: 'Preview', avatars: ['eden-sears'] },
    { icon: 'eye', iconSize: 18, title: 'Main v1', subtitle: 'Preview', avatars: ['juliana', 'eden-sears'] },
    { icon: 'eye', iconSize: 18, title: 'Main v1.1.1', subtitle: 'Preview', avatars: ['juliana'] },
  ],
  'eden-sears': [
    { icon: 'swift', iconSize: 22, title: 'ContentView.swift v3', diff: { added: 45, removed: 0 }, avatars: ['oliver'] },
    { icon: 'swift', iconSize: 22, title: 'ContentView.swift v2', diff: { added: 45, removed: 0 }, avatars: ['oliver'] },
    { icon: 'swift', iconSize: 22, title: 'ContentView.swift v1.1', diff: { added: 45, removed: 0 }, avatars: ['oliver'] },
    { icon: 'swift', iconSize: 22, title: 'ContentView.swift v1', diff: { added: 45, removed: 0 }, avatars: ['oliver', 'juliana'] },
  ],
  juliana: [
    { icon: 'file', iconSize: 16, title: 'TableView.js v2', diff: { added: 45, removed: 0 }, avatars: ['oliver'] },
    { icon: 'file', iconSize: 16, title: 'TableView.js V1 .1', diff: { added: 45, removed: 0 }, avatars: ['oliver'] },
    { icon: 'file', iconSize: 16, title: 'TableView.js V1', diff: { added: 45, removed: 0 }, avatars: ['eden-sears'] },
    { icon: 'file', iconSize: 16, title: 'TableView.js V0.1', diff: { added: 45, removed: 0 }, avatars: ['oliver', 'eden-sears'] },
  ],
}
