import type { IconName } from '../components/ui/Icon'

/**
 * The four screens the rail can open. A closed set rather than a string, so a page
 * cannot be routed to by a name nothing renders and App's page table has to cover
 * every one of them.
 */
export type PageLabel = 'Main' | 'Activity' | 'Archive' | 'Settings'

export interface NavItem {
  label: PageLabel
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Main', icon: 'nav-main' },
  { label: 'Activity', icon: 'activity-check' },
  { label: 'Archive', icon: 'archive-cube' },
  { label: 'Settings', icon: 'gear' },
]
