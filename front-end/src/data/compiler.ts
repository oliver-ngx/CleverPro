import type { PersonName } from '../components/ui/Avatar'
import type { IconName } from '../components/ui/Icon'

export interface NavItem {
  label: string
  icon: IconName
}

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

export const NAV_ITEMS: NavItem[] = [
  { label: 'Main', icon: 'nav-main' },
  { label: 'Activity', icon: 'activity-check' },
  { label: 'Archive', icon: 'archive-cube' },
  { label: 'Settings', icon: 'gear' },
]

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

/** View, Merge and Undo are the only words the Action column ever holds. */
export type ActivityAction = 'View' | 'Merge' | 'Undo'

/**
 * A type alias rather than an interface on purpose: only an alias carries the
 * implicit index signature that lets a row be handed to DataTable as a record.
 */
export type ActivityEntry = {
  who: string
  /**
   * The log line, verbatim. The design system is explicit that the source's
   * inconsistent version casing (`v3` and `V3` both occur), its stray double
   * spaces and its `V1 .1` are to be reproduced rather than tidied.
   */
  activity: string
  action: ActivityAction
}


export const ACTIVITY: ActivityEntry[] = [
  { who: 'Oliver', activity: 'Pushed Orchid Lab V3 to main', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed refined ContentView.js v2.1 ', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Committed refined ContentView.js v2 ', action: 'Merge' },
  {
    who: 'Juliana',
    activity: 'Committed refined  TableView.js v2, TableContent.css v3  ',
    action: 'Undo',
  },
  { who: 'Juliana', activity: 'Pushed TableView.js v2 to main ', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v1.2 ', action: 'Merge' },
  { who: 'Oliver', activity: 'Pushed Orchid Lab V2.1 to main', action: 'View' },
  { who: 'Oliver', activity: 'Undo Orchid Lab V2 to main  ', action: 'View' },
  { who: 'Oliver', activity: 'Pushed Orchid Lab V2 to main ', action: 'View' },
  { who: 'Juliana', activity: 'Pushed TableView.js V1 .1 to main', action: 'View' },
  { who: 'Juliana', activity: 'Committed TableView.js V1 .1', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Pushed ContentView.js v1.1.1 to main', action: 'View' },
  { who: 'Oliver', activity: 'Committed Orchid Lab V2 ', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v1.1.1', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v1.1', action: 'Merge' },
  { who: 'Juliana', activity: 'Committed TableView.js V1 ', action: 'Merge' },
  { who: 'Oliver', activity: 'Undo Orchid Lab V0.1 to main', action: 'View' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v0.1.1', action: 'Merge' },
  { who: 'Eden Sears', activity: 'Committed ContentView.js v0.1', action: 'Merge' },
  { who: 'Juliana', activity: 'Committed TableView.js V0.1 ', action: 'Merge' },
  { who: 'Oliver', activity: 'Pushed Orchid Lab V0.1 to main', action: 'View' },
]

/** The archive's action column offers one more word than the activity log's. */
export type ArchiveAction = 'Undo' | 'Applied'

export type ArchiveEntry = {
  version: string
  /** Terse in the archive table, unlike the activity log's long-form stamps. */
  time: string
  action: ArchiveAction
}

/** Verbatim again — the third row drops the `v` the others carry. */
export const ARCHIVE: ArchiveEntry[] = [
  { version: 'Orchid Lab v3', time: 'Aug 10', action: 'Undo' },
  { version: 'Orchid Lab v2', time: 'Aug 7', action: 'Applied' },
  { version: 'Orchid Lab 1.2', time: 'Aug 4', action: 'Undo' },
  { version: 'Orchid Lab v1', time: 'Aug 2', action: 'Undo' },
  { version: 'Orchid Lab v0.1.1', time: 'Aug 1', action: 'Undo' },
  { version: 'Orchid Lab v0.1', time: 'Aug 1', action: 'Undo' },
]

export const PROJECT = {
  name: 'Orchid Lab',
  version: 'Orchid Lab V3',
  deployHost: 'orchid-lab.cleverpro.com',
  previewSrc: '/assets/images/orchid-lab-preview.png',
}

/** A run of code sharing one colour. `k` is absent for the viewer's base grey. */
export interface CodeToken {
  t: string
  k?: 'comment' | 'decl' | 'ident' | 'keyword' | 'prop' | 'string' | 'value'
}

/**
 * The file the version view opens, one array of tokens per line.
 *
 * The design system says the viewer shows "plain black on white with grey line
 * numbers", but the frame colours the code, so the frame wins and the colours are
 * transcribed here. They are the source's own, not a highlighter's output — nothing
 * parses this text, and its oddities are reproduced rather than tidied: the comment
 * block closes with another `/*` instead of `*\/`, and two lines carry a stray
 * leading space and a run of trailing ones.
 */
export const VERSION_SOURCE: CodeToken[][] = [
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: 'React,', k: 'decl' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'useState, useRef, useEffect, useCallback', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'react\'', k: 'string' },
  ],
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'LANGUAGE_MAP, LANGUAGE_LIST, CODE_LOG_CONFIG ', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'../utils/constants\'', k: 'string' },
  ],
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'highlight', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'../utils/codeHelpers\'', k: 'string' },
  ],
  [
    { t: 'import', k: 'keyword' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
    { t: ' ' },
    { t: 'detectLanguageFromPaste, getLanguageInfo, truncateFilename', k: 'ident' },
    { t: ' ' },
    { t: '}', k: 'keyword' },
    { t: ' ' },
    { t: 'from', k: 'keyword' },
    { t: ' ' },
    { t: '\'../utils/fileHelpers\'', k: 'string' },
  ],
  [],
  [{ t: '/* ', k: 'comment' }],
  [{ t: ' *  CODE FILE PAD CONFIG', k: 'comment' }],
  [{ t: ' *', k: 'comment' }],
  [{ t: ' *  This is the per-file editor: title + language chip + scrollable', k: 'comment' }],
  [{ t: ' *  code area + multipurpose menu (Browse/Copy/Star/Delete).', k: 'comment' }],
  [{ t: ' *  Visual knobs first so you can tune without hunting in JSX.', k: 'comment' }],
  [{ t: '/* ', k: 'comment' }],
  [
    { t: 'const', k: 'decl' },
    { t: ' ' },
    { t: 'PAD_CONFIG =', k: 'ident' },
    { t: ' ' },
    { t: '{', k: 'keyword' },
  ],
  [{ t: '  ' }, { t: '// Header chrome', k: 'comment' }],
  [{ t: '  ' }, { t: 'headerPaddingTop:', k: 'prop' }, { t: ' ' }, { t: '\'14px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'headerPaddingX:', k: 'prop' }, { t: ' \'16px\',', k: 'value' }],
  [
    { t: '  ' },
    { t: 'headerPaddingBottom:', k: 'prop' },
    { t: ' ' },
    { t: '\'8px\',', k: 'value' },
  ],
  [
    { t: ' ' },
    { t: '  glassCircleSize:', k: 'prop' },
    { t: ' ' },
    { t: '44, ', k: 'value' },
    { t: '                      ' },
  ],
  [
    { t: '  ' },
    { t: 'glassCircleBg:', k: 'prop' },
    { t: ' ' },
    { t: '\'rgba(255,255,255,0.08)\',', k: 'value' },
  ],
  [
    { t: '  ' },
    { t: 'glassCircleBorder:', k: 'prop' },
    { t: ' ' },
    { t: '\'0.5px solid rgba(255,255,255,0.12)\',', k: 'value' },
  ],
  [
    { t: '  ' },
    { t: 'glassIconSize:', k: 'prop' },
    { t: ' ' },
    { t: '20,  ', k: 'value' },
    { t: '                      ' },
  ],
  [],
  [{ t: '  // Title', k: 'comment' }],
  [{ t: '  ' }, { t: 'titleFontSize:', k: 'prop' }, { t: ' ' }, { t: '\'32px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titleFontWeight:', k: 'prop' }, { t: ' ' }, { t: '700,', k: 'value' }],
  [
    { t: ' ' },
    { t: '  titleLetterSpacing:', k: 'prop' },
    { t: ' ' },
    { t: '\'-0.5px\',', k: 'value' },
  ],
  [{ t: '  ' }, { t: 'titleColor:', k: 'prop' }, { t: ' ' }, { t: '\'#fff\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titlePaddingX:', k: 'prop' }, { t: ' ' }, { t: '\'16px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titleMarginTop:', k: 'prop' }, { t: ' ' }, { t: '\'14px\',', k: 'value' }],
  [{ t: '  ' }, { t: 'titleMarginBottom:', k: 'prop' }, { t: ' ' }, { t: '\'12px\',', k: 'value' }],
  [],
]

/** The note under the diff. */
export const VERSION_NOTES = [
  'Adding a function: Inserting a new block of code into a script.',
  'Fixing a bug: Changing an incorrect variable name or math sign.',
  'Updating configuration: Changing a port number or setting in a JSON or YAML file.',
]

/** When the open version landed. Fixed in the source. */
export const VERSION_STAMP = 'Jul 24, 2026 at 08:26 PM'
