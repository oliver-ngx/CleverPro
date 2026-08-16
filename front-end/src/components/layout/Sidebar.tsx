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
  /** id of the teammate whose pane is open, if any. */
  activePerson?: string
  onSelectPerson: (person: TeamMember) => void
  open: boolean
  onToggle: () => void
}

/**
 * The rail collapses two different ways. On a desktop it is in the layout, so its
 * width goes to zero and the page reclaims the space. On a phone it is an overlay
 * drawer, so it keeps its width and sits off the left edge instead.
 *
 * Either way it is the outer box that changes and the content keeps its full 299px
 * inside it. The outer box clips; the column never moves, so the nav does not reflow
 * and the names do not re-wrap as the rail comes and goes.
 */
export function Sidebar({
  title,
  navItems,
  activeNav,
  onSelectNav,
  team,
  activePerson,
  onSelectPerson,
  open,
  onToggle,
}: SidebarProps) {
  return (
    <div
      className={`shrink-0 overflow-hidden bg-cp-sidebar max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-[min(299px,85vw)] max-md:shadow-cp-window ${
        open ? 'max-md:translate-x-0 md:w-[299px]' : 'max-md:-translate-x-full md:w-0'
      }`}
    >
      {/* Collapsed, the column is merely clipped — it would still take tab stops
          without this, handing keyboard users a rail they cannot see. */}
      <div
        inert={!open}
        className="flex h-full w-[min(299px,85vw)] shrink-0 flex-col pt-[14px] md:w-[299px]"
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
            <SidebarPerson
              key={person.id}
              name={person.name}
              online={person.online}
              selected={person.id === activePerson}
              onSelect={() => {
                onSelectPerson(person)
              }}
            />
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
    </div>
  )
}
