import type { IconName } from '../components/ui/Icon'

export interface NavItem {
  label: string
  icon: IconName
}

export interface TeamMember {
  name: string
  online: boolean
}

export interface ProjectFile {
  name: string
  isFolder: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Main', icon: 'nav-main' },
  { label: 'Activity', icon: 'activity-check' },
  { label: 'Archive', icon: 'archive-cube' },
  { label: 'Settings', icon: 'gear' },
]

export const TEAM: TeamMember[] = [
  { name: 'Oliver (You)', online: false },
  { name: 'Eden Sears', online: true },
  { name: 'Juliana', online: true },
]

export const BRANCHES = ['main', 'Orchidlab Experiment AUG10']

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

export const PROJECT = {
  name: 'Orchid Lab',
  version: 'Orchid Lab V3',
  deployHost: 'orchid-lab.cleverpro.com',
  previewSrc: '/assets/images/orchid-lab-preview.png',
}
