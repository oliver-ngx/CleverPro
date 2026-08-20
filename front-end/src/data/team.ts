/**
 * Row shapes for the team rail and for a teammate's pane.
 *
 * Types only. Members come from GET /team and pane rows from
 * GET /team/{member}/activity; api/adapters.ts maps both onto these.
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
  /**
   * The ledger event this row came from, and the row's React key. Required,
   * because a title is not unique: pushing a file version the author already
   * committed produces two rows reading "ContentView.js v1.1.1".
   */
  id: string
  icon: IconName
  /** The source draws each glyph at its own size; none of them share one. */
  iconSize: number
  title: string
  /**
   * The commit behind this row, when there is one. Push rows have none, which
   * is why the version detail can show a comment thread on some rows and not
   * on others -- the API threads notes onto commits, not onto versions.
   */
  commitId?: string
  /** When it landed, long-form, for the detail pane's stamp. */
  stamp: string
  /** Present only on the Self template's taller rows. */
  subtitle?: string
  /** Present only on the Other template. */
  diff?: { added: number; removed: number }
  avatars: PersonName[]
}
