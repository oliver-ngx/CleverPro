import type { NavItem, PageLabel } from '../../data/navigation'
import type { TeamMember } from '../../data/team'
import type { PersonName } from '../ui/Avatar'
import type { TeamSort } from '../../lib/sorting'
import { TEAM_SORTS } from '../../lib/sorting'
import { FloatingMenu } from '../ui/FloatingMenu'
import { IconButton } from '../ui/IconButton'
import { SortMenu } from '../ui/SortMenu'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarPerson } from './SidebarPerson'

interface SidebarProps {
  title: string
  navItems: NavItem[]
  /** The open page, if a page is open rather than a teammate's pane. */
  activeNav?: PageLabel
  onSelectNav: (label: PageLabel) => void
  team: TeamMember[]
  /** id of the teammate whose pane is open, if any. */
  activePerson?: PersonName
  onSelectPerson: (person: TeamMember) => void
  /** The order the list below the Team heading is shown in. */
  teamSort: TeamSort
  onSortTeam: (order: TeamSort) => void
}

/**
 * The rail down the left of the window: the project's name, the nav, and the team.
 * It is always in the layout at the source's 299px.
 *
 * Below `md` it is not drawn at all — 299px of rail beside the content would leave a
 * phone with nothing to read it in. `MobileNav` carries the same destinations there,
 * as a tab bar under the pane.
 */
export function Sidebar({
  title,
  navItems,
  activeNav,
  onSelectNav,
  team,
  activePerson,
  onSelectPerson,
  teamSort,
  onSortTeam,
}: SidebarProps) {
  return (
    <div className="hidden w-[299px] shrink-0 overflow-hidden bg-cp-sidebar md:block">
      <div className="flex h-full w-full shrink-0 flex-col pt-[14px]">
        <div className="flex h-[44px] items-center px-[18px]">
          <span className="text-[14px] font-semibold text-cp-text-primary">{title}</span>
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
          {/* The glyph floats its card rather than unfolding one under the heading.
              The in-place pattern is for a row that *displays* a value -- the value
              collapses and the card's heading arrives where it was. A bare glyph
              displays nothing, so there is no value to swap and nothing for the card
              to grow out of. */}
          <FloatingMenu
            trigger={({ open, onClick }) => (
              <IconButton
                icon="filter"
                label="Sort the team list"
                expanded={open}
                iconClassName="h-[7px] w-[12px] text-cp-text-primary"
                onClick={onClick}
              />
            )}
          >
            {(close) => (
              <SortMenu
                value={teamSort}
                options={TEAM_SORTS}
                onSelect={(order) => {
                  onSortTeam(order)
                  close()
                }}
              />
            )}
          </FloatingMenu>
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
          className="mx-[25px] cursor-pointer self-start border-none bg-transparent p-0 text-[12px] font-medium text-cp-text-muted transition-colors duration-150 hover:text-cp-text-primary motion-reduce:transition-none"
        >
          More
        </button>
      </div>
    </div>
  )
}
