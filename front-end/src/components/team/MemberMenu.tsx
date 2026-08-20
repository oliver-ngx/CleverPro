import type { Role } from '../../lib/authority'
import { canGovern, canRelease } from '../../lib/authority'
import { Popover } from '../ui/Popover'

interface MemberMenuProps {
  /** The person whose pane is open, by their bare name. */
  name: string
  role: Role
  /** The signed-in member's role, which is what decides the menu's contents. */
  viewerRole?: Role
  /** True on your own pane. */
  self: boolean
  /** True while one of these is in flight. */
  pending: boolean
  onSetRole: (role: Role) => void
  onRemove: () => void
}

/** The API stores lowercase enums; the menu prints them capitalised. */
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const ITEM =
  'cursor-pointer border-none bg-transparent p-0 text-left text-[11px]/[130%] font-normal text-cp-text-branch transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-cp-text-primary disabled:cursor-default disabled:opacity-50'

/**
 * Member administration, which lives on the person it affects rather than on a
 * roster screen somewhere else. Authority moves with the person: to change what
 * somebody can do, you go to them.
 *
 * It hangs off the overflow glyph the header already draws on a teammate's pane,
 * so nothing new is added to the screen — the affordance was there, and this is
 * what it turned out to be for. Its shape is the branch menu's: the current value
 * as a heading, a rule, then what you can do about it.
 *
 * The contents follow the three tiers exactly. Only an Owner can move somebody
 * between Contributor and Maintainer, and no one can be moved out of Owner —
 * ownership transfers, on Settings, rather than being granted. A Maintainer may
 * remove a Contributor and nobody else. On your own pane there is nothing here at
 * all, and the menu says so rather than opening empty.
 *
 * Two things §5 asks for are missing, both for want of an endpoint rather than a
 * decision: notification preferences, and leaving a project under your own steam.
 * The API can remove a Contributor on a Maintainer's authority but has no way for
 * a member to remove themselves.
 */
export function MemberMenu({
  name,
  role,
  viewerRole,
  self,
  pending,
  onSetRole,
  onRemove,
}: MemberMenuProps) {
  const mayChangeRole = canGovern(viewerRole) && !self && role !== 'owner'
  const mayRemove = canRelease(viewerRole) && !self && role === 'contributor'

  return (
    <Popover width={158}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-[6px] pb-[8px]">
          <span className="truncate text-[13px] font-semibold text-cp-text-tertiary">
            {titleCase(role)}
          </span>
        </div>

        <div className="h-px bg-cp-hairline" />

        <div className="flex flex-col items-start gap-[9px] pt-[9px]">
          {mayChangeRole && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                onSetRole(role === 'maintainer' ? 'contributor' : 'maintainer')
              }}
              className={ITEM}
            >
              {role === 'maintainer' ? 'Make Contributor' : 'Make Maintainer'}
            </button>
          )}

          {mayRemove && (
            <button type="button" disabled={pending} onClick={onRemove} className={ITEM}>
              Remove from project
            </button>
          )}

          {!mayChangeRole && !mayRemove && (
            <span className="text-[11px]/[130%] font-normal text-cp-text-subtle">
              {self ? `${name} is you` : 'Nothing you can change'}
            </span>
          )}
        </div>
      </div>
    </Popover>
  )
}
