/**
 * Row shapes for the team rail and for a teammate's pane.
 *
 * Types only. Members come from GET /team and pane rows from
 * GET /team/{member}/activity; api/adapters.ts maps both onto these.
 */
import type { IconName } from '../components/ui/Icon'

export interface TeamMember {
  /** The member's display name, which the API already treats as their id. */
  id: string
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
  /**
   * What the row names: the file a commit changed, or the project at the
   * version a push produced. Not the comment -- that is read under the
   * preview in the detail pane, where there is room for a sentence.
   */
  title: string
  /**
   * The message its author wrote in the Action window. Shown beneath the
   * file preview rather than on the row, so a long one is legible and the
   * row stays a list of artefacts.
   */
  comment: string
  /**
   * The commit behind this row, when there is one. Push rows have none, which
   * is why the version detail can show a comment thread on some rows and not
   * on others -- the API threads notes onto commits, not onto versions.
   */
  commitId?: string
  /**
   * A commit's lifecycle: a pending proposal can still be withdrawn, and one
   * that has been merged or pushed cannot -- it is history by then. Absent on
   * push rows, which are already history the moment they exist.
   */
  status?: 'pending' | 'merged' | 'pushed' | 'retracted'
  /** Whether this commit is flagged. Commit rows only. */
  flagged?: boolean
  /**
   * The paths this row is about: a commit's changed files, or nothing on a push,
   * which is a whole tree rather than a set of names. What the detail pane opens
   * with is decided from this — one path is a file, several are a structure.
   */
  files?: string[]
  /** A push row's version, which is what its content is readable at. */
  versionLabel?: string
  /** The branch it landed on, which the content endpoint is addressed by. */
  branch?: string
  /** When it landed, long-form, for the detail pane's stamp. */
  stamp: string
  /** Present only on the Self template's taller rows. */
  subtitle?: string
  /** Present only on the Other template. */
  diff?: { added: number; removed: number }
  avatars: string[]
}
