import type { NavItem, PageLabel } from '../../data/navigation'
import type { TeamMember } from '../../data/team'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

interface MobileNavProps {
  navItems: NavItem[]
  /** The open page, if a page is open rather than a teammate's pane. */
  activeNav?: PageLabel
  onSelectNav: (label: PageLabel) => void
  team: TeamMember[]
  /** id of the teammate whose pane is open, if any. */
  activePerson?: string
  onSelectPerson: (person: TeamMember) => void
}

/** The rail's rows are wide and labelled; a tab is a glyph over its name. */
const TAB =
  'flex h-[46px] w-[62px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[4px] rounded-cp-nav border-none px-[4px] transition-colors duration-150 ease-out motion-reduce:transition-none'

/**
 * The rail, rewritten for a phone. A 299px column beside the content would leave a
 * screen this narrow with nothing to read, so below `md` the same destinations —
 * the four pages, then the team — become a tab bar under the pane.
 *
 * They stay in one strip rather than being folded behind a menu, because the rail
 * itself has no open and shut state to hide them behind. Seven tabs will not fit
 * across a small phone, so the strip scrolls sideways; the four pages come first, so
 * what a screen this size shows without scrolling is the nav.
 *
 * Names are trimmed to their first word. The rail has 299px for "Oliver (You)" and a
 * 62px tab does not.
 */
export function MobileNav({
  navItems,
  activeNav,
  onSelectNav,
  team,
  activePerson,
  onSelectPerson,
}: MobileNavProps) {
  return (
    <nav
      aria-label="Sections and team"
      // The safe-area inset keeps the tabs clear of a home indicator; on a phone the
      // window fills the screen, so this is the bottom edge of the display itself.
      className="flex shrink-0 gap-[2px] overflow-x-auto border-t border-cp-hairline bg-cp-sidebar px-[8px] pt-[6px] pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden"
    >
      {navItems.map((item) => (
        <button
          key={item.label}
          type="button"
          aria-current={item.label === activeNav ? 'page' : undefined}
          onClick={() => {
            onSelectNav(item.label)
          }}
          className={`${TAB} ${
            item.label === activeNav ? 'bg-cp-selected' : 'bg-transparent'
          }`}
        >
          <Icon name={item.icon} className="size-[16px]" />
          <span className="truncate text-[10px] font-medium text-cp-text-primary">
            {item.label}
          </span>
        </button>
      ))}

      {/* The rail sets the team apart under its own heading; here there is no room
          for one, so the divider does that work. */}
      <span aria-hidden="true" className="my-[7px] w-px shrink-0 bg-cp-hairline" />

      {team.map((person) => {
        const [first] = person.name.split(' ')
        return (
          <button
            key={person.id}
            type="button"
            aria-current={person.id === activePerson ? 'page' : undefined}
            onClick={() => {
              onSelectPerson(person)
            }}
            className={`${TAB} ${
              person.id === activePerson ? 'bg-cp-selected' : 'bg-transparent'
            }`}
          >
            {/* `relative` so the presence dot can sit on the corner of the face,
                which is where it goes once the row is too narrow to hold it at the
                far end the way the rail does. */}
            <span className="relative flex shrink-0">
              <Avatar person={person.id} size={18} />
              {person.online && (
                <span
                  role="status"
                  aria-label="Online"
                  className="absolute -right-px -bottom-px size-[6px] rounded-full bg-cp-presence ring-2 ring-cp-sidebar"
                />
              )}
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-cp-text-primary">
              {first}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
