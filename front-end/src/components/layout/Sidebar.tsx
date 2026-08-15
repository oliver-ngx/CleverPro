import type { NavItem, TeamMember } from '../../data/compiler'
import { IconButton } from '../ui/IconButton'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarPerson } from './SidebarPerson'

interface SidebarProps {
  title: string
  navItems: NavItem[]
  activeNav: string
  onSelectNav: (label: string) => void
  team: TeamMember[]
  open: boolean
  onToggle: () => void
}

export function Sidebar({
  title,
  navItems,
  activeNav,
  onSelectNav,
  team,
  open,
  onToggle,
}: SidebarProps) {
  return (
    <div
      className={`${open ? 'flex' : 'hidden'} w-[min(299px,85vw)] shrink-0 flex-col bg-cp-sidebar pt-[14px] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:shadow-cp-window md:w-[299px]`}
    >
      <div className="flex h-[44px] items-center justify-between px-[18px]">
        <span className="text-[14px] font-semibold text-cp-text-primary">{title}</span>
        <IconButton
          icon="sidebar-toggle"
          label="Hide sidebar"
          iconClassName="size-[13px] text-cp-text-primary"
          className="h-[22px] w-[26px] rounded-cp-pill bg-cp-white shadow-cp-pill"
          onClick={onToggle}
        />
      </div>

      <div className="h-[21px]" />

      <nav className="flex flex-col gap-[2px] px-[14px]">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.label}
            label={item.label}
            icon={item.icon}
            selected={item.label === activeNav}
            onSelect={() => {
              onSelectNav(item.label)
            }}
          />
        ))}
      </nav>

      <div className="h-[32px]" />

      <div className="mr-[30px] ml-[25px] flex h-[18px] items-center justify-between">
        <span className="text-[12px] font-medium text-cp-text-label">Team</span>
        <IconButton
          icon="filter"
          label="Filter team"
          iconClassName="h-[7px] w-[12px] text-cp-text-primary"
        />
      </div>

      <div className="h-[10px]" />

      <div className="flex flex-col px-[14px]">
        {team.map((person) => (
          <SidebarPerson key={person.name} name={person.name} online={person.online} />
        ))}
      </div>

      <div className="h-[14px]" />

      <button
        type="button"
        className="mx-[25px] cursor-pointer self-start border-none bg-transparent p-0 text-[12px] font-medium text-cp-text-muted"
      >
        More
      </button>
    </div>
  )
}
