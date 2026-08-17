/**
 * The one project Compiler has open — its artwork and deploy host, the files inside
 * it, and the branches it can be worked in.
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

/** The project itself. One is open at a time and the source never names another. */
export const PROJECT = {
  name: 'Orchid Lab',
  version: 'Orchid Lab V3',
  deployHost: 'orchid-lab.cleverpro.com',
  previewSrc: '/assets/images/orchid-lab-preview.png',
}

export const PROJECT_FILES: ProjectFile[] = [
  { name: 'assets', isFolder: true },
  { name: 'api', isFolder: true },
  { name: 'public', isFolder: true },
  { name: 'src', isFolder: true },
  { name: '.env', isFolder: false },
  { name: 'README.md', isFolder: false },
  { name: 'pack-lock.json', isFolder: false },
  { name: 'pack.json', isFolder: false },
]

/** Seed value only — the Main page owns the live list once a branch is added. */
export const BRANCHES = ['main', 'Orchidlab Experiment AUG10']

/** Every branch deploys to a subdomain, so the field only ever takes the prefix. */
export const DEPLOY_SUFFIX = '.cleverpro.com'

/**
 * What a new branch carries over. Fixed in the source; nothing selects them yet.
 *
 * `size` is the glyph's width in the Add Branch sheet's tile and nowhere else — the
 * Action window draws the same two attachments at its own, much smaller sizes. These
 * carry that sheet's step-up from 62 and 41, held just under it so the taller glyph
 * still clears its 94px well.
 */
export const BRANCH_ATTACHMENTS: BranchAttachment[] = [
  { name: 'OrchidLab v1.3', icon: 'file-blank', size: 75, showsSourceBranch: true },
  { name: 'README.md', icon: 'book-md', size: 50 },
]
