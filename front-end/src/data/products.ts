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
 * Only Compiler is built. The rest are named here because the design draws
 * them at full strength and the rail would read wrong with holes in it — they
 * are labels, and pressing one does nothing until the module behind it exists.
 */
export type ModuleLabel = 'IDE' | 'Configs' | 'Compiler' | 'Library' | 'Trash' | 'Settings'

export interface ModuleItem {
  label: ModuleLabel
  icon: IconName
  /** Whether pressing it goes anywhere. Only Compiler does. */
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
    { label: 'IDE', icon: 'ide', built: false },
    { label: 'Configs', icon: 'configs', built: false },
    { label: 'Compiler', icon: 'compiler', built: true },
  ],
  [
    { label: 'Library', icon: 'library', built: false },
    { label: 'Trash', icon: 'trash', built: false },
    { label: 'Settings', icon: 'gear-plain', built: false },
  ],
]
