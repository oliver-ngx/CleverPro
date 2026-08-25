import type { MemberDto } from '../../api/types'
import { setCurrentUser, useCurrentUser } from '../../session'
import { Avatar } from '../ui/Avatar'
import { FloatingMenu, MENU_ITEM } from '../ui/FloatingMenu'

interface ActingMemberProps {
  /** Everyone this project has. The switch is only ever between real members. */
  members: MemberDto[]
}

/**
 * Who the app is acting as, and a card to become somebody else.
 *
 * This is a testing control and is drawn as one: it sits under the rail's
 * "More" line in the muted 12px the rail uses for its own labels, rather than
 * anywhere the design puts product controls. It is here because the API has no
 * sessions — the actor is a name in a request body — so "log in as somebody
 * else" is genuinely a one-line change, and the alternative is editing
 * `config.ts` and restarting to see what a Contributor sees.
 *
 * Switching is not cosmetic. The Activity table's action word is computed per
 * viewer, the Action window belongs to your own pane alone, and Settings
 * renders fewer sections to a Contributor than to the Owner — so this is the
 * fastest way to see any of that. Every live read refetches as the new member;
 * see `session.ts`.
 *
 * Delete this file and its one line in `Sidebar` to remove it, and nothing else
 * changes: everything it touches goes through `session.ts`, which real
 * authentication would replace wholesale.
 */
export function ActingMember({ members }: ActingMemberProps) {
  const actor = useCurrentUser()

  return (
    <FloatingMenu
      trigger={({ open, onClick }) => (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={onClick}
          className="mx-[25px] flex cursor-pointer items-center gap-[8px] self-start border-none bg-transparent p-0 text-left text-[12px] font-medium text-cs-text-muted outline-none transition-colors duration-150 ease-out hover:text-cs-text-primary motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-cs-accent"
        >
          <Avatar person={actor} size={16} />
          <span className="truncate">Acting as {actor}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate pb-[8px] text-[13px]/[130%] font-semibold text-cs-text-tertiary">
            Act as
          </span>

          <div className="h-px bg-cs-hairline" />

          <div className="flex flex-col items-stretch gap-[9px] pt-[9px]">
            {members.map((member) => (
              <button
                key={member.name}
                type="button"
                role="menuitem"
                aria-current={member.name === actor}
                onClick={() => {
                  setCurrentUser(member.name)
                  close()
                }}
                className={`${MENU_ITEM} flex items-center justify-between gap-[16px] ${
                  member.name === actor
                    ? 'text-cs-text-primary'
                    : 'text-cs-text-branch hover:text-cs-text-primary'
                }`}
              >
                <span className="truncate">{member.name}</span>
                {/* The role, because it is the reason to switch: it decides
                    which sections a screen draws and which actions are live. */}
                <span className="shrink-0 text-cs-text-tertiary">{member.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </FloatingMenu>
  )
}
