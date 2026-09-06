import type { IconName } from '../components/ui/Icon'

/**
 * The Cseudocode rail — the one above the project, not the one inside it.
 *
 * Two rails exist and they are not the same rail. This one selects a *module*
 * of Cseudocode and is drawn on the Home and Compiler frames; `data/navigation`
 * selects a *screen* inside one project and is drawn on every Compiler frame
 * underneath. They look alike on purpose and mean different things, which is
 * why they are two files rather than one list with a mode flag.
 *
 * Compiler, Configs and Interpreter are built. The other three are named here
 * because the
 * design draws them at full strength and the rail would read wrong with holes
 * in it — they are labels, and pressing one does nothing until the module
 * behind it exists.
 *
 * Interpreter held the label IDE until 2026-09-05. It was never a code editor:
 * it is the layer that records every change twice, as code and as English, and
 * answers what happened here months later. The rail slot and its glyph are
 * unchanged — only the name was wrong.
 *
 * It is also the one module with no project list between the rail and itself.
 * Compiler and Configs ask which project first; Interpreter opens on every
 * project's changes at once, because what happened rarely respects a project
 * boundary and choosing first would hide the entries you did not know to look
 * for. `Shell` has that branch.
 */
export type ModuleLabel =
  | 'Interpreter'
  | 'Configs'
  | 'Compiler'
  | 'Library'
  | 'Trash'
  | 'Settings'

export interface ModuleItem {
  label: ModuleLabel
  icon: IconName
  /** Whether pressing it goes anywhere. Compiler and Configs do. */
  built: boolean
}

/**
 * The design puts a gap between Compiler and Library — 110px where the rows are
 * otherwise 45 apart — so the rail is two groups rather than one list of six.
 * The first group is what you make software with; the second is what you keep
 * it in and how you configure it.
 */
export const MODULE_GROUPS: ModuleItem[][] = [
  [
    { label: 'Interpreter', icon: 'interpreter', built: true },
    { label: 'Configs', icon: 'configs', built: true },
    { label: 'Compiler', icon: 'compiler', built: true },
  ],
  [
    { label: 'Library', icon: 'library', built: false },
    { label: 'Trash', icon: 'trash', built: false },
    { label: 'Settings', icon: 'gear-plain', built: false },
  ],
]
