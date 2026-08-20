/**
 * What the Add Branch sheet carries, plus the shape of a row in the file tree.
 *
 * The project itself -- its name, current version, deploy host, preview
 * artwork, branch list and real file contents -- all comes from the API now
 * (GET /overview and GET /branches/{name}/files, mapped in api/adapters.ts).
 * What is left here is the one thing the API has no opinion about: the
 * fixtures the Add Branch sheet draws in its attachment tray.
 */
import type { IconName } from '../components/ui/Icon'

export interface ProjectFile {
  name: string
  isFolder: boolean
}

/** A card in the Add Branch sheet's attachment tray. */
export interface BranchAttachment {
  name: string
  icon: IconName
  /**
   * Marks the card that shows which branch the copy is taken from. The source
   * prints "Main" here; it is the branch being forked, so it follows selection.
   */
  showsSourceBranch?: boolean
  /** The source draws the two glyphs at different sizes, so each carries its own. */
  size: number
}

/** Every branch deploys to a subdomain, so the field only ever takes the prefix. */
export const DEPLOY_SUFFIX = '.cleverpro.com'

/**
 * What a new branch carries over. Still fixed in the source: the sheet has no
 * write path yet, so nothing here is selected and nothing is sent. Creating a
 * branch through the API would seed it from Main's real snapshot instead.
 *
 * `size` is the glyph's width in the Add Branch sheet's tile and nowhere else --
 * the Action window draws the same two attachments at its own, much smaller
 * sizes. These carry that sheet's step-up from 62 and 41, held just under it so
 * the taller glyph still clears its 94px well.
 */
export const BRANCH_ATTACHMENTS: BranchAttachment[] = [
  { name: 'OrchidLab v1.3', icon: 'file-blank', size: 75, showsSourceBranch: true },
  { name: 'README.md', icon: 'book-md', size: 50 },
]
